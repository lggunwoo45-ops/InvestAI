import test from 'node:test'
import assert from 'node:assert/strict'
import { createCredentialVault, validVault, normalizeCredentials } from './credentialVault.mjs'

const password = 'fixture-vault-password-only'
const credentials = { apiKey: 'fixture_api_key_123456', apiSecret: 'fixture_api_secret_123456' }
const id = 'key-11111111-1111-4111-8111-111111111111'

test('replacing a key rejects duplicates without losing the previous encrypted record', async () => {
  const vault = createCredentialVault(); let data
  await vault.setup(password, async value => { data = value })
  const otherId = 'key-22222222-2222-4222-8222-222222222222', other = { apiKey: 'other_fixture_key_123456', apiSecret: 'other_fixture_secret_123456' }
  vault.add(data, id, 'bybit', credentials); vault.add(data, otherId, 'bybit', other)
  const before = JSON.stringify(data)
  assert.throws(() => vault.replace(data, id, 'bybit', other), /이미 연결/)
  assert.equal(JSON.stringify(data), before); assert.deepEqual(vault.read(data, id, 'bybit'), credentials)
  const replacement = { ...credentials, apiSecret: 'new_fixture_secret_123456' }
  vault.replace(data, id, 'bybit', replacement)
  assert.equal(validVault(data), true); assert.deepEqual(vault.read(data, id, 'bybit'), replacement)
  assert.equal(data.items.length, 2); vault.lock()
})
test('vault encrypts both keys, authenticates on unlock, binds ciphertext to venue and record, and clears its session', async () => {
  const vault = createCredentialVault(); let data
  await vault.setup(password, async value => { data = value })
  vault.add(data, id, 'binance', credentials)
  assert.equal(validVault(data), true)
  for (const secret of [password, credentials.apiKey, credentials.apiSecret]) assert.equal(JSON.stringify(data).includes(secret), false)
  assert.deepEqual(vault.read(data, id, 'binance'), credentials)
  assert.throws(() => vault.add(data, 'key-22222222-2222-4222-8222-222222222222', 'binance', credentials), /이미 연결/)
  const signal = vault.signal, generation = vault.generation
  vault.lock(); assert.equal(vault.unlocked, false); assert.equal(signal.aborted, true); assert.ok(vault.generation > generation)
  assert.throws(() => vault.read(data, id, 'binance'), /잠겨/)
  await assert.rejects(() => vault.unlock('wrong-password-value', data), /열 수 없습니다/)
  assert.equal(vault.unlocked, false)
  const restarted = createCredentialVault()
  await restarted.unlock(password, data); assert.deepEqual(restarted.read(data, id, 'binance'), credentials)
  restarted.lock()
  const swapped = structuredClone(data); swapped.items[0].venue = 'bybit'
  await assert.rejects(() => restarted.unlock(password, swapped), /열 수 없습니다/)
  const damaged = structuredClone(data); damaged.items[0].box.data = 'A' + damaged.items[0].box.data.slice(1)
  if (damaged.items[0].box.data === data.items[0].box.data) damaged.items[0].box.data = 'B' + damaged.items[0].box.data.slice(1)
  await assert.rejects(() => restarted.unlock(password, damaged), /열 수 없습니다/)
  assert.equal(restarted.unlocked, false)
})
test('failed persistence never unlocks a vault; lock during derivation invalidates setup; password attempts are bounded', async () => {
  const vault = createCredentialVault(() => 1800000000000)
  await assert.rejects(() => vault.setup(password, async () => { throw new Error('disk full') }), /disk full/)
  assert.equal(vault.unlocked, false)
  const pending = vault.setup(password, async () => assert.fail('should not persist after lock')); vault.lock()
  await assert.rejects(() => pending); assert.equal(vault.unlocked, false)
  for (let i = 0; i < 3; i++) await assert.rejects(() => vault.setup(password, async () => { throw new Error('no write') }))
  await assert.rejects(() => vault.setup(password, async () => {}), /1분/)
  assert.equal(validVault(null), false); assert.equal(validVault({ items: [null] }), false)
  assert.throws(() => normalizeCredentials({ ...credentials, apiSecret: 'bad\nsecret' }), /HMAC/)
})
