export interface DominancePoint { percent: number; at: number; marketChange: number }
export interface DominanceRead { point: DominancePoint; previous: DominancePoint | null }
const KEY = 'investai.market-dominance.v1'
const TTL = 10 * 60_000
let cached: { value: DominanceRead; until: number } | null = null
let pending: Promise<DominanceRead> | null = null
let retryAfter = 0
export function parseDominance(value: unknown, now: number): DominancePoint {
  const data = value as Record<string, unknown> | null
  const percent = data?.bitcoin_dominance_percentage, timestamp = data?.last_updated, change = data?.market_cap_change_24h
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent <= 0 || percent > 100 || typeof timestamp !== 'number' || !Number.isFinite(timestamp)
    || timestamp * 1000 > now + 60_000 || now - timestamp * 1000 > 3_600_000 || typeof change !== 'number' || !Number.isFinite(change) || change < -100) throw new Error('invalid-or-stale')
  return { percent, at: timestamp * 1000, marketChange: change }
}
export function previousDominance(points: readonly DominancePoint[], current: DominancePoint): DominancePoint | null {
  return points.filter(p => Number.isFinite(p.percent) && p.percent > 0 && p.percent <= 100 && Number.isFinite(p.at) && current.at - p.at >= 30 * 60_000 && current.at - p.at <= 26 * 3_600_000)
    .sort((a, b) => Math.abs(current.at - a.at - 86_400_000) - Math.abs(current.at - b.at - 86_400_000))[0] ?? null
}
/** Public aggregate data only. No portfolio, user notes, credentials or instrument IDs leave the browser. */
export function loadDominance(): Promise<DominanceRead> {
  if (cached && cached.until > Date.now() && Date.now() - cached.value.point.at <= 3_600_000) return Promise.resolve(cached.value)
  if (pending) return pending
  if (retryAfter > Date.now()) return Promise.reject(new Error('cooldown'))
  pending = (async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8_000)
    try {
      const response = await fetch('https://api.coinpaprika.com/v1/global', { signal: controller.signal, credentials: 'omit', headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('provider')
      const point = parseDominance(await response.json(), Date.now())
      let points: DominancePoint[] = []
      try { const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (saved?.version === 1 && Array.isArray(saved.points)) points = saved.points.filter((p: DominancePoint) => p && typeof p.at === 'number' && typeof p.percent === 'number').slice(-192) } catch { /* Optional observation history. */ }
      const previous = previousDominance(points, point)
      try {
        const valid = points.filter(p => Number.isFinite(p.at) && point.at - p.at >= 0 && point.at - p.at <= 26 * 3_600_000 && Number.isFinite(p.percent) && p.percent > 0 && p.percent <= 100)
        if (!valid.some(p => Math.abs(point.at - p.at) < TTL)) valid.push(point)
        localStorage.setItem(KEY, JSON.stringify({ version: 1, points: valid.slice(-192) }))
      } catch { /* Storage failure must not hide the current public reading. */ }
      const value = { point, previous }
      cached = { value, until: Date.now() + TTL }
      return value
    } catch (error) { retryAfter = Date.now() + 60_000; throw error }
    finally { clearTimeout(timer) }
  })().finally(() => { pending = null })
  return pending
}
