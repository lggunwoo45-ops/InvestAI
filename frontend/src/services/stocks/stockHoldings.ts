export const STOCK_HOLDINGS_KEY = 'investai.stock-holdings.v1'
export interface StockHolding { id: string; symbol: string; name: string; venue: 'kospi' | 'kosdaq'; average: number; quantity: number }
export interface StockHoldingsState { holdings: StockHolding[]; raw: string | null; error: boolean }
export function validStockHolding(value: unknown): value is StockHolding {
  if (!value || typeof value !== 'object') return false
  const row = value as StockHolding
  return typeof row.id === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(row.id) && typeof row.symbol === 'string' && /^\d{6}$/.test(row.symbol) && typeof row.name === 'string' && row.name.length > 0 && row.name.length <= 200
    && ['kospi', 'kosdaq'].includes(row.venue) && Number.isFinite(row.average) && row.average > 0 && Number.isSafeInteger(row.quantity) && row.quantity > 0 && Number.isFinite(row.average * row.quantity)
}
export function readStockHoldings(storage?: Pick<Storage, 'getItem'>): StockHoldingsState {
  let raw: string | null = null
  try {
    storage ??= localStorage
    raw = storage.getItem(STOCK_HOLDINGS_KEY)
    if (raw === null) return { holdings: [], raw, error: false }
    const value = JSON.parse(raw)
    if (value?.version !== 1 || !Array.isArray(value.holdings) || value.holdings.length > 100 || !value.holdings.every(validStockHolding) || new Set(value.holdings.map((row: StockHolding) => row.id)).size !== value.holdings.length) throw new Error('Invalid holdings')
    return { holdings: value.holdings, raw, error: false }
  } catch { return { holdings: [], raw, error: true } }
}
export function writeStockHoldings(holdings: StockHolding[], expectedRaw: string | null, storage?: Storage): StockHoldingsState | null {
  try {
    storage ??= localStorage
    const current = readStockHoldings(storage)
    if (current.error || current.raw !== expectedRaw || holdings.length > 100 || !holdings.every(validStockHolding) || new Set(holdings.map(row => row.id)).size !== holdings.length) return null
    const raw = JSON.stringify({ version: 1, holdings })
    storage.setItem(STOCK_HOLDINGS_KEY, raw)
    return { holdings, raw, error: false }
  } catch { return null }
}
