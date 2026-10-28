import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { randomUUID } from 'node:crypto'
export const HOUR = 3600000
export function createLiquidationArchive({ directory, assets, now = Date.now } = {}) {
  if (directory && !isAbsolute(directory)) throw new Error('invalid_archive_directory')
  if (directory) mkdirSync(directory, { recursive: true })
  const db = new DatabaseSync(directory ? join(directory, 'liquidations.sqlite') : ':memory:')
  db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=2000; CREATE TABLE IF NOT EXISTS buckets(asset TEXT, at INTEGER, longs REAL, shorts REAL, count INTEGER, PRIMARY KEY(asset,at)); CREATE TABLE IF NOT EXISTS coverage(at INTEGER PRIMARY KEY, milliseconds INTEGER); CREATE TABLE IF NOT EXISTS seen(hash TEXT PRIMARY KEY, at INTEGER); CREATE TABLE IF NOT EXISTS lease(id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT, until INTEGER);')
  const owner = randomUUID()
  const acquire = () => { const at = now(); db.prepare('INSERT INTO lease VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner, until=excluded.until WHERE lease.owner=? OR lease.until<=?').run(owner, at + 60000, owner, at); return db.prepare('SELECT owner FROM lease WHERE id=1').get()?.owner === owner }
  const owned = () => { if (!acquire()) throw new Error('archive_collector_busy') }
  const prune = () => { const at = now(); const cutoff = Math.floor(at / HOUR) * HOUR - 7 * 24 * HOUR; db.prepare('DELETE FROM buckets WHERE at<?').run(cutoff); db.prepare('DELETE FROM coverage WHERE at<?').run(cutoff); db.prepare('DELETE FROM seen WHERE at<?').run(at - 15 * 60000) }
  return {
    acquire,
    cover(from, to) {
      owned()
      if (![from, to].every(Number.isSafeInteger) || to < from || to - from > 60000) return
      for (let at = from; at < to;) { const bucket = Math.floor(at / HOUR) * HOUR, end = Math.min(to, bucket + HOUR); db.prepare('INSERT INTO coverage VALUES(?,?) ON CONFLICT(at) DO UPDATE SET milliseconds=MIN(?,coverage.milliseconds+excluded.milliseconds)').run(bucket, end - at, HOUR); at = end }
    },
    append(hash, events) {
      owned(); db.exec('BEGIN IMMEDIATE')
      try {
        if (!db.prepare('INSERT OR IGNORE INTO seen VALUES(?,?)').run(hash, now()).changes) { db.exec('COMMIT'); return }
        for (const e of events) {
          if (!assets.includes(e.asset) || !['long', 'short'].includes(e.side) || !Number.isSafeInteger(e.at) || !Number.isFinite(e.notional) || e.notional <= 0 || e.notional > 1e18) throw new Error('invalid_archive_event')
          db.prepare('INSERT INTO buckets VALUES(?,?,?,?,1) ON CONFLICT(asset,at) DO UPDATE SET longs=buckets.longs+excluded.longs, shorts=buckets.shorts+excluded.shorts, count=buckets.count+1').run(e.asset, Math.floor(e.at / HOUR) * HOUR, e.side === 'long' ? e.notional : 0, e.side === 'short' ? e.notional : 0)
        }
        prune(); db.exec('COMMIT')
      } catch (e) { db.exec('ROLLBACK'); throw e }
    },
    snapshot(asset, hours) {
      if (!assets.includes(asset) || ![24, 168].includes(hours)) throw new Error('invalid_archive_query')
      prune(); const fetchedAt = now(), to = Math.floor(fetchedAt / HOUR) * HOUR, from = to - hours * HOUR
      const buckets = new Map(db.prepare('SELECT * FROM buckets WHERE asset=? AND at>=? AND at<?').all(asset, from, to).map(r => [r.at, r]))
      const coverage = new Map(db.prepare('SELECT * FROM coverage WHERE at>=? AND at<?').all(from, to).map(r => [r.at, r.milliseconds]))
      const rows = Array.from({ length: hours }, (_, i) => { const at = from + i * HOUR, b = buckets.get(at), coveredMs = coverage.get(at) ?? 0; return { at, coveredMs, count: b?.count ?? (coveredMs ? 0 : null), long: b?.longs ?? (coveredMs ? 0 : null), short: b?.shorts ?? (coveredMs ? 0 : null) } })
      return { version: 1, asset, source: 'Bybit USDT linear', fetchedAt, from, to, hours, persistent: !!directory, retentionDays: 7, rows }
    },
    close() { db.prepare('DELETE FROM lease WHERE owner=?').run(owner); db.close() },
  }
}
