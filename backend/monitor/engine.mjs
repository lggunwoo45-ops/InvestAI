import { createHash, randomUUID } from 'node:crypto'

export const GAP_MS = 90_000
export const active = rule => rule.phase !== 'closed'
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0
const text = (s, max) => typeof s === 'string' && s.trim().length > 0 && s.length <= max
const fail = message => { throw new Error(message) }

export function normalizeRule(input) {
  const { requestId, instrument: i, source: s, side, entry, target, stop, horizonHours, costPercent, notify } = input ?? {}
  if (!text(requestId, 100) || !/^[\w-]+$/.test(requestId)) fail('등록 식별자가 올바르지 않습니다.')
  if (!i || !['upbit', 'binance-spot', 'binance-futures'].includes(i.venue) || !/^[A-Z0-9]{1,30}$/.test(i.asset) || !/^[A-Z0-9]{2,12}$/.test(i.quote)) fail('지원하지 않는 시장입니다.')
  if (i.venue === 'upbit' && !['KRW', 'BTC', 'USDT'].includes(i.quote)) fail('업비트 거래 통화를 확인하세요.')
  if (i.venue === 'binance-futures' && i.quote !== 'USDT') fail('USDT 선형 선물만 지원합니다.')
  if (!['long', 'short'].includes(side) || (i.venue !== 'binance-futures' && side !== 'long')) fail('현물은 매수 시나리오만 지원합니다.')
  if (!Array.isArray(entry) || entry.length !== 2 || !entry.every(positive) || !positive(target) || !positive(stop) || entry[0] > entry[1]) fail('가격 범위를 확인하세요.')
  if (side === 'long' ? !(stop < entry[0] && entry[1] < target) : !(target < entry[0] && entry[1] < stop)) fail('롱은 손절 < 진입 < 목표, 숏은 목표 < 진입 < 손절이어야 합니다.')
  if (!positive(horizonHours) || horizonHours > 720 || typeof costPercent !== 'number' || !Number.isFinite(costPercent) || costPercent < 0 || costPercent > 10 || typeof notify !== 'boolean') fail('기간은 0~720시간, 왕복 비용은 0~10%로 입력하세요.')
  if (!s || !['scenario', 'review'].includes(s.kind) || !text(s.id, 160) || !text(s.revision, 160) || !positive(s.at) || !positive(s.price) || typeof s.note !== 'string' || s.note.length > 1000 || !Array.isArray(s.signals) || s.signals.length > 10 || !s.signals.every(x => text(x, 100))) fail('저장된 검토 근거를 확인하세요.')
  const instrument = { venue: i.venue, asset: i.asset, quote: i.quote, symbol: i.venue === 'upbit' ? `${i.quote}-${i.asset}` : `${i.asset}${i.quote}` }
  const source = { kind: s.kind, id: s.id, revision: s.revision, at: s.at, price: s.price, note: s.note, signals: [...s.signals] }
  if (s.metrics !== undefined) {
    if (!s.metrics || !['funding', 'interest', 'volatility'].every(k => s.metrics[k] === null || typeof s.metrics[k] === 'number' && Number.isFinite(s.metrics[k]))) fail('검토 지표를 확인하세요.')
    source.metrics = { funding: s.metrics.funding, interest: s.metrics.interest, volatility: s.metrics.volatility }
  }
  if (s.positionId !== undefined) { if (!text(s.positionId, 160)) fail('보유 기록 연결을 확인하세요.'); source.positionId = s.positionId }
  return { requestId, instrument, source, side, entry: [...entry], target, stop, horizonHours, costPercent, notify }
}
export const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export function createRule(input, now) {
  const config = normalizeRule(input)
  return { id: randomUUID(), config, hash: fingerprint(config), createdAt: now, phase: 'waiting', last: null, entered: null, result: null, events: [], gaps: 0, issue: null }
}
function event(rule, kind, now, quote, detail = '') {
  rule.events.push({ id: randomUUID(), kind, at: now, sourceAt: quote?.at ?? null, price: quote?.price ?? null, detail, delivery: rule.config.notify ? { status: 'pending', attempts: 0, nextAt: now } : { status: 'off', attempts: 0, nextAt: 0 } })
}
function finish(rule, kind, now, quote, detail = '') {
  rule.phase = 'closed'
  const gross = rule.entered && quote ? (quote.price / rule.entered.price - 1) * (rule.config.side === 'long' ? 100 : -100) : null
  rule.result = { kind, at: now, price: quote?.price ?? null, sourceAt: quote?.at ?? null, grossPercent: gross, netPercent: gross === null ? null : gross - rule.config.costPercent }
  event(rule, kind, now, quote, detail)
}
/** Sampled observations only: no inferred fills, historical catch-up or intrapoll first-hit claims. */
export function observe(rule, quote, now, issue = null) {
  if (!active(rule)) return
  if (rule.last && now < rule.last.receivedAt - 5000) {
    if (rule.phase === 'tracking') { finish(rule, 'unresolved', now, null, 'PC 시계가 변경되어 관측 시간을 검증할 수 없습니다.'); return }
    rule.last = null; rule.gaps += 1
  }
  const gap = rule.last && now - rule.last.receivedAt > GAP_MS
  if (gap && rule.phase === 'tracking') { finish(rule, 'unresolved', now, null, '90초 이상 관측 공백으로 경계 도달 순서를 확인할 수 없습니다.'); return }
  const deadline = (rule.entered?.receivedAt ?? rule.createdAt) + rule.config.horizonHours * 3_600_000
  if (rule.phase === 'waiting' && now >= deadline) { finish(rule, 'expired', now, null, '대기 기간 동안 진입 구간을 관측하지 못했습니다.'); return }
  rule.issue = issue
  if (!quote || quote.receivedAt < rule.createdAt) return
  if (!positive(quote.price) || !positive(quote.at) || !positive(quote.receivedAt) || quote.receivedAt > now + 5000 || now - quote.receivedAt > GAP_MS) { rule.issue = '유효한 최신 시세가 아닙니다.'; return }
  // Provider time, rather than request receipt time, identifies a genuinely new observation.
  if (rule.last && quote.at <= rule.last.at) { rule.issue = '새로운 거래소 관측을 기다리고 있습니다.'; return }
  const baselineOnly = !rule.last || gap
  if (gap) rule.gaps += 1
  rule.last = quote
  rule.issue = null
  if (baselineOnly) return
  const c = rule.config
  if (rule.phase === 'waiting') {
    if (quote.price >= c.entry[0] && quote.price <= c.entry[1]) {
      rule.entered = quote; rule.phase = 'tracking'; event(rule, 'entry', now, quote, '진입 구간의 관측 가격입니다. 실제 주문 체결이 아닙니다.')
    }
    return
  }
  // At the horizon we report the sampled endpoint, not a later target or stop victory.
  if (now >= deadline) { finish(rule, 'timeout', now, quote); return }
  if (c.side === 'long' ? quote.price <= c.stop : quote.price >= c.stop) finish(rule, 'stop', now, quote)
  else if (c.side === 'long' ? quote.price >= c.target : quote.price <= c.target) finish(rule, 'target', now, quote)
}
export function cancelRule(rule, now) {
  if (active(rule)) finish(rule, 'cancelled', now, null, '사용자가 감시를 종료했습니다. 원래 조건과 기록은 보관합니다.')
}
