import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import { ReconnectingWebSocket } from '@/services/market/realtime/ReconnectingWebSocket'
import type { Candle, MarketDetailSnapshot, RecentTrade } from '@/types/marketDetail'
import { applyTrade, buildOrderbookLevels, createTradeCandle, decodeWebSocketData, fetchJson, mergeCandle, timeframeMilliseconds, updateInstrumentPrice } from './providerUtils'
import { upbitRequestGate } from './upbitRequestGate'

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

type UpbitMessage = Record<string, unknown>

const restBaseUrl = 'https://api.upbit.com/v1'
const socketUrl = 'wss://api.upbit.com/websocket/v1'
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

function mapTrade(trade: UpbitTrade, uniqueSuffix = ''): RecentTrade {
  return {
    id: `upbit-${trade.sequential_id}-${trade.timestamp}-${uniqueSuffix}`,
    timestamp: trade.timestamp,
    price: trade.trade_price,
    amount: trade.trade_volume,
    side: trade.ask_bid === 'BID' ? 'buy' : 'sell',
  }
}

function mapOrderbook(instrumentId: string, units: readonly UpbitOrderbookUnit[]) {
  const asks = buildOrderbookLevels(units.slice(0, 10).map((unit) => [unit.ask_price, unit.ask_size] as const)).toReversed()
  const bids = buildOrderbookLevels(units.slice(0, 10).map((unit) => [unit.bid_price, unit.bid_size] as const))
  return { symbolId: instrumentId, asks, bids, spread: (asks.at(-1)?.price ?? 0) - (bids[0]?.price ?? 0) }
}

export const upbitMarketDataProvider: RealtimeMarketProvider = {
  id: 'Upbit Korea',
  supports: (instrument) => instrument.marketId === 'upbit',

  async loadSnapshot(instrument, timeframe, signal) {
    const market = instrument.providerSymbol ?? upbitMarketCode(instrument.symbol)
    // Only historical candles need REST. Initial ticker/orderbook/trades arrive
    // through the public stream instead of four competing browser REST calls.
    const candleRows = await fetchJson<readonly UpbitCandle[]>(`${restBaseUrl}/candles/${candlePath[timeframe]}?market=${encodeURIComponent(market)}&count=120`, signal)
    const candles: readonly Candle[] = candleRows.map((row) => ({
      timestamp: row.candle_date_time_utc ? Date.parse(`${row.candle_date_time_utc}Z`) : Math.floor(row.timestamp / timeframeMilliseconds[timeframe]) * timeframeMilliseconds[timeframe],
      open: row.opening_price,
      high: row.high_price,
      low: row.low_price,
      close: row.trade_price,
      volume: row.candle_acc_trade_volume,
    })).toReversed()
    return {
      instrument,
      timeframe,
      candles,
      orderbook: mapOrderbook(instrument.id, []),
      recentTrades: [],
    }
  },

  subscribe(instrument, timeframe, initialSnapshot, onEvent) {
    const market = instrument.providerSymbol ?? upbitMarketCode(instrument.symbol)
    let snapshot: MarketDetailSnapshot = initialSnapshot
    let streamSequence = 0
    const socket = new ReconnectingWebSocket({
      createUrl: () => socketUrl,
      beforeConnect: (signal) => upbitRequestGate.run(() => undefined, signal),
      onOpen: (activeSocket) => activeSocket.send(JSON.stringify([
        { ticket: `investai-${instrument.id}-${Date.now()}` },
        { type: 'ticker', codes: [market] },
        { type: 'trade', codes: [market] },
        { type: 'orderbook', codes: [market] },
        ...(timeframe === '1D' ? [] : [{ type: candleStream[timeframe], codes: [market] }]),
        { format: 'DEFAULT' },
      ])),
      onStatus: (status, reconnectAttempt) => onEvent({ status, reconnectAttempt }),
      onMessage: (message) => {
        void (async () => {
          const data = JSON.parse(await decodeWebSocketData(message.data)) as UpbitMessage
          const type = String(data.type)
          if (type === 'trade') {
            streamSequence += 1
            const trade = mapTrade({
              sequential_id: Number(data.sequential_id), timestamp: Number(data.trade_timestamp ?? data.timestamp), trade_price: Number(data.trade_price), trade_volume: Number(data.trade_volume), ask_bid: String(data.ask_bid) as 'ASK' | 'BID',
            }, `stream-${streamSequence}`)
            // Upbit has no daily candle websocket channel. Daily candles use
            // timestamp-aligned trades after the REST history is loaded.
            if (timeframe === '1D' && data.stream_type !== 'SNAPSHOT') snapshot = { ...snapshot, candles: mergeCandle(snapshot.candles, createTradeCandle(snapshot, trade)) }
            snapshot = applyTrade(snapshot, trade)
          } else if (type === 'ticker') {
            snapshot = {
              ...snapshot,
              instrument: {
                ...updateInstrumentPrice(snapshot.instrument, Number(data.trade_price), Number(data.signed_change_rate) * 100),
                volume24h: Number(data.acc_trade_price_24h),
              },
            }
          } else if (type === 'orderbook') {
            snapshot = { ...snapshot, orderbook: mapOrderbook(instrument.id, data.orderbook_units as unknown as readonly UpbitOrderbookUnit[]) }
          } else if (type.startsWith('candle.')) {
            snapshot = {
              ...snapshot,
              candles: mergeCandle(snapshot.candles, {
                timestamp: Date.parse(`${String(data.candle_date_time_utc)}Z`),
                open: Number(data.opening_price), high: Number(data.high_price), low: Number(data.low_price), close: Number(data.trade_price), volume: Number(data.candle_acc_trade_volume),
              }),
            }
          }
          onEvent({ snapshot })
        })().catch(() => onEvent({ message: 'An invalid Upbit stream message was ignored.' }))
      },
    })
    socket.connect()
    return () => socket.close()
  },
}
