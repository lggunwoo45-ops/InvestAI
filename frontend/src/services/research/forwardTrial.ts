import type { SignalWatch } from './monitorClient'
export function summarizeTrial(rule: SignalWatch) {
  const end = rule.createdAt + (rule.config.trialDays ?? 0) * 86400000
  const events = rule.events.filter(e => e.at >= rule.createdAt && e.at < end)
  const completed = events.filter(e => ['up', 'down', 'timeout', 'ambiguous'].includes(e.outcome) && e.entry !== null)
  const lows = completed.map(e => e.outcome === 'ambiguous' ? -rule.config.config.target - rule.config.config.cost : e.net)
  const highs = completed.map(e => e.outcome === 'ambiguous' ? rule.config.config.target - rule.config.config.cost : e.net)
  const valid = lows.every(n => n !== null && Number.isFinite(n)) && highs.every(n => n !== null && Number.isFinite(n))
  const mean = (values: (number | null)[]) => valid && values.length ? values.reduce<number>((n, v) => n + v!, 0) / values.length : null
  return { end, samples: completed.length, pending: events.filter(e => ['pending', 'entered'].includes(e.outcome)).length, excluded: events.filter(e => ['unresolved', 'cancelled'].includes(e.outcome)).length, ambiguous: completed.filter(e => e.outcome === 'ambiguous').length, meanLow: mean(lows), meanHigh: mean(highs) }
}
