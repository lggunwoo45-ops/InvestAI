import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, randomUUID, createHash, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const derive = promisify(scrypt)
export const digest = value => createHash('sha256').update(value).digest('hex')
export class CloudError extends Error { constructor(status, message) { super(message); this.status = status } }
export const fail = (status, message) => { throw new CloudError(status, message) }
const passwordValid = value => typeof value === 'string' && value.length >= 15 && value.length <= 128
async function hash(password, salt = randomBytes(16).toString('hex')) {
  const key = await derive(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `${salt}:${key.toString('hex')}`
}
async function verify(password, encoded) {
  const reference = encoded ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`
  const actual = await hash(password, reference.split(':')[0])
  return timingSafeEqual(Buffer.from(actual), Buffer.from(reference))
}
export function openAccounts(directory, clock = Date.now) {
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(join(directory, 'accounts.sqlite'))
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, recovery TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS records(owner TEXT NOT NULL REFERENCES users(id), key TEXT NOT NULL, value TEXT, version INTEGER NOT NULL, PRIMARY KEY(owner,key));
    CREATE TABLE IF NOT EXISTS telegram(owner TEXT PRIMARY KEY REFERENCES users(id), chat TEXT UNIQUE, pair TEXT UNIQUE, expires INTEGER, linked INTEGER);
    CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS prices(id TEXT PRIMARY KEY, owner TEXT NOT NULL REFERENCES users(id), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS monitors(owner TEXT PRIMARY KEY REFERENCES users(id), value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS worker(id INTEGER PRIMARY KEY CHECK(id=1), owner TEXT NOT NULL, expires INTEGER NOT NULL);
  `)
  let authBusy = 0
  const limited = async fn => { if (authBusy >= 2) fail(429, '로그인 요청을 처리 중입니다. 잠시 후 다시 시도해주세요.'); authBusy++; try { return await fn() } finally { authBusy-- } }
  const session = user => {
    const token = randomBytes(32).toString('base64url'), expires = clock() + 12 * 3600_000
    db.prepare('DELETE FROM sessions WHERE expires < ?').run(clock())
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, expires)
    db.prepare('DELETE FROM sessions WHERE owner=? AND hash NOT IN (SELECT hash FROM sessions WHERE owner=? ORDER BY expires DESC LIMIT 10)').run(user.id, user.id)
    return { token, expires, user: { id: user.id, username: user.username } }
  }
  const username = input => {
    if (typeof input !== 'string' || !/^[a-zA-Z0-9_-]{4,32}$/.test(input)) fail(400, '아이디는 영문·숫자·밑줄·하이픈 4~32자로 입력해주세요.')
    return input.toLowerCase()
  }
  const password = value => { if (!passwordValid(value)) fail(400, '비밀번호는 15~128자로 입력해주세요.'); return value }
  return {
    db, close: () => db.close(), users: () => db.prepare('SELECT id,username FROM users').all(),
    register: input => limited(async () => {
      const name = username(input.username), secret = password(input.password)
      if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count >= 50) fail(503, '베타 가입 인원이 가득 찼습니다.')
      const encoded = await hash(secret), recovery = randomBytes(24).toString('base64url'), id = randomUUID()
      // Hashing yields to other requests. Check the capacity again before the synchronous insert.
      if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count >= 50) fail(503, '베타 가입 인원이 가득 찼습니다.')
      try { db.prepare('INSERT INTO users VALUES(?,?,?,?,?)').run(id, name, encoded, digest(recovery), clock()) }
      catch (e) { if (e.code?.startsWith('ERR_SQLITE')) fail(409, '사용할 수 없는 아이디입니다. 다른 아이디를 선택해주세요.'); throw e }
      return { ...session({ id, username: name }), recovery }
    }),
    login: input => limited(async () => {
      const name = username(input.username), secret = password(input.password)
      const user = db.prepare('SELECT * FROM users WHERE username=?').get(name)
      if (!await verify(secret, user?.password) || !user) fail(401, '아이디 또는 비밀번호를 확인해주세요.')
      if (db.prepare('SELECT password FROM users WHERE id=?').get(user.id)?.password !== user.password) fail(401, '비밀번호가 변경되었습니다. 다시 로그인해주세요.')
      return session(user)
    }),
    recover: input => limited(async () => {
      const name = username(input.username), secret = password(input.password)
      const user = db.prepare('SELECT * FROM users WHERE username=?').get(name)
      if (typeof input.recovery !== 'string' || input.recovery.length > 128 || !user || !timingSafeEqual(Buffer.from(user.recovery), Buffer.from(digest(input.recovery)))) fail(401, '아이디와 복구 코드를 확인해주세요.')
      const encoded = await hash(secret), recovery = randomBytes(24).toString('base64url')
      db.exec('BEGIN IMMEDIATE')
      try {
        // Compare again after password hashing; a recovery code can be consumed only once.
        const updated = db.prepare('UPDATE users SET password=?,recovery=? WHERE id=? AND recovery=?').run(encoded, digest(recovery), user.id, user.recovery)
        if (!updated.changes) fail(409, '이미 사용한 복구 코드입니다.')
        db.prepare('DELETE FROM sessions WHERE owner=?').run(user.id); db.exec('COMMIT')
      } catch (e) { db.exec('ROLLBACK'); throw e }
      return { ...session(user), recovery }
    }),
    authenticate(token) {
      if (!/^[A-Za-z0-9_-]{43}$/.test(token ?? '')) fail(401, '로그인이 필요합니다.')
      const user = db.prepare('SELECT users.id,users.username FROM sessions JOIN users ON users.id=sessions.owner WHERE hash=? AND expires>?').get(digest(token), clock())
      if (!user) fail(401, '로그인이 만료되었습니다. 다시 로그인해주세요.')
      return user
    },
    logout(token, all = false) { const user = this.authenticate(token); db.prepare(all ? 'DELETE FROM sessions WHERE owner=?' : 'DELETE FROM sessions WHERE hash=?').run(all ? user.id : digest(token)) },
    records(owner) { return db.prepare('SELECT key,value,version FROM records WHERE owner=?').all(owner) },
    putRecord(owner, { key, value, version }) {
      const validKey = ['investai.research.observations.v1','investai.signal-presets.v1','investai.research.rules.v1','investai.research.events.v1'].includes(key) || /^investai\.research\.draft\.v1\.[A-Z0-9]{2,12}$/.test(key)
      if (!validKey || !Number.isSafeInteger(version) || version < 0 || value !== null && (typeof value !== 'string' || Buffer.byteLength(value) > 200_000)) fail(400, '저장할 기록의 형식을 확인해주세요.')
      if (value !== null && !key.includes('.draft.')) { try { const rows = JSON.parse(value); if (!Array.isArray(rows) || rows.length > 100) throw new Error() } catch { fail(400, '기록 목록을 확인해주세요.') } }
      if (key.includes('.draft.') && value?.length > 1000) fail(400, '메모는 1,000자까지 저장할 수 있습니다.')
      db.exec('BEGIN IMMEDIATE')
      try {
        const prior = db.prepare('SELECT version FROM records WHERE owner=? AND key=?').get(owner,key)
        if ((prior?.version ?? 0) !== version) fail(409, '다른 기기에서 바뀐 기록이 있습니다. 충돌을 확인해주세요.')
        if (!prior && db.prepare('SELECT COUNT(*) AS count FROM records WHERE owner=?').get(owner).count >= 50) fail(400, '기록 저장 한도에 도달했습니다.')
        db.prepare('INSERT INTO records VALUES(?,?,?,?) ON CONFLICT(owner,key) DO UPDATE SET value=excluded.value,version=excluded.version').run(owner,key,value,version+1)
        db.exec('COMMIT'); return { key,value,version:version+1 }
      } catch(e) { db.exec('ROLLBACK'); throw e }
    },
  }
}
