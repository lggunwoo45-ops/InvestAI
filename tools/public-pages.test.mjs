import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../site-root/', import.meta.url))
const origin = 'https://lggunwoo45-ops.github.io'
async function htmlFiles(directory = root) {
  const paths = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, item.name)
    if (item.isDirectory()) paths.push(...await htmlFiles(path))
    else if (item.name.endsWith('.html')) paths.push(path)
  }
  return paths
}

test('public documents have readable HTML, valid internal destinations and matching verification', async () => {
  const files = await htmlFiles()
  assert.ok(files.length >= 2)
  const routeSource = await readFile(new URL('../frontend/src/app/AppRoutes.tsx', import.meta.url), 'utf8')
  const appRoutes = new Set([...routeSource.matchAll(/path="([a-z-]+)"/g)].map(match => match[1]))
  for (const path of files) {
    const html = await readFile(path, 'utf8')
    assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1, path)
    assert.match(html, /<meta name="google-adsense-account" content="ca-pub-6900369987335133">/, path)
    assert.doesNotMatch(html, /<script\b|adsbygoogle\.js|gtag\(/, path)
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
    assert.equal(ids.length, new Set(ids).size, `duplicate IDs: ${path}`)
    for (const [, raw] of html.matchAll(/href="([^"]+)"/g)) {
      const href = raw.replaceAll('&amp;', '&')
      const url = new URL(href, origin + '/' + path.slice(root.length).replaceAll('\\', '/'))
      if (url.origin !== origin) continue
      if (url.pathname.startsWith('/InvestAI/')) {
        const route = url.pathname.slice('/InvestAI/'.length).split('/')[0]
        if (route && !route.includes('.')) assert.ok(appRoutes.has(route), `unknown app route: ${href}`)
        continue
      }
      const target = join(root, url.pathname, url.pathname.endsWith('/') ? 'index.html' : '')
      const targetHtml = await readFile(target, 'utf8')
      if (url.hash) assert.ok(targetHtml.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`), `missing anchor: ${href} in ${path}`)
    }
  }
})

test('sitemap contains only published public pages and robots permits review', async () => {
  const sitemap = await readFile(join(root, 'sitemap.xml'), 'utf8')
  const entries = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => new URL(match[1]))
  assert.equal(entries.length, (await htmlFiles()).length)
  assert.equal(new Set(entries.map(url => url.href)).size, entries.length)
  for (const url of entries) {
    assert.equal(url.origin, origin)
    await readFile(join(root, url.pathname, 'index.html'), 'utf8')
  }
  const robots = await readFile(join(root, 'robots.txt'), 'utf8')
  assert.match(robots, /Allow: \/\n/)
  assert.match(robots, /Sitemap: https:\/\/lggunwoo45-ops.github.io\/sitemap.xml/)
})
