import { createHash, randomUUID } from 'node:crypto'
import { ENGINE_VERSION, explorerSignals, matchesFrame, signalFrames, timeframes, validExplorerConfig, hasDerivativeFilters } from '../research/signals.mjs'
import { researchAssets } from '../research/server.mjs'
import { derivativeMatch, DERIVATIVE_FILTER_VERSION } from '../research/derivativeContext.mjs'

export function normalizeSignalWatch(input) {
  if (!input || typeof input.requestId !== 'string' || !/^[a-zA-Z0-9-]{8,80}$/.test(input.requestId) || !researchAssets.includes(input.asset) || typeof input.name !== 'string' || input.name.trim().length < 1 || input.name.length > 60 || typeof input.notify !== 'boolean' || !validExplorerConfig(input.config)) throw new Error('신호 감시의 이름과 조건을 확인해주세요.')
  const purpose = input.purpose ?? 'opportunity', holdingSide = input.holdingSide ?? null
  if (!['opportunity', 'opposition', 'validation'].includes(purpose) || purpose === 'opposition' && (!['long', 'short'].includes(holdingSide) || input.config.signals.some(id => explorerSignals.find(s => s.id === id).side === holdingSide))) throw new Error('반대 신호 감시는 보유 방향과 반대 관점의 신호만 선택해주세요.')
  if (purpose === 'validation' && (![7, 30, 90].includes(input.trialDays) || input.notify)) throw new Error('미래 검증은 7·30·90일 중 선택하며 외부 알림을 발송하지 않습니다.')
  const c = input.config
  if (purpose === 'validation' && c.bars !== 1000) throw new Error('미래 검증의 실시간 계산은 최근 1,000봉을 사용합니다.')
  if (purpose === 'validation' && (c.horizon + 2) * timeframes[c.timeframe] >= input.trialDays * 86400000) throw new Error('한 사례의 관찰 기간보다 긴 검증 기간을 선택해주세요.')
  if (hasDerivativeFilters(c) && input.derivativeVersion !== undefined && input.derivativeVersion !== DERIVATIVE_FILTER_VERSION) throw new Error('파생 조건의 버전을 확인해주세요.')
  const ref = input.positionRef
  if (ref && (purpose !== 'opposition' || typeof ref.connectionId !== 'string' || ref.connectionId.length > 80 || ref.key !== `${input.asset}:${holdingSide}`)) throw new Error('연결 포지션과 반대 신호 조건이 일치하지 않습니다.')
  return { requestId: input.requestId, name: input.name.trim(), asset: input.asset, notify: input.notify, purpose, holdingSide: purpose === 'opposition' ? holdingSide : null, version: ENGINE_VERSION, config: { timeframe: c.timeframe, signals: [...c.signals].sort(), window: c.window, horizon: c.horizon, target: c.target, cost: c.cost, side: c.side, regime: c.regime, bars: c.bars, ...(c.funding && c.funding !== 'any' ? { funding: c.funding } : {}), ...(c.openInterest && c.openInterest !== 'any' ? { openInterest: c.openInterest } : {}) }, ...(purpose === 'validation' ? { trialDays: input.trialDays, trialVersion: 'forward-1' } : {}), ...(ref ? { positionRef: { connectionId: ref.connectionId, key: ref.key } } : {}), ...(hasDerivativeFilters(c) ? { derivativeVersion: DERIVATIVE_FILTER_VERSION } : {}) }
}
export const signalFingerprint = config => createHash('sha256').update(JSON.stringify(config)).digest('hex')
export function createSignalWatch(config, now) { return { id: randomUUID(), config, hash: signalFingerprint(config), createdAt: now, active: true, lastAt: null, matched: false, checkedAt: null, issue: null, events: [], ...(hasDerivativeFilters(config.config) ? { derivativeState: 'unknown' } : {}) } }
const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0
export function validSignalWatch(rule) {
  try {
    if (hasDerivativeFilters(rule?.config?.config) && (rule.config.derivativeVersion !== DERIVATIVE_FILTER_VERSION || !['unknown', 'match', 'miss'].includes(rule.derivativeState) || !rule.events?.every(e => e.derivatives?.method === DERIVATIVE_FILTER_VERSION && e.derivatives.source === 'Bybit USDT perpetual' && derivativeMatch(rule.config.config, e.derivatives, e.at + timeframes[rule.config.config.timeframe]) === 'match'))) return false
    return rule && typeof rule.id === 'string' && typeof rule.active === 'boolean' && typeof rule.matched === 'boolean' && positive(rule.createdAt) && (rule.lastAt === null || positive(rule.lastAt)) && (rule.checkedAt === null || positive(rule.checkedAt)) && (rule.issue === null || typeof rule.issue === 'string') && rule.hash === signalFingerprint(normalizeSignalWatch(rule.config)) && Array.isArray(rule.events) && rule.events.length <= 100 && new Set(rule.events.map(e => e.id)).size === rule.events.length && rule.events.every(e => typeof e.id === 'string' && positive(e.at) && positive(e.price) && Array.isArray(e.signals) && ['pending', 'entered', 'up', 'down', 'timeout', 'ambiguous', 'unresolved', 'cancelled'].includes(e.outcome) && [e.net, e.entry, e.exit].every(n => n === null || Number.isFinite(n)) && ['off', 'pending', 'sent', 'uncertain'].includes(e.delivery?.status) && Number.isInteger(e.delivery.attempts) && e.delivery.attempts >= 0)
  } catch { return false }
}
function finish(event, outcome, exit, c, at) {
  event.outcome = outcome; event.exit = exit; event.exitAt = at
  event.net = exit === null || event.entry === null ? null : (exit / event.entry - 1) * 100 * (c.side === 'long' ? 1 : -1) - c.cost
}
export function deferDerivativeWatch(rule, issue) {
  if (hasDerivativeFilters(rule.config.config)) { rule.derivativeState = 'unknown'; rule.matched = false }
  rule.issue = issue
}
export function expireSignalTrial(rule, now) {
  if (rule.active && rule.config.purpose === 'validation' && now >= rule.createdAt + rule.config.trialDays * 86400000) {
    rule.active = false; rule.endedAt = now; rule.endReason = 'period'
    rule.events.filter(e => ['pending', 'entered'].includes(e.outcome)).forEach(e => finish(e, 'unresolved', null, rule.config.config, now))
    rule.issue = '정해 둔 검증 기간이 끝났습니다. 종료 시점까지 관찰하지 못한 결과는 제외합니다.'
  }
}
export function observeSignalWatch(rule, history, now, contexts) {
  expireSignalTrial(rule, now)
  const c = rule.config.config, candles = history.candles, last = candles.at(-1), interval = timeframes[c.timeframe]
  if (!rule.active) return
  if (!last || history.asset !== rule.config.asset || history.timeframe !== c.timeframe || !Number.isFinite(history.asOf) || history.asOf - last.timestamp > interval * 2 || history.asOf - last.timestamp < interval) { deferDerivativeWatch(rule, '최신 완료 봉을 확인할 수 없어 신호 판정을 보류합니다.'); return }
  const frames = signalFrames(candles, c.timeframe)
  const filtered = hasDerivativeFilters(c)
  const evaluate = i => {
    const state = derivativeMatch(c, contexts?.get(candles[i].timestamp + interval), candles[i].timestamp + interval)
    if (filtered) rule.derivativeState = state
    rule.issue = state === 'unknown' ? '봉 종료 전 저장된 파생 자료가 부족해 판정을 보류합니다. 자료가 돌아온 첫 봉은 기준만 다시 잡고 알리지 않습니다.' : null
    return matchesFrame(frames, candles, i, c, contexts)
  }
  rule.checkedAt = now
  if (rule.lastAt === null) { rule.lastAt = last.timestamp; rule.matched = evaluate(candles.length - 1); return }
  if (last.timestamp <= rule.lastAt) { if (!filtered) rule.issue = null; return }
  const previousIndex = candles.findIndex(x => x.timestamp === rule.lastAt)
  const future = previousIndex < 0 ? [] : candles.slice(previousIndex + 1)
  if (previousIndex < 0 || future.some((b, i) => b.timestamp - (i ? future[i - 1].timestamp : rule.lastAt) !== interval)) {
    rule.events.filter(e => ['pending', 'entered'].includes(e.outcome)).forEach(e => finish(e, 'unresolved', null, c, now))
    rule.lastAt = last.timestamp; rule.matched = evaluate(candles.length - 1); rule.issue = '관측 이력에 공백이 있어 진행 중 결과를 판정 불가로 기록하고 기준을 다시 잡았습니다.'; return
  }
  let recovering = filtered && rule.derivativeState === 'unknown'
  for (let i = previousIndex + 1; i < candles.length; i++) {
    const bar = candles[i]
    for (const e of rule.events.filter(e => ['pending', 'entered'].includes(e.outcome))) {
      if (bar.timestamp <= e.at) continue
      if (e.entry === null) { e.entry = bar.open; e.entryAt = bar.timestamp; e.outcome = 'entered' }
      const upper = e.entry * (1 + c.target / 100), lower = e.entry * (1 - c.target / 100)
      const up = bar.high >= upper, down = bar.low <= lower
      if (bar.open >= upper || bar.open <= lower) finish(e, bar.open >= upper ? 'up' : 'down', bar.open, c, bar.timestamp)
      else if (up && down) finish(e, 'ambiguous', null, c, bar.timestamp)
      else if (up || down) finish(e, up ? 'up' : 'down', up ? upper : lower, c, bar.timestamp)
      else if ((bar.timestamp - e.at) / interval >= c.horizon) finish(e, 'timeout', bar.close, c, bar.timestamp)
    }
    recovering ||= filtered && rule.derivativeState === 'unknown'
    const match = evaluate(i)
    // Only newly confirmed current conditions produce events; reconnect does not replay old signals.
    const trial = rule.config.purpose === 'validation'
    const eligible = trial ? bar.timestamp >= rule.createdAt && bar.timestamp + (c.horizon + 1) * interval <= rule.createdAt + rule.config.trialDays * 86400000 && (!rule.events.length || bar.timestamp - rule.events.at(-1).at >= c.horizon * interval) : !rule.matched
    if (match && eligible && !recovering && history.asOf - bar.timestamp <= interval * 2) {
      if (rule.events.length >= 100) { stopSignalWatch(rule, now); rule.issue = '100개 신호 기록을 보관해 감시와 진행 중 관찰을 종료했습니다. 새 감시로 이어갈 수 있습니다.'; break }
      rule.events.push({ id: `${rule.id}:${bar.timestamp}`, at: bar.timestamp, observedAt: now, price: bar.close, signals: [...frames[i].signals], outcome: 'pending', entry: null, entryAt: null, exit: null, exitAt: null, net: null, delivery: { status: rule.config.notify ? 'pending' : 'off', attempts: 0 }, ...(filtered ? { derivatives: { ...structuredClone(contexts.get(bar.timestamp + interval)), ...(c.funding === undefined || c.funding === 'any' ? { funding: null } : {}), ...(c.openInterest === undefined || c.openInterest === 'any' ? { openInterest: null } : {}), method: DERIVATIVE_FILTER_VERSION, source: 'Bybit USDT perpetual' } } : {}) })
    }
    rule.lastAt = bar.timestamp; rule.matched = match
  }
}
export function stopSignalWatch(rule, now) { rule.active = false; if (rule.config.purpose === 'validation') { rule.endedAt = now; rule.endReason = rule.events.length >= 100 ? 'limit' : 'manual' }; rule.events.filter(e => ['pending', 'entered'].includes(e.outcome)).forEach(e => finish(e, 'cancelled', null, rule.config.config, now)) }
export function suspendSignalWatch(rule, now) { rule.lastAt = null; rule.matched = false; if (hasDerivativeFilters(rule.config.config)) rule.derivativeState = 'unknown'; rule.events.filter(e => ['pending', 'entered'].includes(e.outcome)).forEach(e => finish(e, 'unresolved', null, rule.config.config, now)) }
