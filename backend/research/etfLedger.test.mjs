import test from 'node:test'
import assert from 'node:assert/strict'
import { ETF_KEY, validEtfLedger, parseEtfCsv, mergeEtfRows, exportEtfCsv } from './etfLedger.mjs'
import { validInvestmentEnvelope, investmentRecordLimits } from '../cloud/recordPolicy.mjs'
const now = Date.UTC(2026, 9, 28), empty = { version: 1, rows: [] }
test('ETF records separate assets, survive serialization and preserve bounded revisions', () => {
  let data = mergeEtfRows(empty, 'BTC', parseEtfCsv('2026-10-20,1000,"report, A"', now), now)
  data = mergeEtfRows(data, 'ETH', parseEtfCsv('2026-10-20,-200,report B', now), now)
  for (let i = 1; i <= 7; i++) data = mergeEtfRows(data, 'BTC', [{ date: '2026-10-20', flow: 1000 + i, source: 'corrected' }], now + i)
  assert.equal(empty.rows.length, 0); assert.equal(data.rows.length, 2)
  assert.equal(data.rows[0].revision, 8); assert.equal(data.rows[0].previous.length, 5)
  assert.equal(data.rows[0].previous[0].flow, 1006); assert.equal(data.rows[1].flow, -200)
  assert.deepEqual(mergeEtfRows(data, 'BTC', [data.rows[0]], now + 20), data)
  assert.ok(validInvestmentEnvelope(ETF_KEY, JSON.parse(JSON.stringify(data))))
  assert.equal(investmentRecordLimits[ETF_KEY], 500000)
  assert.deepEqual(parseEtfCsv(exportEtfCsv([data.rows[1]]), now), [{ date: '2026-10-20', flow: -200, source: 'report B' }])
})
test('invalid and duplicate dates, future rows, nonfinite amounts, corrupt envelopes and formula sources are handled', () => {
  for (const input of ['2026-02-30,1,source', '2026-10-29,1,source', '2026-10-20,1,', '2026-10-20,Infinity,source', '2026-10-20,1,source\n2026-10-20,2,source']) assert.throws(() => parseEtfCsv(input, now))
  for (const value of [null, {}, { version: 1, rows: [null] }, { version: 1, rows: [{}] }]) assert.equal(validEtfLedger(value), false)
  const row = mergeEtfRows(empty, 'BTC', parseEtfCsv('2026-10-20,0,"=cmd(""x"")"', now), now).rows[0]
  assert.ok(exportEtfCsv([row]).includes('"\'=cmd(')); assert.equal(validEtfLedger({ version: 1, rows: [row, row] }), false)
})
