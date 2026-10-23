import { createServer } from 'node:http'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { active, createRule, cancelRule, fingerprint, normalizeRule, observe } from './engine.mjs'
import { openStore } from './store.mjs'
import { createQuoteReader } from './quotes.mjs'
import { telegramChannel } from './notifications.mjs'

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

export function createMonitorHandler({ directory = defaultDirectory, quoteReader = createQuoteReader(), channel = telegramChannel(), clock = Date.now, intervalMs = 15_000, autoStart = true } = {}) {
  let store, state, fatal = null, stopped = false, timer, deliveryTimer, busy = false, deliveryBusy = false, lastCycleAt = null
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
  async function dispatch() {
    if (deliveryBusy || stopped) return
    deliveryBusy = true
    try { await ready; if (!fatal && !stopped) await deliver() } catch (e) { fatal ??= e.message } finally { deliveryBusy = false }
  }
  const status = () => ({ version: 1, running: !fatal && !stopped, error: fatal, now: clock(), lastCycleAt, intervalMs, channelConfigured: channel.configured, rules: state?.rules ?? [] })
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
      if (path === '/api/monitor/rules') {
        const normalized = normalizeRule(input)
        await mutate(next => {
          const previous = next.rules.find(r => r.config.requestId === normalized.requestId)
          if (previous) { if (previous.hash !== fingerprint(normalized)) throw new Error('이미 사용한 등록 식별자입니다.'); return }
          if (normalized.notify && !channel.configured) throw new Error('외부 알림 채널이 설정되지 않았습니다.')
          if (next.rules.length >= 200 || next.rules.filter(active).length >= 10) throw new Error('동시 감시는 10개, 보관 기록은 200개까지 지원합니다.')
          next.rules.push(createRule(normalized, clock()))
        })
      } else if (path === '/api/monitor/cancel') {
        await mutate(next => { const rule = next.rules.find(r => r.id === input.id); if (!rule) throw new Error('감시 기록을 찾을 수 없습니다.'); cancelRule(rule, clock()) })
      } else { respond(res, 404, { error: '없는 경로입니다.' }); return }
      respond(res, 200, status())
    } catch (e) { respond(res, fatal ? 503 : 400, { error: e instanceof SyntaxError ? '요청을 읽을 수 없습니다.' : e.message }) }
  }
  handler.tick = tick
  handler.dispatch = dispatch
  handler.ready = ready
  handler.close = async () => {
    stopped = true; clearInterval(timer); clearInterval(deliveryTimer); await ready
    while (busy || deliveryBusy) await new Promise(resolve => setTimeout(resolve, 25))
    await queue; await store?.close()
  }
  if (autoStart) {
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
