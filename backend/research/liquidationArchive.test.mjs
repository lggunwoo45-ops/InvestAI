import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLiquidationArchive, HOUR } from './liquidationArchive.mjs'
test('archive survives reopening, separates missing data from observed zero, deduplicates messages and expires old hours', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'investai-liquidations-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  let now = 500000 * HOUR
  const options = { directory, assets: ['BTC', 'ETH'], now: () => now }
  let archive = createLiquidationArchive(options)
  assert.equal(archive.acquire(), true)
  archive.cover(now, now + 20000)
  archive.append('one-batch', [{ asset: 'BTC', at: now, side: 'long', notional: 100 }, { asset: 'BTC', at: now, side: 'long', notional: 100 }])
  archive.append('one-batch', [{ asset: 'BTC', at: now, side: 'short', notional: 999 }])
  archive.close(); now += HOUR
  archive = createLiquidationArchive(options)
  try {
    const btc = archive.snapshot('BTC', 24), eth = archive.snapshot('ETH', 24)
    assert.equal(btc.persistent, true); assert.deepEqual(btc.rows.at(-1), { at: now - HOUR, long: 200, short: 0, count: 2, coveredMs: 20000 })
    assert.equal(btc.rows.at(-2).long, null); assert.equal(eth.rows.at(-1).long, 0)
    // A disconnected hour is never counted as connected after restart.
    archive.cover(now - HOUR, now); assert.equal(archive.snapshot('BTC', 24).rows.at(-1).coveredMs, 20000)
    assert.throws(() => archive.snapshot('BAD', 24)); assert.throws(() => archive.snapshot('BTC', 365))
    now += 8 * 24 * HOUR
    assert.equal(archive.snapshot('BTC', 168).rows.filter(r => r.count !== null).length, 0)
  } finally { archive.close() }
})
test('overlapping collectors cannot count the same stream concurrently; failed batches roll back', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'investai-liquidation-lease-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  let now = 500000 * HOUR
  const options = { directory, assets: ['BTC'], now: () => now }, a = createLiquidationArchive(options), b = createLiquidationArchive(options)
  try {
    assert.ok(a.acquire()); assert.equal(b.acquire(), false)
    assert.throws(() => b.append('blocked', []), /busy/)
    assert.throws(() => a.append('invalid', [{ asset: 'BTC', at: now, side: 'long', notional: 1 }, { asset: 'BAD', at: now, side: 'short', notional: 2 }]))
    now += 61000; assert.ok(b.acquire()); assert.throws(() => a.cover(now - 1000, now), /busy/)
    now += HOUR; assert.ok(b.snapshot('BTC', 24).rows.every(r => r.count === null))
  } finally { a.close(); b.close() }
})
