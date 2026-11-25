import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { prepareCloudflarePages, cloudflareOrigin } from './prepare-cloudflare-pages.mjs'

async function fixture(context, html = '<html><head><script type="module" src="/assets/app.js"></script></head><body><div id="root"></div></body></html>') {
  const parent = resolve(tmpdir()), directory = await mkdtemp(join(parent, 'marketcopilot-public-'))
  assert.equal(dirname(resolve(directory)), parent)
  assert.ok(basename(directory).startsWith('marketcopilot-public-'))
  context.after(() => rm(directory, { recursive:true, force:true }))
  await writeFile(join(directory, 'index.html'), html)
  return { directory, html }
}

test('Cloudflare ships readable public pages on the same host and preserves the SPA entry', async context => {
  const { directory, html } = await fixture(context)
  const result = await prepareCloudflarePages(directory)
  assert.equal(result.appRootPreserved, true)
  assert.equal(await readFile(join(directory,'index.html'),'utf8'), html)
  for (const page of ['start','about','privacy','guides','guides/price-levels','guides/data-quality','guides/records','guides/scan-decisions']) {
    const text = await readFile(join(directory,page,'index.html'),'utf8')
    assert.equal((text.match(/<h1(?:\s|>)/g) ?? []).length, 1, page)
    assert.match(text, new RegExp(`rel="canonical" href="${cloudflareOrigin}/${page}/"`))
    assert.match(text, /bitmedia-site-verification/)
    assert.match(text, /google-adsense-account/)
    assert.doesNotMatch(text, /<script\b|adsbygoogle\.js|gtag\(|\/InvestAI\/|https:\/\/lggunwoo45-ops\.github\.io/)
  }
  const privacy = await readFile(join(directory,'privacy/index.html'),'utf8')
  assert.match(privacy, /Cloudflare, Inc./)
  assert.match(privacy, /2026년 11월 25일/)
})

test('robots and sitemap are real documents listing the public guide pages', async context => {
  const { directory } = await fixture(context)
  const result = await prepareCloudflarePages(directory)
  const robots = await readFile(join(directory,'robots.txt'),'utf8')
  assert.equal(robots, `User-agent: *\nAllow: /\nSitemap: ${cloudflareOrigin}/sitemap.xml\n`)
  const sitemap = await readFile(join(directory,'sitemap.xml'),'utf8')
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => new URL(m[1]))
  assert.equal(urls.length, result.documents)
  assert.equal(new Set(urls.map(u => u.href)).size, urls.length)
  for (const url of urls) {
    assert.equal(url.origin, cloudflareOrigin)
    assert.match(await readFile(join(directory,url.pathname,'index.html'),'utf8'), /<h1/)
  }
})

test('refuses a legacy-base app before writing public documents', async context => {
  const { directory, html } = await fixture(context, '<script src="/InvestAI/assets/app.js"></script><div id="root"></div>')
  await assert.rejects(prepareCloudflarePages(directory), /Build the app with --base=\//)
  assert.equal(await readFile(join(directory,'index.html'),'utf8'), html)
})
