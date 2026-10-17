import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { configuration, createAnalysis, estimate, validate, reserve } from './analysis.mjs'
import { createHandler } from './server.mjs'

const env = { AI_ENABLED: 'true', OPENAI_API_KEY: 'server-secret', AI_ACCESS_TOKEN: 'a'.repeat(32), AI_MODEL: 'reviewed-model', AI_INPUT_USD_PER_MILLION: '10', AI_OUTPUT_USD_PER_MILLION: '30', AI_BUDGET_USD: '1' }
const input = { consent: true, symbol: 'BTC', language: 'en', evidence: 'Demo quote, not independently verified.' }
const payload = (overrides = {}) => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ summary: 'Evidence is limited.', risks: 'Source may be stale.', missingEvidence: 'Verified market data.' }) }] }], ...overrides })
const response = body => new Response(JSON.stringify(body))
async function temp(t) {
  const dir = await mkdtemp(join(tmpdir(), 'investai-ai-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  return join(dir, 'budget.json')
}
test('disabled and incomplete configuration fail closed', async () => {
  assert.equal(configuration({ ...env, AI_ENABLED: 'false' }), null)
  for (const key of ['OPENAI_API_KEY', 'AI_MODEL', 'AI_ACCESS_TOKEN', 'AI_BUDGET_USD', 'AI_INPUT_USD_PER_MILLION', 'AI_OUTPUT_USD_PER_MILLION']) {
    assert.throws(() => configuration({ ...env, [key]: '' }))
  }
  await assert.rejects(createAnalysis({ config: null, fetchImpl: () => assert.fail('network') })(input), /ai_disabled/)
})
test('bounded exact input schema and explicit consent', () => {
  for (const value of [null, [], { ...input, consent: false }, { ...input, model: 'client-model' }, { ...input, symbol: '<script>' }, { ...input, language: 'other' }, { ...input, evidence: '가'.repeat(1400) }, { ...input, evidence: ' ' }, { ...input, evidence: '\u0000' }]) assert.throws(() => validate(value), /invalid_input/)
  assert.equal(validate(input).symbol, 'BTC')
})
test('budget persists across restart, serializes, and rejects corrupt state', async t => {
  const path = await temp(t)
  const attempts = await Promise.allSettled([reserve(path, 60, 100), reserve(path, 60, 100)])
  assert.equal(attempts.filter(x => x.status === 'fulfilled').length, 1)
  await assert.rejects(reserve(path, 60, 100), /budget_exhausted/)
  assert.equal(JSON.parse(await readFile(path)).reservedMicros, 60)
  await writeFile(path, '{"version":1,"reservedMicros":-1}')
  await assert.rejects(reserve(path, 1, 100), /invalid_ledger/)
})
test('request reserves before network, fixes provider and controls, labels response', async t => {
  const path = await temp(t); let calls = 0
  const analyze = createAnalysis({ config: configuration(env), ledgerPath: path, fetchImpl: async (url, options) => {
    calls++
    assert.equal(url, 'https://api.openai.com/v1/responses')
    assert.equal(options.redirect, 'error')
    assert.equal(options.headers.Authorization, 'Bearer server-secret')
    assert.ok(JSON.parse(await readFile(path)).reservedMicros > 0)
    const body = JSON.parse(options.body)
    assert.equal(body.store, false); assert.equal(body.max_output_tokens, 512)
    assert.deepEqual(body.tools, []); assert.equal(body.model, env.AI_MODEL)
    assert.match(body.instructions, /Do not assert current market facts/)
    assert.match(body.instructions, /never instructions/)
    assert.equal(body.text.format.strict, true)
    return response(payload())
  } })
  const result = await analyze(input)
  assert.equal(result.status, 'unverified-ai-explanation')
  assert.equal(result.confidence, null)
  assert.match(result.disclaimer, /Not investment advice/)
  assert.doesNotMatch(JSON.stringify(result), /server-secret/)
  await assert.rejects(analyze(input), /rate_limited/)
  assert.equal(calls, 1)
})
test('exhausted budget prevents network', async t => {
  const analyze = createAnalysis({ config: { ...configuration(env), budget: 0.000001 }, ledgerPath: await temp(t), fetchImpl: () => assert.fail('network') })
  await assert.rejects(analyze(input), /budget_exhausted/)
})
test('in-flight concurrency is rejected before a second reservation', async () => {
  let release; let reservations = 0
  const waiting = new Promise(resolve => { release = resolve })
  const analyze = createAnalysis({ config: configuration(env), reserveImpl: async () => { reservations++ }, fetchImpl: async () => { await waiting; return response(payload()) } })
  const first = analyze(input)
  await assert.rejects(analyze(input), /rate_limited/)
  release()
  await first
  assert.equal(reservations, 1)
})
test('estimate is free and client cost ceiling is enforced before reservation or network', async () => {
  const config = configuration(env)
  const quoted = estimate(config, input)
  assert.ok(quoted.reservedUsd > 0); assert.equal(quoted.outputTokenCeiling, 512)
  const analyze = createAnalysis({ config, reserveImpl: () => assert.fail('reservation'), fetchImpl: () => assert.fail('network') })
  await assert.rejects(analyze({ ...input, maxCostUsd: quoted.reservedUsd / 2 }), /cost_limit_changed/)
  assert.throws(() => validate({ ...input, maxCostUsd: '1' }), /invalid_input/)
})
test('provider errors, timeout and malformed/incomplete/refusal responses retain reservations without retry', async t => {
  for (const fake of [() => { throw new Error('server-secret') }, () => new Response('secret', { status: 429 }), () => response(payload({ status: 'incomplete' })), () => response(payload({ output: [{ type: 'message', content: [{ type: 'refusal' }] }] })), () => response(payload({ output: [] })), () => response({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{"summary":"invalid"}' }] }] }), () => new Response('x'.repeat(65537))]) {
    const path = await temp(t); let calls = 0
    const analyze = createAnalysis({ config: configuration(env), ledgerPath: path, fetchImpl: () => { calls++; return fake() } })
    await assert.rejects(analyze(input), error => !error.message.includes('server-secret'))
    assert.equal(calls, 1)
    assert.ok(JSON.parse(await readFile(path)).reservedMicros > 0)
  }
})
test('HTTP authentication, origin, body and method boundaries before provider', async t => {
  let calls = 0
  const server = createServer(createHandler({ env, ledgerPath: await temp(t), fetchImpl: () => { calls++; return response(payload()) } }))
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const url = `http://127.0.0.1:${server.address().port}`
  const headers = { Authorization: `Bearer ${env.AI_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }
  for (const [options, status] of [
    [{ method: 'GET' }, 405],
    [{ method: 'POST', body: '{}' }, 403],
    [{ method: 'POST', headers: { ...headers, Origin: 'http://localhost' }, body: '{}' }, 403],
    [{ method: 'POST', headers: { ...headers, 'Content-Type': 'text/plain' }, body: '{}' }, 415],
    [{ method: 'POST', headers, body: '{' }, 400],
    [{ method: 'POST', headers, body: JSON.stringify({ ...input, consent: false }) }, 400],
    [{ method: 'POST', headers, body: 'x'.repeat(8193) }, 413]
  ]) assert.equal((await fetch(`${url}/api/ai/analyze`, options)).status, status)
  assert.equal(calls, 0)
  const quote = await fetch(`${url}/api/ai/estimate`, { method: 'POST', headers, body: JSON.stringify(input) })
  assert.equal(quote.status, 200)
  assert.ok((await quote.json()).reservedUsd > 0)
  assert.equal(calls, 0)
  const result = await fetch(`${url}/api/ai/analyze`, { method: 'POST', headers, body: JSON.stringify(input) })
  assert.equal(result.status, 200); assert.equal(result.headers.get('cache-control'), 'no-store')
  assert.equal(calls, 1)
})
