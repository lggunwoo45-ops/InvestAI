import { mkdir, open, readFile, rename, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { fingerprint, normalizeRule } from './engine.mjs'
import { validSignalWatch } from './signalWatch.mjs'
import { validConnection } from './positions.mjs'
import { validVault } from './credentialVault.mjs'

const positive = n => typeof n === 'number' && Number.isFinite(n) && n > 0
const quote = q => q === null || (q && positive(q.price) && positive(q.at) && positive(q.receivedAt))
const kinds = ['entry', 'target', 'stop', 'timeout', 'expired', 'unresolved', 'cancelled']
const validEvent = e => e && typeof e.id === 'string' && kinds.includes(e.kind) && positive(e.at) && (e.price === null || positive(e.price)) && (e.sourceAt === null || positive(e.sourceAt)) && typeof e.detail === 'string' && ['off', 'pending', 'sent', 'uncertain'].includes(e.delivery?.status) && Number.isInteger(e.delivery.attempts) && e.delivery.attempts >= 0

/** One writer per directory; atomic replacement never discards unreadable existing data. */
export async function openStore(directory) {
  await mkdir(directory, { recursive: true })
  const lockPath = join(directory, 'writer.lock'), file = join(directory, 'ledger.json')
  let lock
  try { lock = await open(lockPath, 'wx') } catch (error) {
    if (error.code !== 'EEXIST') throw error
    let owner
    try { owner = JSON.parse(await readFile(lockPath, 'utf8')) } catch { throw new Error('감시 잠금 파일을 확인할 수 없습니다. 기존 파일을 보존했습니다.') }
    if (!Number.isInteger(owner.pid) || owner.pid < 1) throw new Error('감시 잠금 정보가 올바르지 않습니다.')
    try { process.kill(owner.pid, 0); throw new Error('다른 감시 프로그램이 이미 실행 중입니다.') } catch (e) { if (e.code !== 'ESRCH') throw e }
    await unlink(lockPath)
    lock = await open(lockPath, 'wx')
  }
  await lock.writeFile(JSON.stringify({ pid: process.pid }))
  const close = async () => { await lock.close(); await unlink(lockPath).catch(() => {}) }
  let data = { version: 1, rules: [] }
  try {
    const raw = await readFile(file, 'utf8')
    if (raw.length > 5_000_000) throw new Error('저장 한도를 초과했습니다.')
    data = JSON.parse(raw)
    if (data.vault !== undefined && !validVault(data.vault)) throw new Error('키 보관함 구조 오류')
    if (data.connections !== undefined && (!Array.isArray(data.connections) || data.connections.length > 8 || new Set(data.connections.map(c => c.id)).size !== data.connections.length || !data.connections.every(validConnection))) throw new Error('포지션 연결 기록 구조 오류')
    const privateConnections = (data.connections ?? []).filter(c => ['binance', 'bybit'].includes(c.config.venue))
    if (privateConnections.length !== (data.vault?.items.length ?? 0) || privateConnections.some(c => !data.vault?.items.some(i => i.id === c.config.account && i.venue === c.config.venue)) || new Set(privateConnections.map(c => c.config.account)).size !== privateConnections.length) throw new Error('키 보관함 연결 불일치')
    if (data.signals !== undefined && (!Array.isArray(data.signals) || data.signals.length > 40 || new Set(data.signals.map(r => r.id)).size !== data.signals.length || !data.signals.every(validSignalWatch))) throw new Error('신호 감시 기록 구조 오류')
    if (data.version !== 1 || !Array.isArray(data.rules) || data.rules.length > 200 || new Set(data.rules.map(r => r.id)).size !== data.rules.length || new Set(data.rules.map(r => r.config.requestId)).size !== data.rules.length) throw new Error('기록 구조 오류')
    for (const r of data.rules) {
      if (fingerprint(normalizeRule(r.config)) !== r.hash || typeof r.id !== 'string' || !['waiting', 'tracking', 'closed'].includes(r.phase) || !Array.isArray(r.events) || r.events.length > 10 || !r.events.every(validEvent) || !positive(r.createdAt) || !quote(r.last) || !quote(r.entered) || !Number.isInteger(r.gaps) || r.gaps < 0 || (r.phase === 'tracking' && !r.entered)) throw new Error('기록 검증 오류')
      if (r.phase === 'closed' && (!r.result || !kinds.slice(1).includes(r.result.kind) || !positive(r.result.at) || ![r.result.netPercent, r.result.grossPercent].every(n => n === null || typeof n === 'number' && Number.isFinite(n)))) throw new Error('결과 검증 오류')
    }
  } catch (e) { if (e.code !== 'ENOENT') { await close(); throw new Error('감시 기록을 읽을 수 없습니다. 원본 파일을 보존했습니다.') } }
  return { data, close, async save(next) {
    const raw = JSON.stringify(next)
    if (raw.length > 5_000_000) throw new Error('감시 기록 저장 한도에 도달했습니다.')
    const temporary = `${file}.next`
    const handle = await open(temporary, 'w')
    try { await handle.writeFile(raw); await handle.sync() } finally { await handle.close() }
    await rename(temporary, file)
  } }
}
