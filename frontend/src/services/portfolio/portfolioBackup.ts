import { validPortfolioData, type PortfolioState, type Position } from './portfolioStorage'

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024
export interface PortfolioBackup { format: 'investai.portfolio.backup'; version: 1; createdAt: string; portfolio: { version: 1 | 2; positions: Position[] } }
export function createPortfolioBackup(state: PortfolioState, now = new Date()): string {
  if (state.error || !validPortfolioData({ version: 2, positions: state.positions })) throw new Error('backup')
  const text = JSON.stringify({ format: 'investai.portfolio.backup', version: 1, createdAt: now.toISOString(), portfolio: { version: 2, positions: state.positions } }, null, 2)
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('size')
  return text
}
export function parsePortfolioBackup(text: string): PortfolioBackup {
  if (new Blob([text]).size > MAX_BACKUP_BYTES) throw new Error('size')
  const data = JSON.parse(text) as PortfolioBackup
  if (!data || data.format !== 'investai.portfolio.backup' || data.version !== 1
    || typeof data.createdAt !== 'string' || !Number.isFinite(Date.parse(data.createdAt)) || !validPortfolioData(data.portfolio)) throw new Error('backup')
  return data
}

/** Restore is additive: never replace an existing holding or silently duplicate an ID. */
export function mergePortfolioBackup(current: Position[], incoming: Position[]) {
  const merged = [...current]
  const ids = new Map(current.map(p => [p.id, p]))
  let added = 0
  let skipped = 0
  // Compare canonical JSON keys, so property ordering in edited/exported files is immaterial.
  const canonical = (value: unknown): string => {
    if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
    if (value !== null && typeof value === 'object') return `{${Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`
    return JSON.stringify(value)
  }
  if (!validPortfolioData({ version: 2, positions: current }) || !validPortfolioData({ version: 2, positions: incoming })) throw new Error('backup')
  for (const position of incoming) {
    const existing = ids.get(position.id)
    if (existing) {
      if (canonical(existing) !== canonical(position)) throw new Error('conflict')
      skipped++
    } else { merged.push(position); ids.set(position.id, position); added++ }
  }
  if (!validPortfolioData({ version: 2, positions: merged })) throw new Error('limit')
  return { positions: merged, added, skipped }
}
