import { researchBase } from './researchClient'
import { rememberResearchClock } from './researchClock'
import { researchAssets } from './researchModel'

export interface DerivativePoint { at: number; value: number; knownAt: number }
export interface DerivativeSeries {
  metric: 'funding' | 'openInterest'; unit: string; status: 'collecting' | 'unavailable' | 'stale' | 'available'
  attemptedAt: number | null; succeededAt: number | null; firstAt: number | null; lastAt: number | null
  gaps: { from: number; to: number }[] | null; points: DerivativePoint[]
}
export interface DerivativesHistory { version: 1; asset: string; days: number; fetchedAt: number; from: number; to: number; source: string; retentionDays: 365; intervalMinutes: 15; backfillDays: 7; series: DerivativeSeries[] }
const time = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0
const nullable = (v: unknown) => v === null || time(v)
export async function fetchDerivativesHistory(asset: string, days: number, signal?: AbortSignal): Promise<DerivativesHistory> {
  if (!researchAssets.some(a => a === asset) || ![7, 30, 90].includes(days)) throw new Error('조회 조건을 확인해주세요.')
  const started = performance.now()
  const response = await fetch(`${researchBase()}/derivatives?asset=${encodeURIComponent(asset)}&days=${days}`, { credentials: 'omit', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) })
  if (!response.ok) throw new Error(response.status === 429 ? '조회가 많습니다. 잠시 후 다시 확인해주세요.' : '저장된 지표를 불러오지 못했어요. 잠시 후 다시 확인해주세요.')
  const text = await response.text()
  if (text.length > 1_000_000) throw new Error('지표 자료 크기를 확인할 수 없습니다.')
  const v = JSON.parse(text) as DerivativesHistory
  if (!v || v.version !== 1 || v.asset !== asset || v.days !== days || ![v.fetchedAt, v.from, v.to].every(time) || v.from > v.to || v.to > v.fetchedAt || v.retentionDays !== 365 || v.intervalMinutes !== 15 || v.backfillDays !== 7 || v.source !== 'Bybit USDT perpetual' || !Array.isArray(v.series) || v.series.length !== 2 || v.series.some((s, i) =>
    !s || s.metric !== ['funding', 'openInterest'][i] || s.unit !== (i === 0 ? 'rate' : asset) || !['collecting', 'unavailable', 'stale', 'available'].includes(s.status) || ![s.attemptedAt, s.succeededAt, s.firstAt, s.lastAt].every(nullable) ||
    !Array.isArray(s.points) || s.points.length > days * 24 + 1 || s.points.some((p, j) => !p || !time(p.at) || !time(p.knownAt) || p.at < v.from || p.at > v.to || p.knownAt < p.at || p.knownAt > v.fetchedAt || !Number.isFinite(p.value) || (i === 0 ? Math.abs(p.value) > 1 : p.value < 0 || p.at % 3_600_000 !== 0) || j > 0 && p.at <= s.points[j - 1]!.at) ||
    s.firstAt !== (s.points[0]?.at ?? null) || s.lastAt !== (s.points.at(-1)?.at ?? null) ||
    (i === 0 ? s.gaps !== null : !Array.isArray(s.gaps) || s.gaps.length > days * 24 + 1 || s.gaps.some(g => !g || !time(g.from) || !time(g.to) || g.from < v.from || g.to >= v.to || g.from > g.to)))) throw new Error('저장 지표 형식을 확인할 수 없습니다.')
  return rememberResearchClock(v, response.headers.get('date'), started)
}

/** A broken segment stays broken: the chart must not interpolate a missing hourly sample. */
export function historyPaths(points: DerivativePoint[], from: number, to: number, hourly: boolean) {
  if (points.length < 2 || to <= from) return []
  const min = Math.min(...points.map(p => p.value)), max = Math.max(...points.map(p => p.value)), range = max - min || 1
  const paths: string[] = []
  points.forEach((p, i) => {
    const xy = `${(10 + (p.at - from) / (to - from) * 780).toFixed(2)},${(110 - (p.value - min) / range * 90).toFixed(2)}`
    if (i === 0 || hourly && p.at - points[i - 1]!.at > 3_600_000) paths.push(`M${xy}`)
    else paths[paths.length - 1] += ` L${xy}`
  })
  return paths
}
