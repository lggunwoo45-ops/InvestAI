import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { openAccounts } from './accounts.mjs'
import { normalizedEmail } from './emailAccounts.mjs'
import { createEmailDelivery } from './emailDelivery.mjs'
import { createCloudHandler } from './server.mjs'

const secret = '2'.repeat(64), password = 'Abcdef1!', nextPassword = 'Newpass2!'
const env = { INVESTAI_CLOUD_SIGNUP: 'true', INVESTAI_MAIL_PROVIDER: 'resend', INVESTAI_MAIL_FROM: 'accounts@example.test', INVESTAI_MAIL_API_KEY: 're_test_fixture_not_a_real_key' }
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'investai-email-'))
  let time = Date.parse('2026-10-26T00:00:00Z'), accounts = openAccounts(directory, () => time, { emailSecret: secret })
  t.after(async () => { accounts.close(); await rm(directory, { recursive: true, force: true }) })
  return { get accounts() { return accounts }, get time() { return time }, advance(ms = 60_001) { time += ms }, reopen() { accounts.close(); accounts = openAccounts(directory, () => time, { emailSecret: secret }) } }
}
async function verified(f, name = 'alice', address = 'alice@example.test') {
  const job = f.accounts.email.requestSignup({ username: name, email: address }, name)
  f.accounts.email.delivered(job.response.challenge)
  const proof = f.accounts.email.verifySignup({ challenge: job.response.challenge, code: job.delivery.code })
  return f.accounts.register({ username: name, password, emailTicket: proof.ticket }, { requireEmail: true })
}

