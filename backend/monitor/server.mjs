import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { active, createRule, cancelRule, fingerprint, normalizeRule, observe } from './engine.mjs'
import { openStore } from './store.mjs'
import { createQuoteReader } from './quotes.mjs'
import { telegramChannel } from './notifications.mjs'
import { createHistoryReader } from '../research/history.mjs'
import { createSignalWatch, normalizeSignalWatch, observeSignalWatch, signalFingerprint, stopSignalWatch, suspendSignalWatch } from './signalWatch.mjs'
import { createConnection, createPositionReader, normalizeConnection, observeConnection, validPositionSnapshot } from './positions.mjs'
import { createCredentialVault, normalizeCredentials } from './credentialVault.mjs'
import { createPrivatePositionReader, isPrivateVenue, PrivatePositionError } from './privatePositions.mjs'

const defaultDirectory = fileURLToPath(new URL('../../.local-data/monitor/', import.meta.url))
const loopback = value => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(value)
function allowed(req) {
  if (!loopback(req.socket.remoteAddress)) return false
  try {
    const host = new URL(`http://${req.headers.host}`)
    if (!['localhost', '127.0.0.1', '[::1]'].includes(host.hostname) || host.username || host.password) return false
    if (req.headers['sec-fetch-site'] === 'cross-site') return false
    return !req.headers.origin || req.headers.origin === host.origin
  } catch { return false }
}
async function body(req) {
  if (!String(req.headers['content-type']).startsWith('application/json') || req.headers['x-investai-monitor'] !== '1') throw new Error('요청 형식을 확인하세요.')
  let size = 0; const chunks = []
  for await (const chunk of req) { size += chunk.length; if (size > 16_384) throw new Error('요청 크기를 초과했습니다.'); chunks.push(chunk) }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}
const respond = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(data)) }

