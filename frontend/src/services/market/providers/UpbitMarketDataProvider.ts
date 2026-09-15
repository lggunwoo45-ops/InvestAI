import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import { ReconnectingWebSocket } from '@/services/market/realtime/ReconnectingWebSocket'
import type { Candle, MarketDetailSnapshot, RecentTrade } from '@/types/marketDetail'
import { applyTrade, buildOrderbookLevels, decodeWebSocketData, fetchJson, mergeCandle, updateInstrumentPrice } from './providerUtils'

interface UpbitCandle {
  timestamp: number
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

interface UpbitOrderbook {
  orderbook_units: readonly UpbitOrderbookUnit[]
}

interface UpbitTrade {
  sequential_id: number
  timestamp: number
  trade_price: number
  trade_volume: number
  ask_bid: 'ASK' | 'BID'
}

interface UpbitTicker {
  trade_price: number
  signed_change_rate: number
  acc_trade_volume_24h: number
}

type UpbitMessage = Record<string, unknown>

const restBaseUrl = 'https://api.upbit.com/v1'
const socketUrl = 'wss://api.upbit.com/websocket/v1'
const candlePath = {
  '1m': 'minutes/1', '5m': 'minutes/5', '15m': 'minutes/15', '1H': 'minutes/60', '4H': 'minutes/240', '1D': 'days',
} as const
const candleStream = {
  '1m': 'candle.1m', '5m': 'candle.5m', '15m': 'candle.15m', '1H': 'candle.60m', '4H': 'candle.240m', '1D': 'candle.1d',
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

  async loadSnapshot(instrument, timeframe) {
    const market = upbitMarketCode(instrument.symbol)
    const [candleRows, orderbookRows, tradeRows, tickerRows] = await Promise.all([
      fetchJson<readonly UpbitCandle[]>(`${restBaseUrl}/candles/${candlePath[timeframe]}?market=${market}&count=120`),
      fetchJson<readonly UpbitOrderbook[]>(`${restBaseUrl}/orderbook?markets=${market}`),
      fetchJson<readonly UpbitTrade[]>(`${restBaseUrl}/trades/ticks?market=${market}&count=20`),
      fetchJson<readonly UpbitTicker[]>(`${restBaseUrl}/ticker?markets=${market}`),
    ])
    const ticker = tickerRows[0]
    const candles: readonly Candle[] = candleRows.map((row) => ({
      timestamp: row.timestamp,
      open: row.opening_price,
      high: row.high_price,
      low: row.low_price,
      close: row.trade_price,
      volume: row.candle_acc_trade_volume,
    })).toReversed()
    return {
      instrument: ticker ? {
        ...updateInstrumentPrice(instrument, ticker.trade_price, ticker.signed_change_rate * 100),
        volume24h: ticker.acc_trade_volume_24h,
      } : instrument,
      timeframe,
      candles,
      orderbook: mapOrderbook(instrument.id, orderbookRows[0]?.orderbook_units ?? []),
      recentTrades: tradeRows.map((trade, index) => mapTrade(trade, `snapshot-${index}`)).toSorted((left, right) => right.timestamp - left.timestamp),
    }
  },

  subscribe(instrument, timeframe, initialSnapshot, onEvent) {
    const market = upbitMarketCode(instrument.symbol)
    let snapshot: MarketDetailSnapshot = initialSnapshot
    let streamSequence = 0
    const socket = new ReconnectingWebSocket({
      createUrl: () => socketUrl,
      onOpen: (activeSocket) => activeSocket.send(JSON.stringify([
        { ticket: `investai-${instrument.id}-${Date.now()}` },
        { type: 'ticker', codes: [market], is_only_realtime: true },
        { type: 'trade', codes: [market], is_only_realtime: true },
        { type: 'orderbook', codes: [market], is_only_realtime: true },
        { type: candleStream[timeframe], codes: [market], is_only_realtime: true },
        { format: 'DEFAULT' },
      ])),
      onStatus: (status, reconnectAttempt) => onEvent({ status, reconnectAttempt }),
      onMessage: (message) => {
        void (async () => {
          const data = JSON.parse(await decodeWebSocketData(message.data)) as UpbitMessage
          const type = String(data.type)
          if (type === 'trade') {
            streamSequence += 1
            snapshot = applyTrade(snapshot, mapTrade({
              sequential_id: Number(data.sequential_id), timestamp: Number(data.trade_timestamp ?? data.timestamp), trade_price: Number(data.trade_price), trade_volume: Number(data.trade_volume), ask_bid: String(data.ask_bid) as 'ASK' | 'BID',
            }, `stream-${streamSequence}`))
          } else if (type === 'ticker') {
            snapshot = {
              ...snapshot,
              instrument: {
                ...updateInstrumentPrice(snapshot.instrument, Number(data.trade_price), Number(data.signed_change_rate) * 100),
                volume24h: Number(data.acc_trade_volume_24h),
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
        })()
      },
    })
    socket.connect()
    return () => socket.close()
  },
}
