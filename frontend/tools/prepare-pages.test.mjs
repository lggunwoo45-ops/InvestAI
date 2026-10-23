import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { preparePages } from './prepare-pages.mjs'

test('direct entry pages keep absolute subpath assets and SPA fallback', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'market-copilot-pages-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  const html = '<script src="/InvestAI/assets/app.js"></script>'
  await writeFile(join(dir, 'index.html'), html)
  await preparePages(dir)
  for (const entry of ['market/index.html', 'research/index.html', 'ai-analysis/index.html', 'my-analysis/index.html', 'news/index.html', '404.html']) assert.equal(await readFile(join(dir, entry), 'utf8'), html)
  assert.equal(await readFile(join(dir, '.nojekyll'), 'utf8'), '')
})
test('packaging rejects relative assets that break after nested route reload', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'market-copilot-pages-'))
  t.after(() => rm(dir, { recursive: true, force: true }))
  await writeFile(join(dir, 'index.html'), '<script src="./assets/app.js"></script>')
  await assert.rejects(preparePages(dir), /--base/)
})