export function createMonitorHandler({ directory = defaultDirectory, quoteReader = createQuoteReader(), historyReader = createHistoryReader(), positionReader = createPositionReader(), privateReader = createPrivatePositionReader(), channel = telegramChannel(), clock = Date.now, intervalMs = 15_000, autoStart = true } = {}) {
  let store, state, fatal = null, stopped = false, timer, deliveryTimer, busy = false, deliveryBusy = false, lastCycleAt = null
  let signalTimer, signalBusy = false
  let positionTimer, positionBusy = false
  const vault = createCredentialVault(clock)
  let vaultBusy = false, privateBusy = false
  const lockedMessage = 'API 키 보관함이 잠겨 있습니다. 보관함을 열면 비공개 포지션 조회를 재개합니다.'
  let queue = Promise.resolve()
  const ready = openStore(directory).then(value => { store = value; state = value.data }).catch(e => { fatal = e.message })
  const serial = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result }
  const mutate = fn => serial(async () => {
    await ready
    if (fatal || stopped) throw new Error(fatal ?? '감시 프로그램이 종료되었습니다.')
    const next = structuredClone(state), result = await fn(next)
    try { await store.save(next) } catch { fatal = '기록 저장에 실패해 감시를 중지했습니다. 저장 공간과 파일 권한을 확인하세요.'; throw new Error(fatal) }
    state = next; return result
  })
  function bindingStatus(next, config) {
    if (!config.positionRef) return 'ready'
    const c = (next.connections ?? []).find(c => c.id === config.positionRef.connectionId)
    if (!c) return 'closed'
    if (!c.active || c.issue || isPrivateVenue(c.config.venue) && !vault.unlocked || !c.snapshot || clock() - c.snapshot.receivedAt > 90000) return 'unavailable'
    return c.snapshot.positions.some(p => p.key === config.positionRef.key && p.asset === config.asset && p.side === config.holdingSide) ? 'ready' : 'closed'
  }
  function checkBinding(next, rule) {
    const status = bindingStatus(next, rule.config)
    if (status === 'closed') { stopSignalWatch(rule, clock()); rule.issue = '연결 포지션이 사라지거나 방향이 바뀌어 반대 신호 감시를 종료했습니다.' }
    if (status === 'unavailable') { suspendSignalWatch(rule, clock()); rule.issue = '연결 포지션을 확인할 때까지 신호 판정을 보류합니다. 진행 중 관찰은 판정 불가로 남기고 재연결 후 기준을 다시 잡습니다.' }
    return status === 'ready'
  }
  async function deliver() {
    if (!channel.configured) return
    const ids = state.rules.flatMap(r => r.events.filter(e => e.delivery.status === 'pending' && e.delivery.nextAt <= clock()).map(e => [r.id, e.id])).slice(0, 3)
    for (const [ruleId, eventId] of ids) {
      if (stopped || fatal) break
      // Persist the attempt before sending. An interrupted send is uncertain and is not automatically resent.
      const payload = await mutate(next => {
        const r = next.rules.find(r => r.id === ruleId), e = r.events.find(e => e.id === eventId)
        e.delivery.status = 'uncertain'; e.delivery.attempts += 1
        return { rule: r, event: e }
      })
      try {
        await channel.send(payload.rule, payload.event)
        await mutate(next => { const e = next.rules.find(r => r.id === ruleId).events.find(e => e.id === eventId); e.delivery.status = 'sent' })
      } catch { /* Keep uncertain: connection failure does not prove non-delivery. */ }
    }
    for (const [ruleId, eventId] of (state.signals ?? []).flatMap(r => r.events.filter(e => e.delivery.status === 'pending').map(e => [r.id, e.id])).slice(0, 3)) {
      if (stopped || fatal) break
      const payload = await mutate(next => {
        const rule = next.signals.find(r => r.id === ruleId), event = rule.events.find(e => e.id === eventId)
        event.delivery.status = 'uncertain'; event.delivery.attempts++
        return { rule: { config: { instrument: { venue: 'binance-futures', symbol: `${rule.config.asset}USDT`, quote: 'USDT' }, side: rule.config.config.side } }, event: { ...event, kind: 'signal' } }
      })
      try { await channel.send(payload.rule, payload.event); await mutate(next => { next.signals.find(r => r.id === ruleId).events.find(e => e.id === eventId).delivery.status = 'sent' }) } catch { /* Uncertain delivery is retained; no automatic duplicate. */ }
    }
    for (const [connectionId, eventId] of (state.connections ?? []).flatMap(c => c.events.filter(e => e.delivery.status === 'pending').map(e => [c.id, e.id])).slice(0, 3)) {
      if (stopped || fatal) break
      const payload = await mutate(next => {
        const c = next.connections?.find(c => c.id === connectionId), event = c?.events.find(e => e.id === eventId)
        if (!event || event.delivery.status !== 'pending') return null
        event.delivery.status = 'uncertain'; event.delivery.attempts++
        return { rule: { config: { instrument: { venue: c.config.venue, symbol: event.position?.asset ?? '포지션 연결', quote: event.position?.quote ?? (isPrivateVenue(c.config.venue) ? 'USDT' : 'USDC') }, side: event.position?.side ?? '' } }, event: { id: event.id, at: event.at, kind: `position-${event.kind}`, detail: event.detail, price: event.position?.currentPrice ?? null } }
      })
      if (!payload) continue
      try { await channel.send(payload.rule, payload.event); await mutate(next => { const e = next.connections?.find(c => c.id === connectionId)?.events.find(e => e.id === eventId); if (e) e.delivery.status = 'sent' }) } catch { /* Keep uncertain and never automatically resend. */ }
    }
  }
  async function tick() {
    if (busy || stopped) return
    busy = true
    try {
      await ready; if (fatal || stopped) return
      const instruments = [...new Map(state.rules.filter(active).map(r => [JSON.stringify(r.config.instrument), r.config.instrument])).entries()]
      // Serial provider reads, with spacing, avoid bursts and coalesce identical instruments.
      for (const [key, instrument] of instruments) {
        if (stopped || fatal) break
        let quote = null, issue = null
        try { quote = await quoteReader(instrument) } catch (e) { issue = e.message }
        if (stopped) break
        await mutate(next => { for (const r of next.rules.filter(r => active(r) && JSON.stringify(r.config.instrument) === key)) observe(r, quote, clock(), issue) })
        if (instruments.length > 1) await new Promise(resolve => setTimeout(resolve, 150))
      }
      if (!stopped && !fatal) lastCycleAt = clock()
    } catch (e) { fatal ??= e.message } finally { busy = false }
  }
  async function tickSignals() {
    if (signalBusy || stopped) return
    signalBusy = true
    try {
      await ready; if (fatal || stopped) return
      const signalGroups = new Map((state.signals ?? []).filter(r => r.active).map(r => [`${r.config.asset}:${r.config.config.timeframe}:${r.config.config.bars}`, r.config]))
      for (const [key, config] of signalGroups) {
        if (stopped || fatal) break
        let history, issue
        try { history = await historyReader(config.asset, config.config.timeframe, config.config.bars) } catch { issue = '신호 자료를 가져오지 못해 판정을 보류합니다.' }
        if (stopped) break
        await mutate(next => {
          for (const rule of (next.signals ?? []).filter(r => r.active && `${r.config.asset}:${r.config.config.timeframe}:${r.config.config.bars}` === key)) {
            if (!checkBinding(next, rule)) continue
            if (issue) rule.issue = issue
            else observeSignalWatch(rule, history, clock())
          }
        })
      }
    } catch (e) { fatal ??= e.message } finally { signalBusy = false }
  }
  async function tickPositions() {
    if (positionBusy || stopped) return
    positionBusy = true
    try {
      await ready; if (fatal || stopped) return
      for (const c of (state.connections ?? []).filter(c => c.active)) {
        if (stopped || fatal) break
        let snapshot, issue
        const privateAccount = isPrivateVenue(c.config.venue), generation = vault.generation
        try {
          if (privateAccount) {
            if (!vault.unlocked) issue = lockedMessage
            else snapshot = await privateReader(c.config.venue, vault.read(state.vault, c.config.account, c.config.venue), vault.signal)
          } else snapshot = await positionReader(c.config)
        } catch (e) { issue = e instanceof PrivatePositionError ? e.message : '거래소 자료를 확인하지 못했습니다. 이전 값은 보존하고 위험 판정을 보류합니다.' }
        if (stopped) break
        await mutate(next => {
          const current = next.connections?.find(v => v.id === c.id)
          if (!current || !current.active) return
          if (privateAccount && (generation !== vault.generation || !vault.unlocked)) { snapshot = undefined; issue = lockedMessage }
          observeConnection(current, snapshot, clock(), issue)
          for (const rule of (next.signals ?? []).filter(r => r.active && r.config.positionRef?.connectionId === c.id)) checkBinding(next, rule)
        })
      }
    } catch (e) { fatal ??= e.message } finally { positionBusy = false }
  }
  async function dispatch() {
    if (deliveryBusy || stopped) return
    deliveryBusy = true
    try { await ready; if (!fatal && !stopped) await deliver() } catch (e) { fatal ??= e.message } finally { deliveryBusy = false }
  }
  const status = () => ({ version: 1, running: !fatal && !stopped, error: fatal, now: clock(), lastCycleAt, intervalMs, channelConfigured: channel.configured, vault: { configured: !!state?.vault, unlocked: vault.unlocked }, rules: state?.rules ?? [], signals: state?.signals ?? [], connections: (state?.connections ?? []).map(c => isPrivateVenue(c.config.venue) && !vault.unlocked ? { ...c, issue: lockedMessage } : c) })
  function privateLimits(next, config) {
    if (!vault.unlocked || !next.vault) throw new Error(lockedMessage)
    if (config.notify && !channel.configured) throw new Error('외부 알림 채널이 설정되지 않았습니다.')
    if ((next.connections?.length ?? 0) >= 8 || (next.connections ?? []).filter(c => c.active).length >= 4) throw new Error('계정 연결은 동시 4개, 보관 8개까지 지원합니다.')
  }
  function suspendPrivate(next) {
    for (const c of next.connections ?? []) if (isPrivateVenue(c.config.venue)) c.issue = lockedMessage
    for (const rule of (next.signals ?? []).filter(r => r.active && r.config.positionRef)) checkBinding(next, rule)
  }
  const handler = async (req, res, next) => {
    const path = (req.url ?? '').split('?')[0]
    if (!path.startsWith('/api/monitor')) { next?.(); return }
    if (!allowed(req)) { respond(res, 403, { error: '이 PC의 동일 주소에서만 감시 기록에 접근할 수 있습니다.' }); return }
    await ready
    if (req.method === 'GET' && path === '/api/monitor') { respond(res, 200, status()); return }
    if (req.method !== 'POST') { respond(res, 405, { error: '지원하지 않는 요청입니다.' }); return }
    if (fatal) { respond(res, 503, { error: fatal }); return }
    try {
      const input = await body(req)
      if (path === '/api/monitor/vault/setup' || path === '/api/monitor/vault/unlock') {
        if (vaultBusy) throw new Error('보관함을 처리 중입니다. 잠시 후 다시 시도해주세요.')
        vaultBusy = true
        try {
          if (path.endsWith('/setup')) {
            if (state.vault) throw new Error('이미 보관함이 있습니다. 비밀번호로 열어주세요.')
            await vault.setup(input.password, data => mutate(next => { if (next.vault) throw new Error('이미 보관함이 있습니다.'); next.vault = data }))
          } else {
            if (!state.vault) throw new Error('먼저 보관함을 만들어주세요.')
            await vault.unlock(input.password, state.vault)
          }
        } finally { vaultBusy = false }
        if (autoStart) void tickPositions()
      } else if (path === '/api/monitor/vault/lock') {
        vault.lock(); await mutate(suspendPrivate)
      } else if (path === '/api/monitor/vault/remove') {
        if (input.confirm !== true) throw new Error('보관함과 API 연결 삭제를 확인해주세요.')
        vault.lock()
        await mutate(next => {
          delete next.vault
          next.connections = (next.connections ?? []).filter(c => !isPrivateVenue(c.config.venue))
          for (const rule of (next.signals ?? []).filter(r => r.active && r.config.positionRef)) checkBinding(next, rule)
        })
      } else if (path === '/api/monitor/connections/private') {
        if (privateBusy) throw new Error('API 연결을 확인 중입니다. 잠시 후 다시 시도해주세요.')
        if (!isPrivateVenue(input.venue) || input.consent !== true) throw new Error('암호화 보관과 거래소 조회에 동의한 후 연결해주세요.')
        const credentials = normalizeCredentials(input.credentials)
        const config = normalizeConnection({ ...input, account: `key-${randomUUID()}` })
        const prior = (state.connections ?? []).find(c => c.config.requestId === config.requestId)
        if (prior) {
          if (!vault.unlocked || !isPrivateVenue(prior.config.venue) || JSON.stringify({ ...config, account: prior.config.account }) !== JSON.stringify(prior.config) || JSON.stringify(vault.read(state.vault, prior.config.account, prior.config.venue)) !== JSON.stringify(credentials)) throw new Error('이미 사용한 연결 식별자입니다.')
          respond(res, 200, status()); return
        }
        privateLimits(state, config)
        privateBusy = true
        const generation = vault.generation
        try {
          let snapshot
          try { snapshot = await privateReader(config.venue, credentials, vault.signal) } catch (e) { throw new Error(e instanceof PrivatePositionError ? e.message : '읽기 전용 권한과 포지션을 확인하지 못해 키를 저장하지 않았습니다.') }
          await mutate(next => {
            privateLimits(next, config)
            if (generation !== vault.generation) throw new Error('보관함 상태가 바뀌었습니다. 다시 연결해주세요.')
            if (!validPositionSnapshot(snapshot) || clock() - snapshot.receivedAt > 90000 || snapshot.receivedAt > clock() + 5000) throw new Error('최신 포지션을 확인하지 못해 키를 저장하지 않았습니다.')
            if ((next.connections ?? []).some(c => c.config.requestId === config.requestId)) throw new Error('이미 사용한 연결 식별자입니다.')
            vault.add(next.vault, config.account, config.venue, credentials)
            const connection = createConnection(config, clock()); observeConnection(connection, snapshot, clock())
            next.connections ??= []; next.connections.push(connection)
          })
        } finally { privateBusy = false }
      } else if (path === '/api/monitor/rules') {
        const normalized = normalizeRule(input)
        await mutate(next => {
          const previous = next.rules.find(r => r.config.requestId === normalized.requestId)
          if (previous) { if (previous.hash !== fingerprint(normalized)) throw new Error('이미 사용한 등록 식별자입니다.'); return }
          if (normalized.notify && !channel.configured) throw new Error('외부 알림 채널이 설정되지 않았습니다.')
          if (next.rules.length >= 200 || next.rules.filter(active).length >= 10) throw new Error('동시 감시는 10개, 보관 기록은 200개까지 지원합니다.')
          next.rules.push(createRule(normalized, clock()))
        })
      } else if (path === '/api/monitor/signals') {
        const config = normalizeSignalWatch(input)
        await mutate(next => {
          next.signals ??= []
          const previous = next.signals.find(r => r.config.requestId === config.requestId)
          if (previous) { if (previous.hash !== signalFingerprint(config)) throw new Error('이미 사용한 등록 식별자입니다.'); return }
          if (config.notify && !channel.configured) throw new Error('외부 알림 채널이 설정되지 않았습니다.')
          if (config.positionRef && bindingStatus(next, config) !== 'ready') throw new Error('연결한 포지션의 최신 상태를 확인한 뒤 등록해주세요.')
          if (config.positionRef && next.signals.some(r => r.active && r.config.positionRef?.connectionId === config.positionRef.connectionId && r.config.positionRef?.key === config.positionRef.key)) throw new Error('이 포지션의 반대 신호 감시가 이미 실행 중입니다.')
          if (next.signals.length >= 40 || next.signals.filter(r => r.active).length >= 6) throw new Error('신호 감시는 동시 6개, 보관 40개까지 지원합니다.')
          next.signals.push(createSignalWatch(config, clock()))
        })
      } else if (path === '/api/monitor/signals/stop') {
        await mutate(next => { const rule = (next.signals ?? []).find(r => r.id === input.id); if (!rule) throw new Error('신호 감시를 찾을 수 없습니다.'); stopSignalWatch(rule, clock()) })
      } else if (path === '/api/monitor/connections') {
        const config = normalizeConnection(input)
        if (isPrivateVenue(config.venue)) throw new Error('API 계정은 키 연결 화면을 이용해주세요.')
        await mutate(next => {
          next.connections ??= []
          const prior = next.connections.find(c => c.config.requestId === config.requestId)
          if (prior) { if (JSON.stringify(prior.config) !== JSON.stringify(config)) throw new Error('이미 사용한 연결 식별자입니다.'); return }
          if (config.notify && !channel.configured) throw new Error('외부 알림 채널이 설정되지 않았습니다.')
          if (next.connections.length >= 8 || next.connections.filter(c => c.active).length >= 4) throw new Error('공개 연결은 동시 4개, 보관 8개까지 지원합니다.')
          if (next.connections.some(c => c.config.venue === config.venue && c.config.account === config.account)) throw new Error('이미 등록한 공개 계정입니다.')
          next.connections.push(createConnection(config, clock()))
        })
        if (autoStart) void tickPositions()
      } else if (path === '/api/monitor/connections/remove') {
        await mutate(next => {
          const removed = next.connections?.find(c => c.id === input.id)
          if (!removed) throw new Error('연결을 찾을 수 없습니다.')
          if (isPrivateVenue(removed.config.venue) && next.vault) next.vault.items = next.vault.items.filter(i => i.id !== removed.config.account)
          next.connections = next.connections.filter(c => c.id !== input.id)
          for (const rule of (next.signals ?? []).filter(r => r.active && r.config.positionRef?.connectionId === input.id)) { stopSignalWatch(rule, clock()); rule.issue = '계정 연결을 삭제해 반대 신호 감시를 종료했습니다.' }
        })
      } else if (path === '/api/monitor/connections/pause') {
        await mutate(next => {
          const c = next.connections?.find(c => c.id === input.id)
          if (!c || typeof input.paused !== 'boolean') throw new Error('연결을 찾을 수 없습니다.')
          if (!input.paused && isPrivateVenue(c.config.venue) && !vault.unlocked) throw new Error(lockedMessage)
          if (!input.paused && (c.events.length >= 200 || next.connections.filter(v => v.active && v.id !== c.id).length >= 4)) throw new Error('연결 보관 또는 동시 감시 한도에 도달했습니다.')
          c.active = !input.paused; c.issue = input.paused ? '사용자가 갱신을 일시 정지했습니다.' : '다음 조회를 기다립니다.'
          for (const rule of (next.signals ?? []).filter(r => r.active && r.config.positionRef?.connectionId === c.id)) checkBinding(next, rule)
        })
        if (autoStart && !input.paused) void tickPositions()
      } else if (path === '/api/monitor/cancel') {
        await mutate(next => { const rule = next.rules.find(r => r.id === input.id); if (!rule) throw new Error('감시 기록을 찾을 수 없습니다.'); cancelRule(rule, clock()) })
      } else { respond(res, 404, { error: '없는 경로입니다.' }); return }
      respond(res, 200, status())
    } catch (e) { respond(res, fatal ? 503 : 400, { error: e instanceof SyntaxError ? '요청을 읽을 수 없습니다.' : e.message }) }
  }
  handler.tick = tick
  handler.tickSignals = tickSignals
  handler.tickPositions = tickPositions
  handler.dispatch = dispatch
  handler.ready = ready
  handler.close = async () => {
    stopped = true; vault.lock(); clearInterval(timer); clearInterval(deliveryTimer); clearInterval(signalTimer); clearInterval(positionTimer); await ready
    while (busy || deliveryBusy || signalBusy || positionBusy || vaultBusy || privateBusy) await new Promise(resolve => setTimeout(resolve, 25))
    await queue; await store?.close()
  }
  if (autoStart) {
    positionTimer = setInterval(tickPositions, 30000); positionTimer.unref(); void tickPositions()
    signalTimer = setInterval(tickSignals, 30000); signalTimer.unref(); void tickSignals()
    timer = setInterval(tick, intervalMs); timer.unref(); void tick()
    deliveryTimer = setInterval(dispatch, 5000); deliveryTimer.unref(); void dispatch()
  }
  return handler
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const handler = createMonitorHandler()
  const server = createServer((req, res) => { void handler(req, res, () => respond(res, 404, { error: '없는 경로입니다.' })) })
  server.listen(Number(process.env.MONITOR_PORT ?? 8792), '127.0.0.1', () => console.log('InvestAI local monitor ready on loopback.'))
  const stop = () => { server.close(); void handler.close().then(() => process.exit(0)) }
  process.on('SIGINT', stop); process.on('SIGTERM', stop)
}
