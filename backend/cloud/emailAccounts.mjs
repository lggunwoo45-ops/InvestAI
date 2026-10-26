import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export function normalizedEmail(input) {
  if (typeof input !== 'string') return null
  const value = input.trim().toLowerCase()
  if (value.length > 254 || !/^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(value)) return null
  const local = value.split('@')[0]
  return local.length <= 64 && !local.startsWith('.') && !local.endsWith('.') && !local.includes('..') ? value : null
}
export function createEmailAccounts({ db, clock, secret, fail, digest, hash, verify, limited, username }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_addresses(owner TEXT PRIMARY KEY REFERENCES users(id), address TEXT UNIQUE NOT NULL, verified INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS email_challenges(hash TEXT PRIMARY KEY, purpose TEXT NOT NULL, address TEXT NOT NULL, username TEXT, owner TEXT REFERENCES users(id), auth_version TEXT, code TEXT NOT NULL, expires INTEGER NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, delivery TEXT NOT NULL DEFAULT 'pending', verified INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS email_limits(key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
  `)
  const keyed = value => createHmac('sha256', secret).update(value).digest('hex')
  const profile = owner => {
    const row = db.prepare('SELECT address,verified FROM email_addresses WHERE owner=?').get(owner)
    return { email: row?.address ?? null, emailVerifiedAt: row?.verified ?? null }
  }
  const validEmail = value => { const address = normalizedEmail(value); if (!address) fail(400, '이메일 주소를 확인해주세요.'); return address }
  function budget(key, limit, period) {
    const bucket = Math.floor(clock() / period), id = keyed(`limit:${key}:${bucket}`)
    const row = db.prepare('SELECT count FROM email_limits WHERE key=?').get(id)
    if ((row?.count ?? 0) >= limit) fail(429, '인증메일 요청이 많습니다. 잠시 후 다시 시도해주세요.')
    db.prepare('INSERT INTO email_limits VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(id, (bucket + 1) * period)
  }
  function create(purpose, address, actor, { owner = null, name = null, version = null, deliver = true } = {}) {
    db.prepare('DELETE FROM email_challenges WHERE expires<=?').run(clock())
    db.prepare('DELETE FROM email_limits WHERE expires<=?').run(clock())
    const challenge = randomBytes(32).toString('base64url'), code = String(randomInt(0, 100_000_000)).padStart(8, '0'), expiresAt = clock() + 10 * 60_000
    db.exec('BEGIN IMMEDIATE')
    try {
      budget(`address-minute:${address}`, 1, 60_000)
      budget(`address-hour:${address}`, 5, 3_600_000)
      budget(`actor:${actor}`, 10, 3_600_000)
      budget('global-day', 80, 86_400_000)
      // A second 31-day budget complements the strict 80/day ceiling.
      budget('global-period', 2400, 31 * 86_400_000)
      db.prepare('INSERT INTO email_challenges(hash,purpose,address,username,owner,auth_version,code,expires) VALUES(?,?,?,?,?,?,?,?)').run(digest(challenge), purpose, address, name, owner, version, keyed(`code:${challenge}:${code}`), expiresAt)
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
    return { response: { challenge, expiresAt }, delivery: deliver ? { challenge, address, code, purpose } : null }
  }
  function pending(challenge, purpose, owner) {
    if (typeof challenge !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(challenge)) fail(400, '인증번호가 올바르지 않거나 만료되었습니다. 다시 요청해주세요.')
    const row = db.prepare('SELECT * FROM email_challenges WHERE hash=?').get(digest(challenge))
    if (!row || row.purpose !== purpose || row.expires <= clock() || row.attempts >= 5 || row.verified || row.delivery !== 'sent' || (owner !== undefined && row.owner !== owner)) fail(400, '인증번호가 올바르지 않거나 만료되었습니다. 다시 요청해주세요.')
    if (row.owner && digest(db.prepare('SELECT password FROM users WHERE id=?').get(row.owner)?.password ?? '') !== row.auth_version) fail(400, '계정 정보가 변경되었습니다. 인증을 다시 요청해주세요.')
    return row
  }
  function check(challenge, code, purpose, owner) {
    const row = pending(challenge, purpose, owner)
    db.prepare('UPDATE email_challenges SET attempts=attempts+1 WHERE hash=?').run(row.hash)
    const candidate = typeof code === 'string' && /^\d{8}$/.test(code) ? keyed(`code:${challenge}:${code}`) : '0'.repeat(64)
    if (!timingSafeEqual(Buffer.from(row.code), Buffer.from(candidate))) fail(400, '인증번호가 올바르지 않거나 만료되었습니다. 다시 요청해주세요.')
    return row
  }
  function signupProof(input) {
    const ticket = input.emailTicket
    if (typeof ticket !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(ticket)) fail(400, '가입할 이메일을 먼저 인증해주세요.')
    const row = db.prepare('SELECT * FROM email_challenges WHERE hash=?').get(digest(ticket))
    if (!row || row.purpose !== 'signup' || !row.verified || row.expires <= clock() || row.username !== username(input.username) || db.prepare('SELECT 1 FROM email_addresses WHERE address=?').get(row.address)) fail(400, '이메일 인증을 다시 진행해주세요. 이미 연결된 이메일은 계정 복구를 이용해주세요.')
    return row
  }
  const invalidate = owner => db.prepare('DELETE FROM email_challenges WHERE owner=?').run(owner)
  return {
    profile, signupProof, invalidate,
    requestSignup(input, actor) {
      const address = validEmail(input.email), name = username(input.username)
      const deliver = !db.prepare('SELECT 1 FROM email_addresses WHERE address=?').get(address) && !db.prepare('SELECT 1 FROM users WHERE username=?').get(name)
      return create('signup', address, actor, { name, deliver })
    },
    requestLink: (owner, input) => limited(async () => {
      const address = validEmail(input.email), user = db.prepare('SELECT * FROM users WHERE id=?').get(owner)
      if (typeof input.password !== 'string' || input.password.length > 128 || !await verify(input.password, user?.password)) fail(400, '현재 비밀번호를 확인해주세요.')
      if (!user || db.prepare('SELECT password FROM users WHERE id=?').get(owner)?.password !== user.password) fail(400, '계정 정보가 변경되었습니다. 다시 로그인해주세요.')
      if (profile(owner).email) fail(409, '이미 인증된 이메일이 연결되어 있습니다.')
      return create('link', address, `owner:${owner}`, { owner, version: digest(user.password), deliver: !db.prepare('SELECT 1 FROM email_addresses WHERE address=?').get(address) })
    }),
    requestReset(input, actor) {
      const address = validEmail(input.email)
      const user = db.prepare('SELECT users.id,users.password FROM users JOIN email_addresses ON users.id=email_addresses.owner WHERE address=?').get(address)
      return create('reset', address, actor, { owner: user?.id ?? null, version: user ? digest(user.password) : null, deliver: !!user })
    },
    delivered(challenge) { db.prepare("UPDATE email_challenges SET delivery='sent' WHERE hash=? AND expires>?").run(digest(challenge), clock()) },
    failed(challenge) { db.prepare('DELETE FROM email_challenges WHERE hash=?').run(digest(challenge)) },
    verifySignup(input) {
      const row = check(input.challenge, input.code, 'signup')
      db.prepare('UPDATE email_challenges SET verified=1 WHERE hash=?').run(row.hash)
      return { ticket: input.challenge, email: row.address }
    },
    attachSignup(owner, input) {
      const row = signupProof(input)
      db.prepare('INSERT INTO email_addresses VALUES(?,?,?)').run(owner, row.address, clock())
      db.prepare('DELETE FROM email_challenges WHERE address=? AND purpose=?').run(row.address, 'signup')
    },
    verifyLink(owner, input) {
      const row = check(input.challenge, input.code, 'link', owner)
      if (profile(owner).email || db.prepare('SELECT 1 FROM email_addresses WHERE address=?').get(row.address)) fail(400, '이 이메일은 연결할 수 없습니다. 다른 주소로 다시 인증해주세요.')
      db.exec('BEGIN IMMEDIATE')
      try {
        db.prepare('INSERT INTO email_addresses VALUES(?,?,?)').run(owner, row.address, clock())
        invalidate(owner)
        db.exec('COMMIT')
      } catch (error) { db.exec('ROLLBACK'); throw error }
      return profile(owner)
    },
    resetPassword: input => limited(async () => {
      const row = check(input.challenge, input.code, 'reset')
      if (!row.owner) fail(400, '인증번호가 올바르지 않거나 만료되었습니다. 다시 요청해주세요.')
      const encoded = await hash(input.password), recovery = randomBytes(24).toString('base64url')
      db.exec('BEGIN IMMEDIATE')
      try {
        // Password hashing yields. Recheck the one-use challenge and password version before committing.
        const current = db.prepare('SELECT * FROM email_challenges WHERE hash=?').get(row.hash), user = db.prepare('SELECT * FROM users WHERE id=?').get(row.owner)
        if (!current || current.expires <= clock() || current.attempts > 5 || !user || digest(user.password) !== row.auth_version) fail(400, '인증이 만료되었거나 이미 사용됐습니다. 다시 요청해주세요.')
        db.prepare('UPDATE users SET password=?,recovery=? WHERE id=?').run(encoded, digest(recovery), row.owner)
        db.prepare('DELETE FROM sessions WHERE owner=?').run(row.owner)
        invalidate(row.owner)
        db.exec('COMMIT')
        return { username: user.username, recovery }
      } catch (error) { db.exec('ROLLBACK'); throw error }
    }),
  }
}
