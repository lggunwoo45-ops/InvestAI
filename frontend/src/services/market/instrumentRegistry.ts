import type { MarketInstrument } from '@/types/market'

const STORAGE_KEY = 'investai.instrument-registry.v1'
const MAX_REMEMBERED = 100
const remembered = new Map<string, MarketInstrument>()
let hydrated = false

function isInstrument(value: unknown): value is MarketInstrument {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<MarketInstrument>
  return typeof item.id === 'string' && typeof item.marketId === 'string'
    && typeof item.symbol === 'string' && typeof item.name === 'string'
    && typeof item.quoteCurrency === 'string'
    && [item.lastPrice, item.change24hPercent, item.volume24h].every((number) => typeof number === 'number' && Number.isFinite(number))
}

function hydrate() {
  if (hydrated) return
  hydrated = true
  try {
    const payload: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (!payload || typeof payload !== 'object') return
    const stored = payload as { schemaVersion?: unknown; instruments?: unknown }
    if (stored.schemaVersion !== 1 || !Array.isArray(stored.instruments)) return
    for (const item of stored.instruments.slice(-MAX_REMEMBERED)) if (isInstrument(item)) remembered.set(item.id, item)
  } catch { /* Storage may be unavailable or corrupt; catalog lookup still works. */ }
}

/** Persist only user-touched identities, never entire exchange catalogs. */
export function rememberInstrument(instrument: MarketInstrument) {
  if (!isInstrument(instrument)) return
  hydrate()
  remembered.delete(instrument.id)
  remembered.set(instrument.id, instrument)
  while (remembered.size > MAX_REMEMBERED) remembered.delete(remembered.keys().next().value!)
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, instruments: [...remembered.values()] })) } catch { /* In-memory resolution remains available. */ }
}

export function getRememberedInstrument(id: string): MarketInstrument | undefined {
  hydrate()
  return remembered.get(id)
}
