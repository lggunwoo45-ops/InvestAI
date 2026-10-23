import { object, researchAssets, type ResearchSnapshot } from './researchModel'
import type { Candle } from '@/types/marketDetail'
import { timeframes, type ResearchTimeframe } from './signalExplorer'

export interface ResearchHistory { version: 1; asset: string; timeframe: ResearchTimeframe; requested: number; fetchedAt: number; asOf: number; source: string; candles: Candle[] }
export async function fetchResearchHistory(asset: string, timeframe: ResearchTimeframe, count: number, signal?: AbortSignal): Promise<ResearchHistory> {
  if (!researchAssets.some(a => a === asset) || !Object.hasOwn(timeframes, timeframe) || ![1000, 3000, 5000].includes(count)) throw new Error('조회 조건을 확인해주세요.')
  const response = await fetch(`${researchBase()}/history?asset=${encodeURIComponent(asset)}&timeframe=${timeframe}&count=${count}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000), credentials: 'omit', redirect: 'error' })
  if (!response.ok) throw new Error(response.status === 429 ? '조회가 많습니다. 잠시 후 다시 불러와주세요.' : '과거 시세를 불러오지 못했습니다. 다시 불러오기를 눌러주세요.')
  const value = await response.json() as ResearchHistory
  if (value.version !== 1 || value.asset !== asset || value.timeframe !== timeframe || !Number.isFinite(value.asOf) || !Array.isArray(value.candles) || value.candles.length > count || value.candles.some((c, i) => ![c.timestamp, c.open, c.high, c.low, c.close, c.volume].every(Number.isFinite) || c.timestamp + timeframes[timeframe] > value.asOf || Math.min(c.open, c.high, c.low, c.close) <= 0 || c.volume < 0 || c.low > Math.min(c.open, c.close) || c.high < Math.max(c.open, c.close) || i > 0 && c.timestamp <= value.candles[i - 1]!.timestamp)) throw new Error('과거 시세 형식을 확인할 수 없습니다.')
  return value
}

export function researchBase(): string {
  const explicit = import.meta.env.VITE_RESEARCH_URL?.trim()
  if (explicit) {
    const url = new URL(explicit)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('시장 자료 서버 주소를 확인해주세요.')
    return explicit.replace(/\/$/, '')
  }
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) return '/api/research'
  const relay = import.meta.env.VITE_UPBIT_RELAY_URL?.trim()
  if (relay) {
    const url = new URL(relay)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('시장 자료 서버 주소를 확인해주세요.')
    return `${url.origin}/api/research`
  }
  throw new Error('시장 자료 서버가 연결되지 않았습니다. 계산기는 직접 입력해서 이용할 수 있습니다.')
}
export async function fetchResearch(asset: string, signal?: AbortSignal): Promise<ResearchSnapshot> {
  if (!researchAssets.some(value => value === asset)) throw new Error('지원하지 않는 종목입니다.')
  const response = await fetch(`${researchBase()}/snapshot?asset=${encodeURIComponent(asset)}`, { signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000), credentials: 'omit', redirect: 'error' })
  if (!response.ok) throw new Error(response.status === 429 ? '요청이 많습니다. 잠시 후 다시 확인해주세요.' : '시장 자료를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.')
  const value = object(await response.json())
  if (value.version !== 1 || value.asset !== asset || typeof value.fetchedAt !== 'number' || !Object.keys(object(value.sources)).length) throw new Error('시장 자료 형식이 올바르지 않습니다.')
  return value as unknown as ResearchSnapshot
}
