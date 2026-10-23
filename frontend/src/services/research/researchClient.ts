import { object, researchAssets, type ResearchSnapshot } from './researchModel'

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
