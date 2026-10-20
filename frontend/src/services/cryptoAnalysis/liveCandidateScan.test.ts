import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MarketInstrument } from '@/types/market'
import type { MarketStreamOptions } from '@/services/market/marketDataService'
import type { RealtimeMarketState } from '@/types/marketDetail'
import { analysisIntervals, type AnalysisFrame } from './cryptoDecisionEngine'
import { inspectInstrument, matchesScan, scanCandidates, selectScanPool, type ScanCriteria, type ScanResult } from './liveCandidateScan'

const at = Date.parse('2026-10-20T12:00:00Z')
const coin: MarketInstrument = { id: 'upbit-btc', symbol: 'BTC/KRW', marketId: 'upbit', quoteCurrency: 'KRW', name: 'Bitcoin', lastPrice: 279, volume24h: 1000, change24hPercent: 2 }
const criteria: ScanCriteria = { direction: 'all', minimumVolumeRatio: 0, minimumRewardRisk: 0, excludeExtended: false }
function state(frame: AnalysisFrame, receipt = at): RealtimeMarketState {
  const interval = analysisIntervals[frame], end = Math.floor(at / interval) * interval
  return { connection: { requestedMode: 'live', effectiveMode: 'live', status: 'live', provider: 'fixture', lastUpdatedAt: receipt, reconnectAttempt: 0, message: '' },
    snapshot: { instrument: coin, timeframe: frame, recentTrades: [], orderbook: { symbolId: coin.id, asks: [], bids: [], spread: 0 },
      candles: Array.from({ length: 80 }, (_, i) => ({ timestamp: end - (80 - i) * interval, open: 200 + i, close: 200 + i, high: 203 + i, low: 197 + i, volume: i === 79 ? 180 : 100 })) } }
}
afterEach(() => vi.useRealTimers())

describe('manual candle scanner', () => {
  it('compares one quote currency, removes duplicates and limits the candidate pool', () => {
    const rows = Array.from({ length: 20 }, (_, i) => ({ ...coin, id: `coin-${i}`, volume24h: i + 1 }))
    expect(selectScanPool([...rows, rows[19], { ...coin, quoteCurrency: 'BTC', volume24h: 1e12 }], 'upbit-krw')).toHaveLength(12)
    expect(selectScanPool(rows, 'upbit-krw')[0].id).toBe('coin-19')
    expect(selectScanPool([{ ...coin, marketId: 'binance-spot', quoteCurrency: 'BTC' }, { ...coin, id: 'usdt', marketId: 'binance-spot', quoteCurrency: 'USDT' }], 'binance-spot').map(row => row.id)).toEqual(['usdt'])
  })
  it('uses actual closed bars, retains original receipt expiry and releases synchronous subscriptions', async () => {
    const stop = vi.fn()
    const result = await inspectInstrument(coin, new AbortController().signal, {
      now: () => at, subscribe: options => { options.onState(state(options.timeframe as AnalysisFrame, at - 20000)); return stop },
    })
    expect(result).toMatchObject({ analyzedAt: at, expiresAt: at + 70000, timedOut: false, decision: { direction: 'buy', coverage: 3 } })
    expect(stop).toHaveBeenCalledTimes(3)
    expect(matchesScan(result!, criteria, at + 70001)).toBe(false)
    expect(matchesScan(result!, { ...criteria, minimumVolumeRatio: 1.5 }, at)).toBe(true)
    expect(matchesScan(result!, { ...criteria, direction: 'sell' }, at)).toBe(false)
    expect(matchesScan(result!, { ...criteria, excludeExtended: true }, at)).toBe(false)
  })
  it('does not turn mock or insufficient data into a live direction', async () => {
    const result = await inspectInstrument(coin, new AbortController().signal, {
      now: () => at, subscribe: options => {
        const row = state(options.timeframe as AnalysisFrame)
        if (options.timeframe !== '1H') row.connection.effectiveMode = 'mock'
        options.onState(row); return () => {}
      },
    })
    expect(result?.decision).toMatchObject({ direction: 'unavailable', coverage: 1, plan: null })
    expect(matchesScan(result!, criteria, at)).toBe(false)
  })
  it('aborts pending subscriptions and prevents late callbacks from completing a result', async () => {
    const abort = new AbortController(), stop = vi.fn(), pending: MarketStreamOptions[] = []
    const task = inspectInstrument(coin, abort.signal, { now: () => at, subscribe: options => { pending.push(options); return stop } })
    abort.abort()
    expect(await task).toBeNull()
    expect(stop).toHaveBeenCalledTimes(3)
    for (const options of pending) options.onState(state(options.timeframe as AnalysisFrame))
    expect(stop).toHaveBeenCalledTimes(3)
  })
  it('times out without blocking the rest of the scan and releases all connections', async () => {
    vi.useFakeTimers()
    const stop = vi.fn()
    const task = inspectInstrument(coin, new AbortController().signal, { now: () => at, timeoutMs: 100, subscribe: () => stop })
    await vi.advanceTimersByTimeAsync(100)
    expect(await task).toMatchObject({ timedOut: true, decision: { direction: 'unavailable' } })
    expect(stop).toHaveBeenCalledTimes(3)
  })
  it('runs only two markets concurrently and starts no further markets after cancellation', async () => {
    const abort = new AbortController(), onResult = vi.fn(), pending: ((value: ScanResult | null) => void)[] = []
    const inspect = vi.fn(() => new Promise<ScanResult | null>(resolve => pending.push(resolve)))
    const task = scanCandidates(Array.from({ length: 30 }, () => coin), { signal: abort.signal, onResult, inspect })
    expect(inspect).toHaveBeenCalledTimes(2)
    abort.abort()
    pending.forEach(resolve => resolve(null))
    await task
    expect(inspect).toHaveBeenCalledTimes(2)
    expect(onResult).not.toHaveBeenCalled()
  })
})
