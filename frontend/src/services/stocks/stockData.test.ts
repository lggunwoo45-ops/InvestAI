import { describe, expect, it, vi } from 'vitest'
import { createStockLoader, stockRelayBase, stockTrend, stockValuation, validateStockSnapshot, type StockSnapshot } from './stockData'
import { domesticStockDirectoryProvider } from './stockDirectory'
import { buildStockWatchCandidates } from '@/services/ai/stockWatchCandidateEngine'
const at = Date.parse('2026-10-22T03:00:00Z')
const candle = { timestamp: Date.parse('2026-10-21T00:00:00Z'), open: 100, high: 120, low: 90, close: 110, volume: 1000 }
const fixture = (symbol = '005930'): StockSnapshot => ({ provider: 'KIS', market: 'KRX', currency: 'KRW', quote: { symbol, price: 110, changePercent: 1, volume: 1_000, fetchedAt: at }, candles: [candle], historyError: null })
const response = (symbol = '005930') => new Response(JSON.stringify(fixture(symbol)))
describe('domestic stock transport and analysis', () => {
  it('shares requests across holdings and screen navigation; honors cache and cooldown', async () => {
    let time = at
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(response()).mockResolvedValue(new Response(JSON.stringify({ error: 'stock_busy' }), { status: 429, headers: { 'Retry-After': '60' } }))
    const load = createStockLoader(fetcher, '', () => time)
    const [a, b] = await Promise.all([load('005930'), load('005930')])
    expect(a).toEqual(b); expect(fetcher).toHaveBeenCalledTimes(1)
    time += 29_000; await load('005930'); expect(fetcher).toHaveBeenCalledTimes(1)
    time += 2000
    await expect(load('005930')).rejects.toMatchObject({ code: 'stock_busy' })
    await expect(load('000660')).rejects.toMatchObject({ code: 'stock_busy' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('does not fetch without configuration and rejects unsafe relay configuration', async () => {
    const fetcher = vi.fn<typeof fetch>()
    await expect(createStockLoader(fetcher, null)('005930')).rejects.toMatchObject({ code: 'stock_setup_required' })
    expect(fetcher).not.toHaveBeenCalled()
    for (const base of ['http://example.test', 'https://user:pass@example.test', 'https://example.test/path', 'https://example.test/?key=x']) expect(stockRelayBase(base, 'example.test')).toBeNull()
    expect(stockRelayBase('', 'example.test')).toBeNull()
    expect(stockRelayBase('', '127.0.0.1')).toBe('')
  })
  it('bounds concurrency to two and validates the selected identity and freshness', async () => {
    const release: (() => void)[] = []; let active = 0, max = 0
    const fetcher = vi.fn<typeof fetch>(async url => { active++; max = Math.max(max, active); await new Promise<void>(resolve => release.push(resolve)); active--; return response(new URL(String(url), 'https://test').searchParams.get('symbol')!) })
    const load = createStockLoader(fetcher, '', () => at)
    const requests = ['005930', '000660', '035420'].map(load)
    await vi.waitFor(() => expect(release.length).toBe(2))
    release.shift()!(); await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(3))
    release.splice(0).forEach(done => done()); await Promise.all(requests)
    expect(max).toBe(2)
    expect(() => validateStockSnapshot(fixture(), '000660', at)).toThrow()
    expect(() => validateStockSnapshot(fixture(), '005930', at + 121_000)).toThrow()
    expect(() => validateStockSnapshot({ ...fixture(), candles: [{ ...candle, high: 1 }] }, '005930', at)).toThrow()
  })
  it('excludes today from trend analysis and withholds short or stale history', () => {
    const candles = Array.from({ length: 21 }, (_, i) => ({ ...candle, timestamp: Date.parse('2026-10-02T00:00:00Z') + i * 86_400_000, close: i === 20 ? 9999 : 100 }))
    expect(stockTrend(candles, at)).toMatchObject({ average: 100, count: 20, direction: 'near' })
    expect(stockTrend(candles.slice(-10), at)).toBeNull()
    expect(stockTrend(candles, at + 20 * 86_400_000)).toBeNull()
  })
  it('calculates KRW returns, rejecting invalid quantities and overflow', () => {
    expect(stockValuation(100, 2, 110)).toMatchObject({ cost: 200, value: 220, profit: 20 })
    expect(stockValuation(100, 2, 110)?.percent).toBeCloseTo(10)
    for (const q of [0, -1, 1.5, Infinity]) expect(stockValuation(100, q, 110)).toBeNull()
    expect(stockValuation(Number.MAX_VALUE, 2, 100)).toBeNull()
  })
  it('uses an unpriced directory without pretending to rank unqueried stocks', async () => {
    const catalog = await domesticStockDirectoryProvider.load('kospi')
    expect(catalog.source).toBe('directory'); expect(catalog.instruments.length).toBeGreaterThan(100)
    expect(catalog.instruments.every(row => Number.isNaN(row.lastPrice))).toBe(true)
    expect(buildStockWatchCandidates({ instruments: catalog.instruments, region: 'korea', language: 'ko', newsResult: null })).toEqual([])
    expect(domesticStockDirectoryProvider.supports('kospi', 'mock')).toBe(false)
  })
})
