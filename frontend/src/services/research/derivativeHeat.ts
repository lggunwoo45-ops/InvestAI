import type { DerivativeSeries } from './derivativesHistory'
const HOUR = 3_600_000, DAY = 24 * HOUR
export const HEAT_METHOD = 'investai-relative-heat-1'
export interface HeatReading {
  percentile: number | null; band: 'high' | 'usual' | 'low' | 'unavailable'
  reason: string | null; samples: number; spanDays: number; coverage: number
  latest: number | null; at: number | null; fundingIntervalHours: number | null
}
/** Descriptive position in stored observations; not a probability or a trading score. */
export function derivativeHeat(series: DerivativeSeries, days: number, asOf: number, unavailable = false): HeatReading {
  const points = series.points.filter(p => p.at >= asOf - days * DAY)
  const latest = points.at(-1), past = points.slice(0, -1)
  const spanDays = latest && points[0] ? (latest.at - points[0].at) / DAY : 0
  const coverage = Math.min(1, spanDays / days, series.metric === 'openInterest' ? past.length / (days * 24) : 1)
  const result: HeatReading = { percentile: null, band: 'unavailable', reason: null, samples: past.length, spanDays, coverage, latest: latest?.value ?? null, at: latest?.at ?? null, fundingIntervalHours: null }
  const reject = (reason: string) => ({ ...result, reason })
  if (![7, 30, 90].includes(days) || !Number.isFinite(asOf) || points.some((p, i) => !Number.isSafeInteger(p.at) || !Number.isSafeInteger(p.knownAt) || p.at > p.knownAt || p.knownAt > asOf || !Number.isFinite(p.value) || (series.metric === 'funding' ? Math.abs(p.value) > 1 : p.value < 0 || p.at % HOUR !== 0) || i > 0 && p.at <= points[i - 1]!.at)) return reject('자료의 시각과 값을 확인할 수 없어 비교를 보류합니다.')
  if (!latest) return reject('아직 비교할 저장 기록이 없습니다.')
  if (unavailable || series.status !== 'available' || asOf - latest.at > (series.metric === 'funding' ? 12 : 2) * HOUR) return reject('최근 자료 갱신을 확인한 뒤 비교할 수 있습니다.')
  if (past.length < (series.metric === 'funding' ? 14 : 24) || coverage < .9) return reject(`최근 ${days}일의 기록이 충분하지 않습니다. 기간의 90% 이상을 확보한 뒤 비교합니다.`)
  if (series.metric === 'funding') {
    const interval = points[1]!.at - points[0]!.at
    if (interval <= 0 || interval > 12 * HOUR || points.slice(1).some((p, i) => p.at - points[i]!.at !== interval)) return reject('펀딩 정산 간격이 달라졌거나 자료에 공백이 있어 같은 기준으로 비교하기 어렵습니다.')
    result.fundingIntervalHours = interval / HOUR
  }
  const current = series.metric === 'funding' ? Math.abs(latest.value) : latest.value
  const values = past.map(p => series.metric === 'funding' ? Math.abs(p.value) : p.value)
  // Exclude the current value and put ties at their midpoint: flat series are 50, not 100.
  const percentile = (values.filter(v => v < current).length + values.filter(v => v === current).length / 2) / values.length * 100
  return { ...result, percentile, band: percentile >= 90 ? 'high' : percentile <= 10 ? 'low' : 'usual' }
}
