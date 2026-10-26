import { researchBase } from './researchClient'
import { researchAssets } from './researchModel'
import { DERIVATIVE_FILTER_VERSION, derivativeMatch, timeframes, type ResearchTimeframe, type DerivativeContextPoint } from './signalExplorer'
export interface DerivativeContext { version: 1; method: string; asset: string; timeframe: ResearchTimeframe; from: number; to: number; fetchedAt: number; firstStoredAt: number | null; source: string; points: DerivativeContextPoint[] }
export async function fetchDerivativeContext(asset: string, timeframe: ResearchTimeframe, from: number, to: number, signal?: AbortSignal): Promise<DerivativeContext> {
  const step = timeframes[timeframe]
  if (!researchAssets.some(a => a === asset) || !Object.hasOwn(timeframes, timeframe) || ![from, to].every(n => Number.isSafeInteger(n) && n > 0 && n % step === 0) || from > to || (to - from) / step >= 10000) throw new Error('과거 지표 조회 범위를 확인해주세요.')
  const query = new URLSearchParams({ asset, timeframe, from: String(from), to: String(to) })
  const response = await fetch(`${researchBase()}/derivatives/context?${query}`, { credentials: 'omit', redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20_000)]) : AbortSignal.timeout(20_000) })
  if (!response.ok) throw new Error(response.status === 429 ? '과거 지표 조회가 많습니다. 잠시 후 다시 불러와주세요.' : '당시 저장 지표를 불러오지 못했습니다. 추가 조건을 적용한 결과는 보류합니다.')
  const text = await response.text()
  if (text.length > 4_000_000) throw new Error('과거 지표 자료가 너무 큽니다.')
  const v = JSON.parse(text) as DerivativeContext
  if (!v || v.version !== 1 || v.method !== DERIVATIVE_FILTER_VERSION || v.asset !== asset || v.timeframe !== timeframe || v.from !== from || v.to !== to || !Number.isSafeInteger(v.fetchedAt) || v.fetchedAt < to || v.firstStoredAt !== null && (!Number.isSafeInteger(v.firstStoredAt) || v.firstStoredAt < 0 || v.firstStoredAt > v.fetchedAt) || v.source !== 'Bybit USDT perpetual' || !Array.isArray(v.points) || v.points.length !== (to - from) / step + 1 || v.points.some((p, i) => !p || p.at !== from + i * step || p.funding !== null && derivativeMatch({ funding: 'positive' }, p, p.at) === 'unknown' || p.openInterest !== null && derivativeMatch({ openInterest: 'rising' }, p, p.at) === 'unknown')) throw new Error('과거 지표의 시각과 출처를 확인할 수 없습니다.')
  return v
}
