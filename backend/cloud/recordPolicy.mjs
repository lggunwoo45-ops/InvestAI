export const investmentRecordLimits = Object.freeze({
  'investai.portfolio.v1': 4_000_000,
  'investai.watchlist-account.v1': 1_000_000,
  'investai.scenarios.v1': 200_000,
})

// Bound the stored envelope on the server. Each client also validates the full
// portfolio ledger / review / scenario schema before rendering or editing it.
export function validInvestmentEnvelope(key, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false
  const unique = (rows, field, max) => Array.isArray(rows) && rows.length <= max && rows.every(r => r && typeof r[field] === 'string' && r[field].length > 0 && r[field].length <= 160) && new Set(rows.map(r => r[field])).size === rows.length
  if (key === 'investai.portfolio.v1') return [1, 2].includes(data.version) && unique(data.positions, 'id', 1000)
    && data.positions.every(p => typeof p.averagePrice === 'number' && Number.isFinite(p.averagePrice) && p.averagePrice > 0 && typeof p.quantity === 'number' && Number.isFinite(p.quantity) && p.quantity >= 0 && (!p.ledger || unique(p.ledger.trades, 'id', 1000)))
    && data.positions.reduce((n, p) => n + (p.ledger?.trades.length ?? 0), 0) <= 10000
  if (key === 'investai.watchlist-account.v1') return data.version === 1 && unique(data.watchlists, 'id', 12) && unique(data.items, 'instrumentId', 2000)
    && data.watchlists.every(list => typeof list.name === 'string' && list.name.length <= 160 && typeof list.isDefault === 'boolean' && Array.isArray(list.instrumentIds) && list.instrumentIds.length <= 2000 && list.instrumentIds.every(id => typeof id === 'string' && id.length <= 160))
  if (key === 'investai.scenarios.v1') return data.version === 1 && unique(data.scenarios, 'id', 10) && unique(data.events, 'id', 60)
  return false
}
