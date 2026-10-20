import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { Candle, MarketDetailSnapshot, RecentTrade } from '@/types/marketDetail'
import { applyTrade, buildOrderbookLevels, fetchJson, mergeCandle, timeframeMilliseconds, updateInstrumentPrice } from './providerUtils'
import { subscribeUpbitStream } from './upbitStream'

interface UpbitCandle {
  timestamp: number
  candle_date_time_utc?: string
  opening_price: number
  high_price: number
  low_price: number
  trade_price: number
  candle_acc_trade_volume: number
}

interface UpbitOrderbookUnit {
  ask_price: number
  bid_price: number
  ask_size: number
  bid_size: number
}

interface UpbitTrade {
  sequential_id: number
  timestamp: number
  trade_price: number
  trade_volume: number
  ask_bid: 'ASK' | 'BID'
}

const restBaseUrl = 'https://api.upbit.com/v1'
const candlePath = {
  '1m': 'minutes/1', '5m': 'minutes/5', '15m': 'minutes/15', '1H': 'minutes/60', '4H': 'minutes/240', '1D': 'days',
} as const
const candleStream = {
  '1m': 'candle.1m', '5m': 'candle.5m', '15m': 'candle.15m', '1H': 'candle.60m', '4H': 'candle.240m',
} as const

function upbitMarketCode(symbol: string): string {
  const [asset, quote] = symbol.split('/')
  return `${quote}-${asset}`.toUpperCase()
}

function mapTrade(trade: UpbitTrade): RecentTrade {
  return {
    id: `upbit-${trade.sequential_id}-${trade.timestamp}`,
    timestamp: trade.timestamp,
    price: trade.trade_price,
    amount: trade.trade_volume,
    side: trade.ask_bid === 'BID' ? 'buy' : 'sell',
  }
}

const positive = (value: number) => Number.isFinite(value) && value > 0
function validCandle(candle: Candle) {
  return positive(candle.timestamp) && [candle.open, candle.high, candle.low, candle.close].every(positive)
    && Number.isFinite(candle.volume) && candle.volume >= 0
    && candle.high >= Math.max(candle.open, candle.close) && candle.low <= Math.min(candle.open, candle.close)
}

function mapOrderbook(instrumentId: string, units: readonly UpbitOrderbookUnit[]) {
  const asks = buildOrderbookLevels(units.slice(0, 10).map((unit) => [unit.ask_price, unit.ask_size] as const)).toReversed()
  const bids = buildOrderbookLevels(units.slice(0, 10).map((unit) => [unit.bid_price, unit.bid_size] as const))
  return { symbolId: instrumentId, asks, bids, spread: (asks.at(-1)?.price ?? 0) - (bids[0]?.price ?? 0) }
}

