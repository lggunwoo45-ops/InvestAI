import { binanceMarketDataProvider } from '@/services/market/providers/BinanceMarketDataProvider'
import { binanceSpotMarketDataProvider } from '@/services/market/providers/BinanceMarketDataProvider'
import { mockMarketDataProvider } from '@/services/market/providers/MockMarketDataProvider'
import { upbitMarketDataProvider } from '@/services/market/providers/UpbitMarketDataProvider'
import { binanceCatalogProvider } from '@/services/market/explorer/BinanceCatalogProvider'
import { mockCryptoCatalogProvider } from '@/services/market/explorer/MockCryptoCatalogProvider'
import { stockCatalogProvider } from '@/services/market/explorer/StockCatalogProvider'
import { upbitCatalogProvider } from '@/services/market/explorer/UpbitCatalogProvider'
import type { MarketCatalogProvider } from '@/services/market/explorer/MarketCatalogProvider'
import type { RealtimeMarketProvider } from '@/services/market/contracts/RealtimeMarketProvider'
import type { MarketCatalog, MarketDataMode, MarketInstrument, MarketSectionData, MarketVenue } from '@/types/market'
import type { ChartTimeframe, RealtimeMarketState } from '@/types/marketDetail'
import { getRememberedInstrument, rememberInstrument } from './instrumentRegistry'
import { SharedRequests } from './sharedRequests'
import { ChartHistoryCache } from './chartHistoryCache'
import { upbitRelayBase } from './providers/upbitRelay'

export interface MarketOverviewService {
  getMarketOverview(): Promise<readonly MarketSectionData[]>
}

export interface MarketStreamOptions {
  instrument: MarketInstrument
  timeframe: ChartTimeframe
  mode: MarketDataMode
  onState: (state: RealtimeMarketState) => void
  /** Selected chart > analysis > background monitoring. Does not change pacing. */
  priority?: number
}

interface StreamSession {
  listeners: Set<{ onState: MarketStreamOptions['onState']; priority: number }>
  state: RealtimeMarketState | null
  stop: () => void
  idleTimer: ReturnType<typeof setTimeout> | null
}

const UPBIT_NAVIGATION_GRACE_MS = 30_000
const MAX_IDLE_STREAMS = 3 // At most one analysis's three timeframes stay warm.

