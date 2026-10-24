import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'node:crypto'
import { promisify } from 'node:util'
const derive = promisify(scrypt)
const marker = 'InvestAI local credential vault v1'
const b64 = (s, bytes) => typeof s === 'string' && /^[A-Za-z0-9_-]+$/.test(s) && Buffer.from(s, 'base64url').length === bytes
const sealed = value => value && b64(value.iv, 12) && b64(value.tag, 16) && typeof value.data === 'string' && /^[A-Za-z0-9_-]{1,4096}$/.test(value.data)
const context = (id, venue) => `investai:v1:${id}:${venue}`
const message = () => new Error('보관함을 열 수 없습니다. 비밀번호와 저장 파일을 확인해주세요.')
function encrypt(key, text, aad) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, iv)
  cipher.setAAD(Buffer.from(aad))
  return { iv: iv.toString('base64url'), data: Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]).toString('base64url'), tag: cipher.getAuthTag().toString('base64url') }
}
function decrypt(key, value, aad) {
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64url'))
  cipher.setAAD(Buffer.from(aad)); cipher.setAuthTag(Buffer.from(value.tag, 'base64url'))
  return Buffer.concat([cipher.update(Buffer.from(value.data, 'base64url')), cipher.final()]).toString('utf8')
}
export function validVault(v) {
  try { return !!v && v.version === 1 && v.kdf === 'scrypt-32768-8-1' && b64(v.salt, 32) && sealed(v.check) && Array.isArray(v.items) && v.items.length <= 8 && new Set(v.items.map(i => i.id)).size === v.items.length && v.items.every(i => /^key-[a-f0-9-]{36}$/.test(i.id) && ['binance', 'bybit'].includes(i.venue) && sealed(i.box)) } catch { return false }
}
export function normalizeCredentials(input) {
  if (!input || typeof input.apiKey !== 'string' || typeof input.apiSecret !== 'string' || !/^[A-Za-z0-9_-]{16,256}$/.test(input.apiKey) || !/^[A-Za-z0-9_-]{16,256}$/.test(input.apiSecret)) throw new Error('거래소에서 발급한 HMAC API 키와 비밀 키를 입력해주세요.')
  return { apiKey: input.apiKey, apiSecret: input.apiSecret }
}
export function createCredentialVault(clock = Date.now) {
  let key = null, generation = 0, controller = new AbortController(), attempts = []
  const requireKey = () => { if (!key) throw new Error('API 키 보관함이 잠겨 있습니다. 앱에서 비밀번호로 열어주세요.'); return key }
  async function passwordKey(password, salt) {
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('보관함 비밀번호는 12~256자로 입력해주세요.')
    attempts = attempts.filter(at => clock() - at < 60000)
    if (attempts.length >= 5) throw new Error('보관함 열기를 여러 번 시도했습니다. 1분 뒤 다시 시도해주세요.')
    attempts.push(clock())
    return derive(password, Buffer.from(salt, 'base64url'), 32, { N: 32768, r: 8, p: 1, maxmem: 67108864 })
  }
  return {
    get unlocked() { return key !== null }, get generation() { return generation }, get signal() { return controller.signal },
    lock() { generation++; controller.abort(); controller = new AbortController(); key?.fill(0); key = null },
    async setup(password, commit) {
      const before = generation, salt = randomBytes(32).toString('base64url'), candidate = await passwordKey(password, salt)
      try {
        if (generation !== before) throw message()
        const data = { version: 1, kdf: 'scrypt-32768-8-1', salt, check: encrypt(candidate, marker, context('check', 'vault')), items: [] }
        await commit(data)
        if (generation !== before) throw message()
        key?.fill(0); key = Buffer.from(candidate)
      } finally { candidate.fill(0) }
    },
    async unlock(password, data) {
      if (!validVault(data)) throw message()
      const before = generation, candidate = await passwordKey(password, data.salt)
      try {
        if (decrypt(candidate, data.check, context('check', 'vault')) !== marker || generation !== before) throw message()
        // Authenticate every item before allowing any private provider call.
        for (const item of data.items) normalizeCredentials(JSON.parse(decrypt(candidate, item.box, context(item.id, item.venue))))
        key?.fill(0); key = Buffer.from(candidate)
      } catch { throw message() } finally { candidate.fill(0) }
    },
    read(data, id, venue) {
      const activeKey = requireKey(), item = data?.items.find(i => i.id === id && i.venue === venue)
      if (!item) throw message()
      try { return normalizeCredentials(JSON.parse(decrypt(activeKey, item.box, context(id, venue)))) } catch { throw message() }
    },
    add(data, id, venue, input) {
      const activeKey = requireKey(), credentials = normalizeCredentials(input)
      if (!validVault(data) || data.items.length >= 8 || data.items.some(i => i.id === id) || !/^key-[a-f0-9-]{36}$/.test(id) || !['binance', 'bybit'].includes(venue)) throw message()
      for (const item of data.items.filter(i => i.venue === venue)) if (JSON.parse(decrypt(activeKey, item.box, context(item.id, item.venue))).apiKey === credentials.apiKey) throw new Error('이 API 키는 이미 연결되어 있습니다.')
      data.items.push({ id, venue, box: encrypt(activeKey, JSON.stringify(credentials), context(id, venue)) })
    },
  }
}
