import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { randomUUID } from 'node:crypto'
import { boundedCalendarText } from './calendarIO.mjs'

export const HOUR = 3_600_000, DAY = 24 * HOUR, COLLECTION_INTERVAL = 15 * 60_000
const metrics = ['funding', 'openInterest']
const number = v => (typeof v === 'number' || typeof v === 'string' && v.trim() !== '') && Number.isFinite(Number(v)) ? Number(v) : NaN

/** Fixed public market endpoints. Funding is settled, OI is base-asset quantity, never USD. */
export async function readDerivativeHistory(asset, metric, end, { fetchImpl = fetch, signal } = {}) {
  const start = Math.ceil((end - 7 * DAY) / HOUR) * HOUR
  const query = new URLSearchParams({ category: 'linear', symbol: `${asset}USDT`, startTime: String(start), endTime: String(end), limit: '200', ...(metric === 'openInterest' ? { intervalTime: '1h' } : {}) })
  const path = metric === 'funding' ? 'funding/history' : 'open-interest'
  const response = await fetchImpl(`https://api.bybit.com/v5/market/${path}?${query}`, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000), headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error('provider_unavailable')
  const body = JSON.parse(await boundedCalendarText(response, 150_000)), result = body?.result
  const providerAt = number(body?.time)
  if (body?.retCode !== 0 || result?.category !== 'linear' || !Array.isArray(result.list) || result.list.length > 200 || !Number.isSafeInteger(providerAt) || Math.abs(providerAt - end) > 10 * 60_000 || metric === 'openInterest' && result.symbol !== `${asset}USDT`) throw new Error('invalid_provider_response')
  const seen = new Map()
  for (const row of result.list) {
    const at = number(row?.[metric === 'funding' ? 'fundingRateTimestamp' : 'timestamp'])
    const value = number(row?.[metric === 'funding' ? 'fundingRate' : 'openInterest'])
    if (!Number.isSafeInteger(at) || !Number.isFinite(value) || at < start || at > Math.min(end, providerAt) || (metric === 'funding' ? row.symbol !== `${asset}USDT` || Math.abs(value) > 1 : at % HOUR !== 0 || value < 0)) throw new Error('invalid_provider_row')
    if (seen.has(at) && seen.get(at) !== value) throw new Error('conflicting_provider_rows')
    seen.set(at, value)
  }
  // 200 records cannot be exhausted by a 7-day hourly series; never silently truncate.
  if (result.list.length === 200 || result.nextPageCursor) throw new Error('incomplete_provider_page')
  return [...seen].map(([at, value]) => ({ at, value })).sort((a, b) => a.at - b.at)
}