test('email normalization rejects header injection and invalid addresses without merging provider aliases', () => {
  assert.equal(normalizedEmail(' Alice+invest@Example.TEST '), 'alice+invest@example.test')
  for (const value of ['a\r\nBcc:someone@example.test', '.a@example.test', 'a..b@example.test', 'a@-bad.test', 'a@localhost', 'a'.repeat(65) + '@example.test', null]) assert.equal(normalizedEmail(value), null)
  assert.notEqual(normalizedEmail('a.b@example.test'), normalizedEmail('ab@example.test'))
})
test('signup proof is email-verified, username-bound, expiring and single-use', async t => {
  const f = await fixture(t), a = f.accounts
  await assert.rejects(a.register({ username: 'alice', password }, { requireEmail: true }), /먼저 인증/)
  const job = a.email.requestSignup({ username: 'alice', email: 'ALICE@example.test' }, 'visitor')
  assert.equal(JSON.stringify(job.response).includes(job.delivery.code), false)
  assert.equal(JSON.stringify(a.db.prepare('SELECT * FROM email_challenges').all()).includes(job.delivery.code), false)
  assert.throws(() => a.email.verifySignup({ challenge: job.response.challenge, code: job.delivery.code }), /올바르지/)
  a.email.delivered(job.response.challenge)
  const proof = a.email.verifySignup({ challenge: job.response.challenge, code: job.delivery.code })
  await assert.rejects(a.register({ username: 'other', password, emailTicket: proof.ticket }, { requireEmail: true }), /다시 진행/)
  const user = await a.register({ username: 'alice', password, emailTicket: proof.ticket }, { requireEmail: true })
  assert.equal(user.user.email, 'alice@example.test')
  assert.equal(a.authenticate(user.token).emailVerifiedAt, f.time)
  await assert.rejects(a.register({ username: 'again', password, emailTicket: proof.ticket }, { requireEmail: true }), /다시 진행/)
})
test('verified signup can expire during password hashing without leaving a partially created account', async t => {
  const f = await fixture(t), a = f.accounts
  const job = a.email.requestSignup({ username: 'expires', email: 'expires@example.test' }, 'visitor')
  a.email.delivered(job.response.challenge)
  const proof = a.email.verifySignup({ challenge: job.response.challenge, code: job.delivery.code })
  const creating = a.register({ username: 'expires', password, emailTicket: proof.ticket }, { requireEmail: true })
  f.advance(10 * 60_000 + 1)
  await assert.rejects(creating, /다시 진행/)
  assert.equal(a.users().length, 0)
})
test('legacy accounts link email only with their current password and cannot consume another member challenge', async t => {
  const f = await fixture(t), a = f.accounts, user = await a.register({ username: 'legacy', password }), other = await a.register({ username: 'second', password })
  a.putRecord(user.user.id, { key: 'investai.research.draft.v1.BTC', value: 'private note', version: 0 })
  await assert.rejects(a.email.requestLink(user.user.id, { email: 'legacy@example.test', password: 'wrong' }), /현재 비밀번호/)
  const job = await a.email.requestLink(user.user.id, { email: 'legacy@example.test', password })
  a.email.delivered(job.response.challenge)
  assert.throws(() => a.email.verifyLink(other.user.id, { challenge: job.response.challenge, code: job.delivery.code }), /올바르지/)
  f.reopen()
  f.accounts.email.verifyLink(user.user.id, { challenge: job.response.challenge, code: job.delivery.code })
  assert.equal(f.accounts.authenticate(user.token).email, 'legacy@example.test')
  assert.equal(f.accounts.records(user.user.id)[0].value, 'private note')
  await assert.rejects(f.accounts.email.requestLink(user.user.id, { email: 'changed@example.test', password }), /이미 인증/)
})
test('five guesses, expiration and persistent request budgets prevent repeated attempts across restart', async t => {
  const f = await fixture(t), a = f.accounts
  const job = a.email.requestSignup({ username: 'alice', email: 'alice@example.test' }, 'visitor')
  a.email.delivered(job.response.challenge)
  const wrong = job.delivery.code === '00000000' ? '11111111' : '00000000'
  for (let i = 0; i < 5; i++) assert.throws(() => a.email.verifySignup({ challenge: job.response.challenge, code: wrong }), /올바르지/)
  assert.throws(() => a.email.verifySignup({ challenge: job.response.challenge, code: job.delivery.code }), /올바르지/)
  f.reopen()
  assert.throws(() => f.accounts.email.requestSignup({ username: 'alice', email: 'alice@example.test' }, 'visitor'), /요청이 많습니다/)
  f.advance()
  const second = f.accounts.email.requestSignup({ username: 'alice', email: 'alice@example.test' }, 'visitor')
  f.accounts.email.delivered(second.response.challenge); f.advance(10 * 60_000 + 1)
  assert.throws(() => f.accounts.email.verifySignup({ challenge: second.response.challenge, code: second.delivery.code }), /만료/)
})
test('verified-email password reset revokes all sessions and old recovery codes while preserving member records', async t => {
  const f = await fixture(t), a = f.accounts, user = await verified(f)
  const second = await a.login({ username: 'alice', password })
  a.putRecord(user.user.id, { key: 'investai.research.draft.v1.BTC', value: 'kept', version: 0 })
  f.advance()
  const job = a.email.requestReset({ email: 'alice@example.test' }, 'visitor')
  a.email.delivered(job.response.challenge)
  assert.throws(() => a.email.verifySignup({ challenge: job.response.challenge, code: job.delivery.code }), /올바르지/)
  const result = await a.email.resetPassword({ challenge: job.response.challenge, code: job.delivery.code, password: nextPassword })
  assert.equal(result.username, 'alice'); assert.equal(result.recovery.length, 32); assert.equal(result.token, undefined)
  for (const session of [user, second]) assert.throws(() => a.authenticate(session.token), /만료/)
  await assert.rejects(a.login({ username: 'alice', password }), /확인해주세요/)
  await assert.rejects(a.recover({ username: 'alice', password, recovery: user.recovery }), /확인해주세요/)
  await assert.rejects(a.email.resetPassword({ challenge: job.response.challenge, code: job.delivery.code, password }), /올바르지/)
  assert.equal((await a.login({ username: 'alice', password: nextPassword })).user.email, 'alice@example.test')
  assert.equal(a.records(user.user.id)[0].value, 'kept')
})
test('concurrent reset redemption has only one winner and offline recovery invalidates issued email codes', async t => {
  const f = await fixture(t), a = f.accounts, user = await verified(f)
  f.advance()
  const job = a.email.requestReset({ email: user.user.email }, 'visitor'); a.email.delivered(job.response.challenge)
  const input = { challenge: job.response.challenge, code: job.delivery.code, password: nextPassword }
  const results = await Promise.allSettled([a.email.resetPassword(input), a.email.resetPassword(input)])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  f.advance()
  const later = a.email.requestReset({ email: user.user.email }, 'visitor'); a.email.delivered(later.response.challenge)
  await a.recover({ username: 'alice', password, recovery: results.find(r => r.status === 'fulfilled').value.recovery })
  await assert.rejects(a.email.resetPassword({ challenge: later.response.challenge, code: later.delivery.code, password: nextPassword }), /올바르지/)
})
test('unknown and unverified addresses never receive reset email; same normalized address cannot attach twice', async t => {
  const f = await fixture(t), user = await verified(f)
  await f.accounts.register({ username: 'plain', password })
  const unknown = f.accounts.email.requestReset({ email: 'plain@example.test' }, 'visitor')
  assert.equal(unknown.delivery, null); assert.deepEqual(Object.keys(unknown.response), ['challenge', 'expiresAt'])
  f.advance()
  const duplicate = f.accounts.email.requestSignup({ username: 'other', email: user.user.email }, 'visitor')
  assert.equal(duplicate.delivery, null)
  const existingName = f.accounts.email.requestSignup({ username: 'alice', email: 'other@example.test' }, 'visitor')
  assert.equal(existingName.delivery, null)
})
test('email provider is disabled without explicit settings and sends bounded text to only the configured service', async () => {
  let calls = 0
  const disabled = createEmailDelivery({ env: {}, fetcher: async () => { calls++ } })
  assert.equal(disabled.available, false)
  await assert.rejects(disabled.send({}), /not_configured/)
  assert.equal(calls, 0)
  assert.equal(createEmailDelivery({ env: { ...env, INVESTAI_MAIL_FROM: 'onboarding@resend.dev' } }).available, false)
  const sender = createEmailDelivery({ env, fetcher: async (url, init) => {
    calls++; assert.equal(url, 'https://api.resend.com/emails'); assert.equal(init.redirect, 'error')
    const body = JSON.parse(init.body)
    assert.deepEqual(body.to, ['alice@example.test']); assert.match(body.text, /12345678/); assert.match(body.text, /10분/)
    assert.equal(body.html, undefined); assert.equal(body.cc, undefined)
    assert.ok(!init.headers['Idempotency-Key'].includes('private-challenge'))
    return Response.json({ id: 'fixture-delivery' })
  } })
  await sender.send({ address: 'alice@example.test', code: '12345678', purpose: 'reset', challenge: 'private-challenge' })
  assert.equal(calls, 1)
  const failed = createEmailDelivery({ env, fetcher: async () => new Response('private upstream body', { status: 403 }) })
  await assert.rejects(failed.send({ address: 'alice@example.test', code: '12345678', purpose: 'reset', challenge: 'fixture' }), error => error.message === 'email_delivery_failed')
})
test('daily delivery budget also covers unknown accounts and cannot be bypassed by changing address or actor', async t => {
  const f = await fixture(t)
  for (let n = 0; n < 80; n++) f.accounts.email.requestReset({ email: `n${n}@example.test` }, `visitor-${n}`)
  assert.throws(() => f.accounts.email.requestReset({ email: 'limit@example.test' }, 'another'), /요청이 많습니다/)
  f.reopen()
  assert.throws(() => f.accounts.email.requestReset({ email: 'limit@example.test' }, 'another'), /요청이 많습니다/)
})

