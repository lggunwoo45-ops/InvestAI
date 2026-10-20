import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parseDominance, previousDominance } from './dominanceService'
const now = Date.parse('2026-10-20T12:00:00Z')
const data = { bitcoin_dominance_percentage: 57.46, last_updated: now / 1000, market_cap_change_24h: -2 }
describe('public dominance data', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(now) })
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks() })
  it('validates real numbers, timestamps and freshness', () => {
    expect(parseDominance(data, now)).toEqual({ percent:57.46, at:now, marketChange:-2 })
    for (const invalid of [null, {}, {...data, bitcoin_dominance_percentage:101}, {...data, bitcoin_dominance_percentage:'57'}, {...data, last_updated:(now-3_600_001)/1000}, {...data,last_updated:(now+120_000)/1000}]) expect(() => parseDominance(invalid, now)).toThrow()
  })
  it('compares only observed history and does not invent a 24h dominance change', () => {
    const current = parseDominance(data, now)
    expect(previousDominance([], current)).toBeNull()
    expect(previousDominance([{...current,at:now-600_000}], current)).toBeNull()
    const prior = {...current,percent:56,at:now-86_400_000}
    expect(previousDominance([prior,{...current,at:now-3_600_000}], current)).toEqual(prior)
  })
  it('shares pending requests, caches the aggregate response and sends no user context', async () => {
    vi.resetModules()
    const fetch = vi.fn().mockResolvedValue({ok:true,json:async () => data})
    vi.stubGlobal('fetch', fetch)
    const { loadDominance } = await import('./dominanceService')
    const [a,b] = await Promise.all([loadDominance(),loadDominance()])
    expect(a).toEqual(b)
    await loadDominance()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('https://api.coinpaprika.com/v1/global',expect.objectContaining({credentials:'omit'}))
    expect(fetch.mock.calls[0][1].body).toBeUndefined()
  })
  it('backs off provider failures without substituting mock dominance', async () => {
    vi.resetModules()
    const fetch = vi.fn().mockResolvedValue({ok:false,status:429})
    vi.stubGlobal('fetch',fetch)
    const { loadDominance } = await import('./dominanceService')
    await expect(loadDominance()).rejects.toThrow('provider')
    await expect(loadDominance()).rejects.toThrow('cooldown')
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(localStorage.getItem('investai.market-dominance.v1')).toBeNull()
  })
})