export function openDerivativeStore(directory, clock = Date.now) {
  mkdirSync(directory, { recursive: true })
  const db = new DatabaseSync(join(directory, 'derivatives.sqlite'))
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS observations (asset TEXT, metric TEXT, at INTEGER, knownAt INTEGER, value REAL NOT NULL, PRIMARY KEY(asset,metric,at,knownAt));
    CREATE TABLE IF NOT EXISTS collection (asset TEXT, metric TEXT, attemptedAt INTEGER, succeededAt INTEGER, failed INTEGER, PRIMARY KEY(asset,metric));
    CREATE TABLE IF NOT EXISTS collector_lease (id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT, expires INTEGER);
    INSERT OR IGNORE INTO collector_lease VALUES (1,'',0);`)
  const latest = db.prepare('SELECT value,knownAt FROM observations WHERE asset=? AND metric=? AND at=? ORDER BY knownAt DESC LIMIT 1')
  const insert = db.prepare('INSERT INTO observations VALUES (?,?,?,?,?)')
  return {
    db,
    save(asset, metric, rows, knownAt = clock()) {
      db.exec('BEGIN IMMEDIATE')
      try {
        for (const row of rows) {
          if (!metrics.includes(metric) || !Number.isSafeInteger(row.at) || row.at > knownAt || !Number.isFinite(row.value) || (metric === 'openInterest' && (row.value < 0 || row.at % HOUR !== 0))) throw new Error('invalid_observation')
          const prior = latest.get(asset, metric, row.at)
          // A retry is a no-op. Corrections keep their actual first-known time.
          if (!prior || prior.value !== row.value && knownAt > prior.knownAt) insert.run(asset, metric, row.at, knownAt, row.value)
        }
        db.exec('COMMIT')
      } catch (e) { db.exec('ROLLBACK'); throw e }
    },
    rows(asset, metric, from, to, knownAt = clock()) {
      return db.prepare(`SELECT o.at,o.value,o.knownAt FROM observations o WHERE o.asset=? AND o.metric=? AND o.at>=? AND o.at<=? AND o.knownAt<=?
        AND NOT EXISTS (SELECT 1 FROM observations newer WHERE newer.asset=o.asset AND newer.metric=o.metric AND newer.at=o.at AND newer.knownAt>o.knownAt AND newer.knownAt<=?) ORDER BY o.at`).all(asset, metric, from, to, knownAt, knownAt)
    },
    close() { db.close() },
  }
}

/** One background collector per existing persistent volume, independent of page visits. */
export function createDerivativeCollector({ directory, assets, clock = Date.now, reader = readDerivativeHistory, autoStart = true } = {}) {
  if (!directory || !isAbsolute(directory)) return { snapshot() { throw new Error('history_storage_unavailable') }, close() {} }
  let store
  try { store = openDerivativeStore(directory, clock) } catch { return { snapshot() { throw new Error('history_storage_unavailable') }, close() {} } }
  const { db } = store, owner = randomUUID(), controller = new AbortController()
  let closed = false, running = null, timer
  const status = db.prepare('SELECT * FROM collection WHERE asset=? AND metric=?')
  const lease = () => !!db.prepare('UPDATE collector_lease SET owner=?,expires=? WHERE id=1 AND (owner=? OR expires<=?)').run(owner, clock() + 60_000, owner, clock()).changes
  const tick = () => {
    if (closed) return Promise.resolve()
    if (running) return running
    running = (async () => {
      if (!lease()) return
      for (const asset of assets) for (const metric of metrics) {
        if (closed || !lease()) return
        const prior = status.get(asset, metric)
        if (prior && clock() - prior.attemptedAt < COLLECTION_INTERVAL) continue
        const attemptedAt = clock()
        db.prepare('INSERT INTO collection VALUES (?,?,?,NULL,1) ON CONFLICT(asset,metric) DO UPDATE SET attemptedAt=excluded.attemptedAt,failed=1').run(asset, metric, attemptedAt)
        try {
          const rows = await reader(asset, metric, attemptedAt, { signal: controller.signal })
          if (closed || !lease()) return
          store.save(asset, metric, rows)
          db.prepare('UPDATE collection SET succeededAt=?,failed=0 WHERE asset=? AND metric=?').run(clock(), asset, metric)
        } catch { /* Keep old observations and expose failed collection; never replace with zero. */ }
      }
      db.prepare('DELETE FROM observations WHERE at<?').run(clock() - 365 * DAY)
    })().catch(() => {}).finally(() => { running = null })
    return running
  }
  if (autoStart) { void tick(); timer = setInterval(() => { void tick() }, 60_000); timer.unref?.() }
  return {
    tick,
    snapshot(asset, days) {
      if (!assets.includes(asset) || ![7, 30, 90].includes(days)) throw new Error('invalid_history_query')
      const fetchedAt = clock(), from = Math.ceil((fetchedAt - days * DAY) / HOUR) * HOUR, to = Math.floor(fetchedAt / HOUR) * HOUR
      return { version: 1, asset, days, fetchedAt, from, to, source: 'Bybit USDT perpetual', retentionDays: 365, intervalMinutes: 15, backfillDays: 7,
        series: metrics.map(metric => {
          const state = status.get(asset, metric), points = store.rows(asset, metric, from, to)
          const gaps = []
          if (metric === 'openInterest') {
            const times = new Set(points.map(p => p.at)); let start = null
            // Exclude the just-started hour to allow normal provider publication latency.
            for (let at = from; at < to; at += HOUR) { if (!times.has(at)) { start ??= at } else if (start !== null) { gaps.push({ from: start, to: at - HOUR }); start = null } }
            if (start !== null) gaps.push({ from: start, to: to - HOUR })
          }
          const last = points.at(-1)?.at ?? null
          const stale = !state?.succeededAt || fetchedAt - state.succeededAt > 30 * 60_000 || state.failed === 1 || last === null || fetchedAt - last > (metric === 'funding' ? 12 : 2) * HOUR
          return { metric, unit: metric === 'funding' ? 'rate' : asset, status: !state ? 'collecting' : !points.length ? 'unavailable' : stale ? 'stale' : 'available', attemptedAt: state?.attemptedAt ?? null, succeededAt: state?.succeededAt ?? null, firstAt: points[0]?.at ?? null, lastAt: last, gaps: metric === 'openInterest' ? gaps : null, points }
        }) }
    },
    async close() { if (closed) return; closed = true; clearInterval(timer); controller.abort(); await running; db.prepare('UPDATE collector_lease SET expires=0 WHERE owner=?').run(owner); store.close() },
  }
}
