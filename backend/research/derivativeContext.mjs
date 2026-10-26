const HOUR = 3_600_000
export const DERIVATIVE_FILTER_VERSION = 'investai-derivatives-asof-1'
export const hasDerivativeFilters = config => config?.funding !== undefined && config.funding !== 'any' || config?.openInterest !== undefined && config.openInterest !== 'any'
export const validDerivativeFilters = config => (config.funding === undefined || ['any', 'positive', 'negative'].includes(config.funding)) && (config.openInterest === undefined || ['any', 'rising', 'falling'].includes(config.openInterest))

/** Sweep actual arrival times, not provider timestamps. Later backfills/corrections never leak backwards. */
export function buildDerivativeContext(observations, from, to, step) {
  const rows = [...observations].sort((a, b) => a.knownAt - b.knownAt || a.at - b.at)
  const known = { funding: new Map(), openInterest: new Map() }, latest = { funding: null, openInterest: null }
  const points = []; let cursor = 0
  for (let at = from; at <= to; at += step) {
    while (cursor < rows.length && rows[cursor].knownAt <= at) {
      const row = rows[cursor++]
      if (!known[row.metric] || row.at > row.knownAt || !Number.isFinite(row.value)) continue
      known[row.metric].set(row.at, { at: row.at, knownAt: row.knownAt, value: row.value })
      if (latest[row.metric] === null || row.at > latest[row.metric]) latest[row.metric] = row.at
    }
    const f = known.funding.get(latest.funding), oi = known.openInterest.get(latest.openInterest)
    const previous = oi ? known.openInterest.get(oi.at - 24 * HOUR) : undefined
    const funding = f && at - f.at <= 12 * HOUR ? f : null
    const openInterest = oi && at - oi.at <= 2 * HOUR && previous?.value > 0 ? { ...oi, change24h: (oi.value / previous.value - 1) * 100, previousAt: previous.at, previousKnownAt: previous.knownAt, previousValue: previous.value } : null
    points.push({ at, funding, openInterest })
  }
  return points
}

/** Unknown is different from a condition that was observed and did not match. */
export function derivativeMatch(config, context, decisionAt) {
  if (!hasDerivativeFilters(config)) return 'match'
  if (!validDerivativeFilters(config) || !context || context.at !== decisionAt) return 'unknown'
  const funding = config.funding ?? 'any', interest = config.openInterest ?? 'any'
  const usable = (p, age) => !!p && Number.isFinite(p.value) && Number.isSafeInteger(p.at) && Number.isSafeInteger(p.knownAt) && p.at <= p.knownAt && p.knownAt <= decisionAt && decisionAt - p.at <= age
  const f = context.funding, oi = context.openInterest
  if (funding !== 'any' && (!usable(f, 12 * HOUR) || Math.abs(f.value) > 1)) return 'unknown'
  if (interest !== 'any' && (!usable(oi, 2 * HOUR) || oi.value < 0 || oi.previousAt !== oi.at - 24 * HOUR || !Number.isSafeInteger(oi.previousKnownAt) || oi.previousKnownAt < oi.previousAt || oi.previousKnownAt > decisionAt || !Number.isFinite(oi.previousValue) || oi.previousValue <= 0 || !Number.isFinite(oi.change24h) || Math.abs(oi.change24h - (oi.value / oi.previousValue - 1) * 100) > 1e-8)) return 'unknown'
  if (funding === 'positive' && f.value <= 0 || funding === 'negative' && f.value >= 0 || interest === 'rising' && oi.change24h <= 0 || interest === 'falling' && oi.change24h >= 0) return 'miss'
  return 'match'
}
