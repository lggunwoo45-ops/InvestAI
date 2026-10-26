import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { scryptSync } from 'node:crypto'
import { openAccounts } from './accounts.mjs'
import { validNewPassword } from './passwordPolicy.mjs'

test('new passwords require 8–128 characters, uppercase, number and punctuation, not whitespace or Korean as punctuation', () => {
  for (const value of ['Abcdef1!', 'A123456_', 'A1!'.padEnd(128, 'x')]) assert.equal(validNewPassword(value), true)
  for (const value of [null, {}, 'Abcd1!x', 'abcdef1!', 'Abcdefg!', 'Abcdef12', 'Abcdef1 ', 'Abcdef1가', 'A1!'.padEnd(129, 'x')]) assert.equal(validNewPassword(value), false)
})
test('registration and recovery enforce new policy while legacy passphrases still log in', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'investai-password-')), accounts = openAccounts(directory)
  try {
    await assert.rejects(() => accounts.register({ username: 'weakuser', password: 'oldlongpassphrase123' }), /대문자/)
    const member = await accounts.register({ username: 'testuser', password: 'Abcdef1!' })
    assert.equal((await accounts.login({ username: 'testuser', password: 'Abcdef1!' })).user.id, member.user.id)
    const legacy = 'previous-long-passphrase', salt = 'a'.repeat(32)
    const key = scryptSync(legacy, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
    accounts.db.prepare('UPDATE users SET password=? WHERE id=?').run(`${salt}:${key.toString('hex')}`, member.user.id)
    assert.equal((await accounts.login({ username: 'testuser', password: legacy })).user.id, member.user.id)
    await assert.rejects(() => accounts.recover({ username: 'testuser', password: 'abcdefgh1!', recovery: member.recovery }), /대문자/)
    const recovered = await accounts.recover({ username: 'testuser', password: 'Newpass1!', recovery: member.recovery })
    assert.ok(recovered.recovery !== member.recovery)
    assert.throws(() => accounts.authenticate(member.token), /만료/)
    await assert.rejects(() => accounts.login({ username: 'testuser', password: legacy }), /확인/)
  } finally { accounts.close(); await rm(directory, { recursive: true, force: true }) }
})