export const upbitMarketDataProvider: RealtimeMarketProvider = {
  id: 'Upbit Korea',
  supports: (instrument) => instrument.marketId === 'upbit',

  async loadSnapshot(instrument, timeframe, signal, priority) {
    const market = instrument.providerSymbol ?? upbitMarketCode(instrument.symbol)
    // Only historical candles need REST. Initial ticker/orderbook/trades arrive
    // through the public stream instead of four competing browser REST calls.
    const candleRows = await fetchJson<readonly UpbitCandle[]>(`${restBaseUrl}/candles/${candlePath[timeframe]}?market=${encodeURIComponent(market)}&count=120`, signal, priority)
    const candles: readonly Candle[] = candleRows.map((row) => ({
      timestamp: row.candle_date_time_utc ? Date.parse(`${row.candle_date_time_utc}Z`) : Math.floor(row.timestamp / timeframeMilliseconds[timeframe]) * timeframeMilliseconds[timeframe],
      open: row.opening_price,
      high: row.high_price,
      low: row.low_price,
      close: row.trade_price,
      volume: row.candle_acc_trade_volume,
    })).toReversed()
    return {
      instrument: updateInstrumentPrice(instrument, candles.at(-1)?.close ?? instrument.lastPrice),
      timeframe,
      candles,
      orderbook: mapOrderbook(instrument.id, []),
      recentTrades: [],
    }
  },

  subscribe(instrument, timeframe, initialSnapshot, onEvent, priority) {
    const market = instrument.providerSymbol ?? upbitMarketCode(instrument.symbol)
    let snapshot: MarketDetailSnapshot = initialSnapshot
    let connected = false
    let recovering = false
    let active = true
    let refreshController: AbortController | null = null
    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    let lastPriceAt = 0
    const refresh = () => {
      refreshController?.abort()
      const controller = new AbortController()
      refreshController = controller
      recovering = true
      void upbitMarketDataProvider.loadSnapshot(instrument, timeframe, controller.signal, priority).then(value => {
        if (!active || controller.signal.aborted) return
        snapshot = value
        lastPriceAt = 0
        recovering = false
        // Wait for a real quote before marking the recovered history live.
        onEvent({ snapshot, status: 'connecting', quoteUpdatedAt: null })
      }).catch(() => {
        if (!active || controller.signal.aborted) return
        onEvent({ status: 'reconnecting', message: 'Refreshing candle history after reconnect…' })
        refreshTimer = setTimeout(refresh, 30_000)
      })
    }
    const stop = subscribeUpbitStream(market, {
      priority,
      status: (status, reconnectAttempt) => {
        if (status === 'live') {
          if (connected) refresh()
          connected = true
          onEvent({ status: 'connecting', reconnectAttempt })
        } else {
          refreshController?.abort()
          if (refreshTimer) clearTimeout(refreshTimer)
          onEvent({ status, reconnectAttempt })
        }
      },
      data: (data, receivedAt) => {
        if (!active || recovering) return
        try {
          const type = String(data.type)
          const quoteAt = Number(data.trade_timestamp ?? data.timestamp)
          const marketTime = Number(data.timestamp)
          // Browser and exchange clocks need not agree. Validate quote age on
          // the exchange clock, and transport freshness on the local clock.
          const fresh = positive(quoteAt) && positive(marketTime) && marketTime - quoteAt <= 90_000
            && quoteAt <= marketTime + 60_000 && Date.now() - receivedAt <= 90_000 && receivedAt <= Date.now()
          let updatesQuote = false
          if (type === 'trade') {
            const trade = mapTrade({
              sequential_id: Number(data.sequential_id), timestamp: Number(data.trade_timestamp ?? data.timestamp), trade_price: Number(data.trade_price), trade_volume: Number(data.trade_volume), ask_bid: String(data.ask_bid) as 'ASK' | 'BID',
            })
            if (!fresh || quoteAt < lastPriceAt || !positive(trade.price) || !positive(trade.amount) || !['ASK', 'BID'].includes(String(data.ask_bid))) return
            snapshot = applyTrade(snapshot, trade)
            updatesQuote = true
          } else if (type === 'ticker') {
            if (!fresh || quoteAt < lastPriceAt || !positive(Number(data.trade_price))) return
            snapshot = {
              ...snapshot,
              instrument: {
                ...updateInstrumentPrice(snapshot.instrument, Number(data.trade_price), Number(data.signed_change_rate) * 100),
                volume24h: Number.isFinite(Number(data.acc_trade_price_24h)) ? Number(data.acc_trade_price_24h) : snapshot.instrument.volume24h,
              },
            }
            // UTC-day totals include trades missed while REST/stream connections were pending.
            if (timeframe === '1D') {
              const candle: Candle = {
                timestamp: Math.floor(quoteAt / timeframeMilliseconds['1D']) * timeframeMilliseconds['1D'],
                open: Number(data.opening_price), high: Number(data.high_price), low: Number(data.low_price),
                close: Number(data.trade_price), volume: Number(data.acc_trade_volume),
              }
              if (validCandle(candle)) snapshot = { ...snapshot, candles: mergeCandle(snapshot.candles, candle) }
            }
            updatesQuote = true
          } else if (type === 'orderbook') {
            if (!Array.isArray(data.orderbook_units)) return
            snapshot = { ...snapshot, orderbook: mapOrderbook(instrument.id, data.orderbook_units as unknown as readonly UpbitOrderbookUnit[]) }
          } else if (timeframe !== '1D' && type === candleStream[timeframe]) {
            const candle: Candle = {
              timestamp: Date.parse(`${String(data.candle_date_time_utc)}Z`),
              open: Number(data.opening_price), high: Number(data.high_price), low: Number(data.low_price), close: Number(data.trade_price), volume: Number(data.candle_acc_trade_volume),
            }
            if (!validCandle(candle) || !fresh) return
            snapshot = {
              ...snapshot,
              candles: mergeCandle(snapshot.candles, candle),
            }
          } else return
          if (updatesQuote) lastPriceAt = quoteAt
          onEvent({ snapshot, ...(updatesQuote ? { status: 'live', quoteUpdatedAt: receivedAt, marketTime } : { quoteUpdatedAt: null }) })
        } catch { /* Invalid messages cannot make cached prices appear fresh. */ }
      },
    })
    return () => { active = false; refreshController?.abort(); if (refreshTimer) clearTimeout(refreshTimer); stop() }
  },
}
