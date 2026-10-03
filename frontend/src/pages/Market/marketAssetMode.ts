import { venueForStockId } from '@/services/market/explorer/StockCatalogProvider'
import type { MarketGroup, MarketInstrument, MarketVenue } from '@/types/market'

export type MarketAssetMode = MarketGroup

export const MARKET_ASSET_MODE_STORAGE_KEY = 'market-copilot.marketAssetMode.v1'
export const LAST_MARKET_INSTRUMENT_STORAGE_KEY = 'market-copilot.lastMarketInstrumentByAsset.v1'

const modes: readonly MarketAssetMode[] = ['crypto', 'korea', 'us']

export const defaultVenueByAssetMode: Readonly<Record<MarketAssetMode, MarketVenue>> = {
  crypto: 'upbit-krw',
  korea: 'kospi',
  us: 'nasdaq',
}

export type LastMarketInstrumentIds = Partial<Record<MarketAssetMode, string>>

interface StoredLastMarketInstruments {
  schemaVersion: 1
  instrumentIds: LastMarketInstrumentIds
}

function isAssetMode(value: unknown): value is MarketAssetMode {
  return typeof value === 'string' && modes.includes(value as MarketAssetMode)
}

function storageOrUndefined(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function loadMarketAssetMode(storage = storageOrUndefined()): MarketAssetMode {
  if (!storage) return 'crypto'
  try {
    const value = storage.getItem(MARKET_ASSET_MODE_STORAGE_KEY)
    if (value === null) return 'crypto'
    if (isAssetMode(value)) return value
    storage.removeItem(MARKET_ASSET_MODE_STORAGE_KEY)
  } catch {
    // Storage failures must not stop the Market workspace from rendering.
  }
  return 'crypto'
}

export function saveMarketAssetMode(mode: MarketAssetMode, storage = storageOrUndefined()) {
  if (!storage) return
  try {
    storage.setItem(MARKET_ASSET_MODE_STORAGE_KEY, mode)
  } catch {
    // The current session remains usable when persistence is unavailable.
  }
}

function validInstrumentIds(value: unknown): value is LastMarketInstrumentIds {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return Object.keys(record).every((key) => isAssetMode(key) && typeof record[key] === 'string' && record[key].length > 0)
}

export function loadLastMarketInstrumentIds(storage = storageOrUndefined()): LastMarketInstrumentIds {
  if (!storage) return {}
  try {
    const raw = storage.getItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY)
    if (raw === null) return {}
    const parsed = JSON.parse(raw) as Partial<StoredLastMarketInstruments>
    if (parsed?.schemaVersion === 1 && validInstrumentIds(parsed.instrumentIds)) return { ...parsed.instrumentIds }
    storage.removeItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY)
  } catch {
    try { storage.removeItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY) } catch { /* Ignore restricted storage. */ }
  }
  return {}
}

export function saveLastMarketInstrumentIds(instrumentIds: LastMarketInstrumentIds, storage = storageOrUndefined()) {
  if (!storage || !validInstrumentIds(instrumentIds)) return
  try {
    const payload: StoredLastMarketInstruments = { schemaVersion: 1, instrumentIds }
    storage.setItem(LAST_MARKET_INSTRUMENT_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // The current session remains usable when persistence is unavailable.
  }
}

export function assetModeForVenue(venue: MarketVenue): MarketAssetMode {
  if (venue.startsWith('upbit-') || venue.startsWith('binance-')) return 'crypto'
  return venue === 'kospi' || venue === 'kosdaq' ? 'korea' : 'us'
}

export function assetModeForInstrument(instrument: MarketInstrument): MarketAssetMode {
  if (instrument.marketId === 'upbit' || instrument.marketId === 'binance-spot' || instrument.marketId === 'binance-futures') return 'crypto'
  return instrument.marketId === 'korea-stock' ? 'korea' : 'us'
}

export function venueForPersistedInstrumentId(instrumentId: string): MarketVenue | undefined {
  if (instrumentId === 'upbit-btc' || (instrumentId.startsWith('upbit-') && !instrumentId.startsWith('upbit-btc-') && !instrumentId.startsWith('upbit-usdt-'))) return 'upbit-krw'
  if (instrumentId.startsWith('upbit-btc-')) return 'upbit-btc'
  if (instrumentId.startsWith('upbit-usdt-')) return 'upbit-usdt'
  if (instrumentId.startsWith('binance-spot-')) return 'binance-spot'
  if (instrumentId.startsWith('binance-')) return 'binance-futures'
  return venueForStockId(instrumentId)
}

export function isSelectableMarketInstrument(instrument: MarketInstrument): boolean {
  return instrument.id.length > 0
    && instrument.symbol.length > 0
    && Number.isFinite(instrument.lastPrice)
    && instrument.lastPrice > 0
}

export function selectDefaultInstrument(mode: MarketAssetMode, instruments: readonly MarketInstrument[]): MarketInstrument | undefined {
  const selectable = instruments.filter(isSelectableMarketInstrument)
  const preferred = mode === 'crypto'
    ? selectable.find((instrument) => instrument.symbol.toUpperCase() === 'BTC/KRW' || instrument.providerSymbol?.toUpperCase() === 'KRW-BTC')
    : mode === 'korea'
      ? selectable.find((instrument) => instrument.symbol === '005930' || instrument.id === 'krx-005930')
      : selectable.find((instrument) => instrument.symbol.toUpperCase() === 'AAPL' || instrument.id === 'us-aapl')
  return preferred ?? selectable[0]
}
