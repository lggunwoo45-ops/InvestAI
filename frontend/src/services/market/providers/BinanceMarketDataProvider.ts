import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { Candle, MarketDetailSnapshot, RecentTrade } from '@/types/marketDetail'
import { ReconnectingWebSocket } from '@/services/market/realtime/ReconnectingWebSocket'
import { applyTrade, buildOrderbookLevels, fetchJson, mergeCandle, updateInstrumentPrice } from './providerUtils'

type BinanceKline = readonly [number, string, string, string, string, string, ...unknown[]]

interface BinanceDepth {
  bids: readonly (readonly [string, string])[]
  asks: readonly (readonly [string, string])[]
}

interface BinanceTrade {
  id: number
  price: string
  qty: string
  time: number
  isBuyerMaker: boolean
}

interface BinanceTicker {
  lastPrice: string
  priceChangePercent: string
  volume: string
}

interface BinanceStreamEnvelope {
  stream: string
  data: Record<string, unknown>
}

const restBaseUrl = 'https://fapi.binance.com'
const socketBaseUrl = 'wss://fstream.binance.com/stream?streams='
const intervalByTimeframe = { '1m': '1m', '5m': '5m', '15m': '15m', '1H': '1h', '4H': '4h', '1D': '1d' } as const

function mapTrade(trade: BinanceTrade): RecentTrade {
  return {
    id: `binance-${trade.id}`,
    timestamp: trade.time,
    price: Number(trade.price),
    amount: Number(trade.qty),
    side: trade.isBuyerMaker ? 'sell' : 'buy',
  }
}

export const binanceMarketDataProvider: RealtimeMarketProvider = {
  id: 'Binance USDⓈ-M Futures',
  supports: (instrument) => instrument.marketId === 'binance-futures',

  async loadSnapshot(instrument, timeframe) {
    const symbol = instrument.symbol.replace('/', '').toUpperCase()
    const interval = intervalByTimeframe[timeframe]
    const [klines, depth, trades, ticker] = await Promise.all([
      fetchJson<readonly BinanceKline[]>(`${restBaseUrl}/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=120`),
      fetchJson<BinanceDepth>(`${restBaseUrl}/fapi/v1/depth?symbol=${symbol}&limit=10`),
      fetchJson<readonly BinanceTrade[]>(`${restBaseUrl}/fapi/v1/trades?symbol=${symbol}&limit=20`),
      fetchJson<BinanceTicker>(`${restBaseUrl}/fapi/v1/ticker/24hr?symbol=${symbol}`),
    ])
    const candles: readonly Candle[] = klines.map((item) => ({
      timestamp: item[0], open: Number(item[1]), high: Number(item[2]), low: Number(item[3]), close: Number(item[4]), volume: Number(item[5]),
    }))
    const asks = buildOrderbookLevels(depth.asks).toReversed()
    const bids = buildOrderbookLevels(depth.bids)
    return {
      instrument: {
        ...updateInstrumentPrice(instrument, Number(ticker.lastPrice), Number(ticker.priceChangePercent)),
        volume24h: Number(ticker.volume),
      },
      timeframe,
      candles,
      orderbook: { symbolId: instrument.id, asks, bids, spread: (asks.at(-1)?.price ?? 0) - (bids[0]?.price ?? 0) },
      recentTrades: trades.map(mapTrade).toSorted((left, right) => right.timestamp - left.timestamp),
    }
  },

  subscribe(instrument, timeframe, initialSnapshot, onEvent) {
    const symbol = instrument.symbol.replace('/', '').toLowerCase()
    const interval = intervalByTimeframe[timeframe]
    let snapshot: MarketDetailSnapshot = initialSnapshot
    const streams = [`${symbol}@kline_${interval}`, `${symbol}@aggTrade`, `${symbol}@depth10@500ms`, `${symbol}@ticker`]
    const socket = new ReconnectingWebSocket({
      createUrl: () => `${socketBaseUrl}${streams.join('/')}`,
      onOpen: () => undefined,
      onStatus: (status, reconnectAttempt) => onEvent({ status, reconnectAttempt }),
      onMessage: (message) => {
        void (async () => {
          const envelope = JSON.parse(String(message.data)) as BinanceStreamEnvelope
          const data = envelope.data

          if (envelope.stream.includes('@aggTrade')) {
            const trade = mapTrade({
              id: Number(data.a), price: String(data.p), qty: String(data.q), time: Number(data.T), isBuyerMaker: Boolean(data.m),
            })
            snapshot = applyTrade(snapshot, trade)
          } else if (envelope.stream.includes('@kline_')) {
            const kline = data.k as Record<string, unknown>
            snapshot = {
              ...snapshot,
              candles: mergeCandle(snapshot.candles, {
                timestamp: Number(kline.t), open: Number(kline.o), high: Number(kline.h), low: Number(kline.l), close: Number(kline.c), volume: Number(kline.v),
              }),
              instrument: updateInstrumentPrice(snapshot.instrument, Number(kline.c)),
            }
          } else if (envelope.stream.includes('@depth')) {
            const asks = buildOrderbookLevels(data.a as readonly (readonly [string, string])[]).toReversed()
            const bids = buildOrderbookLevels(data.b as readonly (readonly [string, string])[])
            snapshot = { ...snapshot, orderbook: { symbolId: instrument.id, asks, bids, spread: (asks.at(-1)?.price ?? 0) - (bids[0]?.price ?? 0) } }
          } else if (envelope.stream.includes('@ticker')) {
            snapshot = {
              ...snapshot,
              instrument: {
                ...updateInstrumentPrice(snapshot.instrument, Number(data.c), Number(data.P)),
                volume24h: Number(data.v),
              },
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