const mockMarketSections: readonly MarketSectionData[] = [
  {
    id: 'upbit',
    name: 'Upbit',
    description: 'KRW spot market',
    sessionLabel: '24H market',
    instruments: [
      { id: 'upbit-btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 148_721_000, change24hPercent: 2.34, volume24h: 178_420_000_000 },
      { id: 'upbit-eth', marketId: 'upbit', symbol: 'ETH/KRW', name: 'Ethereum', quoteCurrency: 'KRW', lastPrice: 5_284_000, change24hPercent: 1.18, volume24h: 94_810_000_000 },
      { id: 'upbit-xrp', marketId: 'upbit', symbol: 'XRP/KRW', name: 'XRP', quoteCurrency: 'KRW', lastPrice: 4_126, change24hPercent: -0.72, volume24h: 68_330_000_000 },
      { id: 'upbit-sol', marketId: 'upbit', symbol: 'SOL/KRW', name: 'Solana', quoteCurrency: 'KRW', lastPrice: 287_400, change24hPercent: 3.86, volume24h: 42_690_000_000 },
      { id: 'upbit-ada', marketId: 'upbit', symbol: 'ADA/KRW', name: 'Cardano', quoteCurrency: 'KRW', lastPrice: 1_187, change24hPercent: -1.06, volume24h: 17_520_000_000 },
    ],
  },
  {
    id: 'binance-futures',
    name: 'Binance Futures',
    description: 'USDT perpetuals',
    sessionLabel: '24H market',
    instruments: [
      { id: 'binance-btc', marketId: 'binance-futures', symbol: 'BTCUSDT', name: 'Bitcoin Perpetual', quoteCurrency: 'USDT', lastPrice: 104_382.6, change24hPercent: 2.11, volume24h: 18_720_000_000 },
      { id: 'binance-eth', marketId: 'binance-futures', symbol: 'ETHUSDT', name: 'Ethereum Perpetual', quoteCurrency: 'USDT', lastPrice: 3_708.42, change24hPercent: 1.42, volume24h: 9_840_000_000 },
      { id: 'binance-sol', marketId: 'binance-futures', symbol: 'SOLUSDT', name: 'Solana Perpetual', quoteCurrency: 'USDT', lastPrice: 201.76, change24hPercent: 4.08, volume24h: 3_260_000_000 },
      { id: 'binance-bnb', marketId: 'binance-futures', symbol: 'BNBUSDT', name: 'BNB Perpetual', quoteCurrency: 'USDT', lastPrice: 643.91, change24hPercent: -0.31, volume24h: 1_180_000_000 },
      { id: 'binance-doge', marketId: 'binance-futures', symbol: 'DOGEUSDT', name: 'Dogecoin Perpetual', quoteCurrency: 'USDT', lastPrice: 0.2738, change24hPercent: -1.54, volume24h: 924_000_000 },
    ],
  },
  {
    id: 'korea-stock',
    name: 'Korea Stock',
    description: 'KOSPI · KOSDAQ',
    sessionLabel: 'Market closed',
    instruments: [
      { id: 'krx-005930', marketId: 'korea-stock', symbol: '005930', name: 'Samsung Electronics', quoteCurrency: 'KRW', lastPrice: 72_800, change24hPercent: 0.83, volume24h: 14_218_450 },
      { id: 'krx-000660', marketId: 'korea-stock', symbol: '000660', name: 'SK hynix', quoteCurrency: 'KRW', lastPrice: 198_500, change24hPercent: 2.06, volume24h: 4_826_190 },
      { id: 'krx-373220', marketId: 'korea-stock', symbol: '373220', name: 'LG Energy Solution', quoteCurrency: 'KRW', lastPrice: 401_000, change24hPercent: -0.62, volume24h: 392_840 },
      { id: 'krx-005380', marketId: 'korea-stock', symbol: '005380', name: 'Hyundai Motor', quoteCurrency: 'KRW', lastPrice: 246_500, change24hPercent: 1.23, volume24h: 681_220 },
      { id: 'krx-035420', marketId: 'korea-stock', symbol: '035420', name: 'NAVER', quoteCurrency: 'KRW', lastPrice: 214_000, change24hPercent: -1.38, volume24h: 742_910 },
    ],
  },
  {
    id: 'us-stock',
    name: 'US Stock',
    description: 'NYSE · NASDAQ',
    sessionLabel: 'Pre-market',
    instruments: [
      { id: 'us-nvda', marketId: 'us-stock', symbol: 'NVDA', name: 'NVIDIA', quoteCurrency: 'USD', lastPrice: 181.42, change24hPercent: 1.92, volume24h: 182_640_000 },
      { id: 'us-aapl', marketId: 'us-stock', symbol: 'AAPL', name: 'Apple', quoteCurrency: 'USD', lastPrice: 234.86, change24hPercent: -0.28, volume24h: 48_310_000 },
      { id: 'us-msft', marketId: 'us-stock', symbol: 'MSFT', name: 'Microsoft', quoteCurrency: 'USD', lastPrice: 514.27, change24hPercent: 0.67, volume24h: 21_780_000 },
      { id: 'us-tsla', marketId: 'us-stock', symbol: 'TSLA', name: 'Tesla', quoteCurrency: 'USD', lastPrice: 347.15, change24hPercent: -2.14, volume24h: 96_540_000 },
      { id: 'us-amzn', marketId: 'us-stock', symbol: 'AMZN', name: 'Amazon', quoteCurrency: 'USD', lastPrice: 226.73, change24hPercent: 0.39, volume24h: 35_120_000 },
    ],
  },
]

const liveProviders: readonly RealtimeMarketProvider[] = [upbitMarketDataProvider, binanceSpotMarketDataProvider, binanceMarketDataProvider]
const catalogProviders: readonly MarketCatalogProvider[] = [stockCatalogProvider, mockCryptoCatalogProvider, upbitCatalogProvider, binanceCatalogProvider]

/**
 * Single market-data facade. UI code never selects an exchange adapter or owns a
 * WebSocket; future providers register here and continue emitting normalized data.
 */
export class MarketDataService implements MarketOverviewService {
  private readonly catalogCache = new Map<string, { value: MarketCatalog; expiresAt: number }>()
  private readonly catalogPending = new SharedRequests<readonly MarketCatalog[]>()
  private readonly instrumentIndex = new Map<string, MarketInstrument>()
  private readonly streams = new Map<string, StreamSession>()
  private readonly idleStreams = new Map<string, StreamSession>()
  private readonly chartHistory = new ChartHistoryCache()

  constructor(
    private readonly providers: readonly RealtimeMarketProvider[] = liveProviders,
    private readonly mockProvider: RealtimeMarketProvider = mockMarketDataProvider,
    private readonly explorerProviders: readonly MarketCatalogProvider[] = catalogProviders,
  ) {}

  async getMarketOverview() {
    return Promise.resolve(mockMarketSections)
  }

  /** Fast path for navigation and offline use; selected identities survive reload. */
  getKnownInstruments(ids: readonly string[]): Map<string, MarketInstrument> {
    const wanted = new Set(ids)
    const result = new Map<string, MarketInstrument>()
    for (const section of mockMarketSections) for (const item of section.instruments) if (wanted.has(item.id)) result.set(item.id, item)
    for (const id of wanted) {
      const remembered = getRememberedInstrument(id)
      if (remembered) result.set(id, remembered)
    }
    for (const id of wanted) {
      const indexed = this.instrumentIndex.get(id)
      if (indexed) result.set(id, indexed)
    }
    return result
  }

  /** Resolve persisted IDs through the same provider catalogs used by Explorer. */
  async resolveInstruments(ids: readonly string[], mode: MarketDataMode): Promise<Map<string, MarketInstrument>> {
    const wanted = new Set(ids)
    const result = this.getKnownInstruments(ids)
    if (!wanted.size) return result
    const venues = new Set<MarketVenue>()
    for (const id of wanted) {
      if (id.startsWith('upbit-btc-')) venues.add('upbit-btc')
      else if (id.startsWith('upbit-usdt-')) venues.add('upbit-usdt')
      else if (id.startsWith('upbit-')) venues.add('upbit-krw')
      else if (id.startsWith('binance-spot-')) venues.add('binance-spot')
      else if (id.startsWith('binance-')) venues.add('binance-futures')
      else if (id.startsWith('krx-')) { venues.add('kospi'); venues.add('kosdaq') }
      else if (id.startsWith('us-')) { venues.add('nasdaq'); venues.add('nyse') }
    }
    await Promise.allSettled([...venues].map(async (venue) => {
      const catalog = await this.getMarketCatalog(venue, mode)
      for (const instrument of catalog.instruments) if (wanted.has(instrument.id)) result.set(instrument.id, instrument)
    }))
    return result
  }

  /** The only entry point for catalog APIs; UI never addresses an exchange directly. */
  getMarketCatalog(venue: MarketVenue, mode: MarketDataMode, force = false, signal?: AbortSignal): Promise<MarketCatalog> {
    if (signal?.aborted) return Promise.reject(new DOMException('Catalog request aborted', 'AbortError'))
    const key = `${mode}:${venue}`
    const cached = this.catalogCache.get(key)
    if (!force && cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.value)
    const provider = this.explorerProviders.find((candidate) => candidate.supports(venue, mode))
    if (!provider) return Promise.reject(new Error(`No catalog provider for ${venue}`))
    const requestKey = provider.loadAll ? `${mode}:all:${provider.id}` : key
    return this.catalogPending.run(requestKey, async sharedSignal => {
      const catalogs = provider.loadAll
        ? await provider.loadAll(sharedSignal)
        : [await provider.load(venue, sharedSignal)]
      sharedSignal.throwIfAborted()
      for (const catalog of catalogs) {
        this.catalogCache.set(`${mode}:${catalog.venue}`, { value: catalog, expiresAt: catalog.fetchedAt + (catalog.source === 'live' ? 60_000 : 3_600_000) })
        for (const instrument of catalog.instruments) this.instrumentIndex.set(instrument.id, instrument)
      }
      return catalogs
    }, signal).then(catalogs => {
      const catalog = catalogs.find(item => item.venue === venue)
      if (!catalog) throw new Error(`Catalog response missing ${venue}`)
      return catalog
    })
  }

  rememberInstrument = rememberInstrument

  /** Display-only recovery data. Never returned as a successful fresh catalog. */
  getRecentCatalog(venue: MarketVenue, mode: MarketDataMode): MarketCatalog | null {
    const cached = this.catalogCache.get(`${mode}:${venue}`)?.value
    const age = cached ? Date.now() - cached.fetchedAt : Infinity
    return cached && age >= 0 && age <= 300_000 ? cached : null
  }

  getChartPreview(instrument: MarketInstrument, timeframe: ChartTimeframe, mode: MarketDataMode) {
    return mode === 'live' ? this.chartHistory.get(instrument, timeframe) : null
  }

  subscribe({ instrument, timeframe, mode, onState, priority = 10 }: MarketStreamOptions): () => void {
    const key = JSON.stringify([mode, instrument.id, instrument.marketId, instrument.providerType, instrument.providerSymbol, instrument.quoteCurrency, timeframe])
    const listener = { onState, priority }
    let session = this.streams.get(key)
    if (session) {
      if (session.idleTimer !== null) clearTimeout(session.idleTimer)
      session.idleTimer = null
      this.idleStreams.delete(key)
      session.listeners.add(listener)
      if (session.state) onState(session.state) // Preserve original receipt/exchange times.
    } else {
      session = { listeners: new Set([listener]), state: null, stop: () => {}, idleTimer: null }
      this.streams.set(key, session)
      const owned = session
      owned.stop = this.startSubscription({ instrument, timeframe, mode, onState: state => {
        owned.state = state
        // Background retention must not create recovery requests for an abandoned page.
        if (!owned.listeners.size && state.connection.status !== 'live') {
          this.closeStream(key, owned)
          return
        }
        for (const subscriber of owned.listeners) subscriber.onState(state)
      } }, () => Math.max(0, ...[...owned.listeners].map(item => item.priority)))
    }
    const owned = session
    let released = false
    return () => {
      if (released) return
      released = true
      owned.listeners.delete(listener)
      if (owned.listeners.size) return
      // Relay reconnection is cheap. Release unused SSE feeds immediately so
      // retained pages cannot occupy the browser's HTTP connection slots.
      if (instrument.marketId !== 'upbit' || mode !== 'live' || owned.state?.connection.status !== 'live' || upbitRelayBase()) {
        this.closeStream(key, owned)
        return
      }
      // Keep the live feed (not a frozen snapshot) briefly across route navigation.
      owned.idleTimer = setTimeout(() => this.closeStream(key, owned), UPBIT_NAVIGATION_GRACE_MS)
      this.idleStreams.set(key, owned)
      while (this.idleStreams.size > MAX_IDLE_STREAMS) {
        const [oldKey, oldSession] = this.idleStreams.entries().next().value!
        this.closeStream(oldKey, oldSession)
      }
    }
  }

  private closeStream(key: string, session: StreamSession) {
    if (this.streams.get(key) !== session) return
    this.streams.delete(key)
    this.idleStreams.delete(key)
    if (session.idleTimer !== null) clearTimeout(session.idleTimer)
    session.stop()
  }

  private startSubscription({ instrument, timeframe, mode, onState }: MarketStreamOptions, priority: () => number): () => void {
    const liveProvider = this.providers.find((provider) => provider.supports(instrument))
    const provider = mode === 'live' && liveProvider ? liveProvider : this.mockProvider
    const effectiveMode: MarketDataMode = provider === this.mockProvider ? 'mock' : 'live'
    const isFallback = mode === 'live' && effectiveMode === 'mock'
    let disposed = false
    let stopProvider: (() => void) | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryAttempt = 0
    let requestController: AbortController | null = null
    let currentState: RealtimeMarketState = {
      snapshot: null,
      connection: {
        requestedMode: mode,
        effectiveMode,
        status: effectiveMode === 'mock' ? 'mock' : 'connecting',
        provider: provider.id,
        reconnectAttempt: 0,
        lastUpdatedAt: null,
        message: isFallback ? 'Live data is unavailable for this market. Showing mock data.' : effectiveMode === 'mock' ? 'Deterministic simulation is active.' : 'Connecting to real-time market data…',
      },
    }

    const emit = (nextState: RealtimeMarketState) => {
      if (disposed) return
      currentState = nextState
      onState(nextState)
    }

    const start = () => {
      emit({
        ...currentState,
        connection: {
          ...currentState.connection,
          status: effectiveMode === 'mock' ? 'mock' : retryAttempt > 0 ? 'reconnecting' : 'connecting',
          reconnectAttempt: retryAttempt,
        },
      })

      requestController = new AbortController()
      provider.loadSnapshot(instrument, timeframe, requestController.signal, priority)
        .then((snapshot) => {
          if (disposed) return
          if (effectiveMode === 'live') this.chartHistory.put(snapshot)
          retryAttempt = 0
          emit({
            snapshot,
            connection: {
              ...currentState.connection,
              status: effectiveMode === 'mock' ? 'mock' : 'connecting',
              reconnectAttempt: 0,
              lastUpdatedAt: Date.now(),
              message: isFallback ? 'Live data is unavailable for this market. Showing mock data.' : effectiveMode === 'mock' ? 'Deterministic simulation is active.' : 'Snapshot loaded. Opening live stream…',
            },
          })
          stopProvider = provider.subscribe(instrument, timeframe, snapshot, (event) => {
            const nextStatus = event.status ?? currentState.connection.status
            emit({
              snapshot: event.snapshot ?? currentState.snapshot,
              connection: {
                ...currentState.connection,
                status: effectiveMode === 'mock' ? 'mock' : nextStatus,
                reconnectAttempt: event.reconnectAttempt ?? currentState.connection.reconnectAttempt,
                marketTime: event.marketTime ?? currentState.connection.marketTime,
                lastUpdatedAt: event.quoteUpdatedAt === undefined
                  ? event.snapshot ? Date.now() : currentState.connection.lastUpdatedAt
                  : event.quoteUpdatedAt ?? currentState.connection.lastUpdatedAt,
                message: isFallback
                  ? 'Live data is unavailable for this market. Showing mock data.'
                  : event.message ?? this.statusMessage(nextStatus, event.reconnectAttempt ?? 0),
              },
            })
          }, priority)
        })
        .catch(() => {
          if (disposed) return
          retryAttempt += 1
          const delay = Math.min(1_000 * (2 ** (retryAttempt - 1)), 30_000)
          emit({
            ...currentState,
            connection: {
              ...currentState.connection,
              status: effectiveMode === 'live' ? 'reconnecting' : 'disconnected',
              reconnectAttempt: retryAttempt,
              message: effectiveMode === 'live' ? `Snapshot unavailable. Retrying in ${Math.round(delay / 1_000)}s…` : 'Mock market data is unavailable.',
            },
          })
          if (!disposed && effectiveMode === 'live') retryTimer = setTimeout(start, delay)
        })
    }

    onState(currentState)
    start()

    return () => {
      disposed = true
      requestController?.abort()
      if (retryTimer) clearTimeout(retryTimer)
      stopProvider?.()
    }
  }

  private statusMessage(status: RealtimeMarketState['connection']['status'], attempt: number): string {
    if (status === 'live') return 'Real-time synchronization active.'
    if (status === 'reconnecting') return `Connection interrupted. Reconnect attempt ${attempt}…`
    if (status === 'disconnected') return 'Market stream disconnected.'
    if (status === 'mock') return 'Deterministic simulation is active.'
    return 'Connecting to real-time market data…'
  }
}

export const marketDataService = new MarketDataService()
