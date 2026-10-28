import { createHash } from 'node:crypto'
import { createLiquidationArchive } from './liquidationArchive.mjs'

const endpoint = 'wss://stream.bybit.com/v5/public/linear'
const retention = 15 * 60_000

/** One public connection per process. No private account or order endpoints. */
export function createLiquidationCollector({ assets, directory, WebSocketImpl = globalThis.WebSocket, now = Date.now, timers = globalThis, maxEvents = 20_000 } = {}) {
  const symbols = new Set(assets.map(asset => `${asset}USDT`))
  let socket, retry, heartbeat, deadline, closed = false, started = false, attempt = 0
  let status = 'connecting', startedAt = null, continuousSince = null, lastMessageAt = null, droppedThrough = null, reconnects = 0
  let events = [], serial = 0
  const seen = new Map()
  let archive, coverageAt = null
  const storage = () => archive ??= createLiquidationArchive({ directory, assets, now })
  const confirmCoverage = () => { if (coverageAt !== null) storage().cover(coverageAt, now()); coverageAt = now() }
  const later = (fn, ms) => { const timer = timers.setTimeout(fn, ms); timer?.unref?.(); return timer }
  function prune() {
    const cutoff = now() - retention
    events = events.filter(event => event.at > cutoff)
    if (events.length > maxEvents) {
      const removed = events.splice(0, events.length - maxEvents)
      droppedThrough = Math.max(droppedThrough ?? 0, ...removed.map(event => event.at))
    }
    for (const [key, at] of seen) if (at <= cutoff) seen.delete(key)
    while (seen.size > 512) seen.delete(seen.keys().next().value)
  }
  function connect() {
    if (closed) return
    status = 'connecting'; continuousSince = null
    let current
    const fail = () => {
      if (socket !== current || closed) return
      socket = null; status = 'disconnected'; continuousSince = null; coverageAt = null
      timers.clearTimeout(deadline); timers.clearInterval(heartbeat)
      try { current?.close() } catch { /* Already closed. */ }
      retry = later(() => { reconnects++; connect() }, Math.min(30_000, 1000 * 2 ** Math.min(attempt++, 5)))
    }
    try { if (!storage().acquire()) throw new Error('archive_collector_busy'); current = new WebSocketImpl(endpoint); socket = current } catch { socket = current; fail(); return }
    deadline = later(fail, 15_000)
    current.addEventListener('open', () => {
      if (closed || socket !== current) return
      try { current.send(JSON.stringify({ op: 'subscribe', args: [...symbols].map(symbol => `allLiquidation.${symbol}`) })) } catch { fail() }
    })
    current.addEventListener('message', message => {
      if (closed || socket !== current) return
      if (typeof message.data !== 'string' || message.data.length > 1_000_000) return fail()
      let payload
      try { payload = JSON.parse(message.data) } catch { return fail() }
      if (payload?.op === 'subscribe') {
        if (payload.success !== true) return fail()
        timers.clearTimeout(deadline); attempt = 0; status = 'live'
        continuousSince = now(); startedAt ??= now(); lastMessageAt = now(); coverageAt = now()
        timers.clearInterval(heartbeat)
        heartbeat = timers.setInterval(() => {
          if (now() - lastMessageAt > 60_000) return fail()
          try { current.send(JSON.stringify({ op: 'ping' })) } catch { fail() }
        }, 20_000)
        heartbeat?.unref?.()
        return
      }
      if (payload?.op === 'ping' || payload?.op === 'pong' || payload?.ret_msg === 'pong') { try { confirmCoverage() } catch { return fail() }; lastMessageAt = now(); return }
      if (status !== 'live' || typeof payload?.topic !== 'string' || !payload.topic.startsWith('allLiquidation.') || !symbols.has(payload.topic.slice(15)) || !Array.isArray(payload.data) || payload.data.length > 10_000) return
      lastMessageAt = now()
      try { confirmCoverage() } catch { return fail() }
      const digest = createHash('sha256').update(message.data).digest('hex')
      if (seen.has(digest)) return
      seen.set(digest, now())
      const received = []
      for (const row of payload.data) {
        const at = Number(row?.T), size = Number(row?.v), price = Number(row?.p)
        if (row?.s !== payload.topic.slice(15) || !['Buy', 'Sell'].includes(row?.S) || !Number.isSafeInteger(at) || at <= now() - retention || at > now() + 5000 || !Number.isFinite(size) || size <= 0 || !Number.isFinite(price) || price <= 0 || !Number.isFinite(size * price)) continue
        // Bybit's S is POSITION side, and p is bankruptcy price, not fill price.
        received.push({ id: `${at}-${++serial}`, asset: row.s.slice(0, -4), at, side: row.S === 'Buy' ? 'long' : 'short', size, bankruptcyPrice: price, notional: size * price })
      }
      try { storage().append(digest, received) } catch { return fail() }
      events.push(...received)
      events.sort((a, b) => a.at - b.at)
      prune()
    })
    current.addEventListener('error', fail)
    current.addEventListener('close', fail)
  }
  return {
    start() { if (!started && !closed) { started = true; connect() } },
    history(asset, hours) { if (closed) throw new Error('collector_closed'); if (!started) { started = true; connect() }; return storage().snapshot(asset, hours) },
    snapshot(asset) {
      if (!assets.includes(asset)) throw new Error('invalid_asset')
      if (!started && !closed) { started = true; connect() }
      prune()
      const at = now(), live = status === 'live' && lastMessageAt !== null && at - lastMessageAt <= 60_000
      const selected = events.filter(event => event.asset === asset && event.at <= at)
      return { version: 1, asset, source: 'Bybit USDT linear', fetchedAt: at, status: closed ? 'disconnected' : status === 'live' && !live ? 'disconnected' : status,
        startedAt, continuousSince: live ? continuousSince : null, lastMessageAt, reconnects,
        windows: [1, 5, 15].map(minutes => {
          const from = at - minutes * 60_000, rows = selected.filter(event => event.at > from)
          return { minutes, count: rows.length, long: rows.filter(e => e.side === 'long').reduce((sum, e) => sum + e.notional, 0), short: rows.filter(e => e.side === 'short').reduce((sum, e) => sum + e.notional, 0), complete: live && continuousSince !== null && continuousSince <= from && (droppedThrough === null || droppedThrough <= from) }
        }),
        events: selected.slice(-50).reverse(), retentionMinutes: 15,
      }
    },
    close() { closed = true; timers.clearTimeout(retry); timers.clearTimeout(deadline); timers.clearInterval(heartbeat); try { socket?.close() } catch { /* Already closed. */ } socket = null; events = []; seen.clear(); archive?.close(); archive = null },
  }
}