async function serverFixture(t, mailEnv = env, fetcher = async () => Response.json({ id: 'fixture' }), seed = false) {
  const directory = await mkdtemp(join(tmpdir(), 'investai-email-http-'))
  let time=Date.parse('2026-10-26T00:00:00Z'), member
  if(seed){const accounts=openAccounts(directory,()=>time,{emailSecret:secret});member=await accounts.register({username:'legacy',password});accounts.close()}
  const handler = createCloudHandler({ directory, secret, env: mailEnv, origins: ['https://app.example'], autoStart: false, fetcher,clock:()=>time })
  await handler.ready
  const server = createServer(handler); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await handler.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); await rm(directory, { recursive: true, force: true }) })
  return { handler,member,advance(){time+=60_001}, async request(path, data, token) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/cloud${path}`, { method: data === undefined ? 'GET' : 'POST', headers: { origin: 'https://app.example', 'content-type': 'application/json', 'x-investai-cloud': '1', ...(token ? { authorization: `Bearer ${token}` } : {}) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) })
    return { status: response.status, body: await response.json() }
  } }
}
test('HTTP signup responds before delivery, requires the verified ticket and does not expose codes or secrets', async t => {
  let release, message
  const app = await serverFixture(t, env, async (_url, init) => { message = JSON.parse(init.body); await new Promise(resolve => { release = resolve }); return Response.json({ id: 'fixture' }) })
  assert.equal((await app.request('/status')).body.emailAvailable, true)
  assert.equal((await app.request('/register', { username: 'alice', password })).status, 400)
  const request = await app.request('/email/signup/request', { username: 'alice', email: 'alice@example.test' })
  assert.equal(request.status, 202); assert.deepEqual(Object.keys(request.body), ['challenge', 'expiresAt'])
  release(); await app.handler.emailDrain()
  const code = /번호: (\d{8})/.exec(message.text)[1]
  const proof = await app.request('/email/signup/verify', { challenge: request.body.challenge, code })
  const account = await app.request('/register', { username: 'alice', password, emailTicket: proof.body.ticket })
  assert.equal(account.status, 200); assert.equal(account.body.user.email, 'alice@example.test')
  assert.equal((await app.request('/me', undefined, account.body.token)).body.user.email, 'alice@example.test')
  assert.ok(!JSON.stringify(request).includes(code)); assert.ok(!JSON.stringify(account).includes(env.INVESTAI_MAIL_API_KEY))
})
test('HTTP legacy linking requires authentication and email reset keeps unknown-address responses indistinguishable',async t=>{
  const messages=[]
  const app=await serverFixture(t,env,async(_url,init)=>{messages.push(JSON.parse(init.body));return Response.json({id:'fixture'})},true)
  const token=app.member.token
  assert.equal((await app.request('/email/link/request',{email:'legacy@example.test',password})).status,401)
  assert.equal((await app.request('/email/link/request',{email:'legacy@example.test',password:'wrong'},token)).status,400)
  const link=await app.request('/email/link/request',{email:'legacy@example.test',password},token)
  await app.handler.emailDrain()
  const code=/번호: (\d{8})/.exec(messages.at(-1).text)[1]
  assert.equal((await app.request('/email/link/verify',{challenge:link.body.challenge,code},token)).status,200)
  assert.equal((await app.request('/me',undefined,token)).body.user.email,'legacy@example.test')
  app.advance()
  const known=await app.request('/email/reset/request',{email:'legacy@example.test'}),unknown=await app.request('/email/reset/request',{email:'unknown@example.test'})
  assert.equal(known.status,202);assert.equal(unknown.status,202);assert.deepEqual(Object.keys(known.body),Object.keys(unknown.body))
  await app.handler.emailDrain();assert.equal(messages.length,2)
  const resetCode=/번호: (\d{8})/.exec(messages.at(-1).text)[1]
  const reset=await app.request('/email/reset/complete',{challenge:known.body.challenge,code:resetCode,password:nextPassword})
  assert.equal(reset.status,200);assert.equal(reset.body.username,'legacy');assert.equal(reset.body.token,undefined)
  assert.equal((await app.request('/me',undefined,token)).status,401)
  assert.equal((await app.request('/login',{username:'legacy',password:nextPassword})).status,200)
  assert.equal((await app.request('/email/reset/request',null)).status,400)
})
test('unconfigured mail keeps legacy signup usable and reports setup accurately; failed delivery grants no proof', async t => {
  const inactive = await serverFixture(t, { INVESTAI_CLOUD_SIGNUP: 'true' })
  assert.equal((await inactive.request('/status')).body.emailAvailable, false)
  assert.equal((await inactive.request('/register', { username: 'legacy', password })).status, 200)
  assert.equal((await inactive.request('/email/reset/request', { email: 'legacy@example.test' })).status, 503)
  let code
  const failing = await serverFixture(t, env, async (_url, init) => { code = /번호: (\d{8})/.exec(JSON.parse(init.body).text)[1]; throw new Error('mail unavailable') })
  const request = await failing.request('/email/signup/request', { username: 'alice', email: 'alice@example.test' })
  await failing.handler.emailDrain()
  assert.equal((await failing.request('/email/signup/verify', { challenge: request.body.challenge, code })).status, 400)
})
