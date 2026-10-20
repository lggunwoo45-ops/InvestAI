import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sources } from './news.mjs'

export async function verifyNews({ base, origin = 'https://lggunwoo45-ops.github.io', fetchImpl = fetch } = {}) {
  const url = new URL(base)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
    || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Use an HTTPS server origin or HTTP loopback')
  if (new URL(origin).origin !== origin) throw new Error('Invalid browser origin')
  const response = await fetchImpl(new URL('/api/news/headlines', url), { headers: { Origin: origin }, credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(12000) })
  if (!response.ok || response.headers.get('access-control-allow-origin') !== origin) throw new Error('News unavailable or website origin blocked')
  const data = await response.json()
  if (data.version !== 1 || data.source !== 'public-rss' || data.fallbackUsed !== false || data.status !== 'ready'
    || !Array.isArray(data.articles) || !data.articles.length || data.articles.length > 100
    || !Array.isArray(data.sources) || data.sources.length !== sources.length || !Number.isFinite(Date.parse(data.checkedAt))) throw new Error('Unexpected news contract')
  for (const source of sources) {
    const status = data.sources.find(row => row.id === source.id)
    const articles = data.articles.filter(article => article.source === source.label)
    const age = Date.parse(data.checkedAt) - Date.parse(status?.fetchedAt)
    if (!status || status.state !== 'ready' || !Number.isFinite(age) || age < 0 || age >= 300000 || !articles.length || status.count !== articles.length) throw new Error(`Source unavailable: ${source.id}`)
    for (const article of articles) {
      const link = new URL(article.url)
      if (article.isMock !== false || article.summary !== '' || article.sentiment !== 'unassessed' || article.importance !== 'unassessed'
        || typeof article.title !== 'string' || !article.title || !Number.isFinite(Date.parse(article.publishedAt))
        || link.protocol !== 'https:' || link.username || link.password || !(link.hostname === source.host || link.hostname.endsWith(`.${source.host}`))) throw new Error('Unsafe headline provenance')
    }
  }
  return { status: 'ready', articles: data.articles.length, sources: data.sources.map(source => ({ id: source.id, count: source.count, fetchedAt: source.fetchedAt })) }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await verifyNews({ base: process.env.NEWS_PROXY_URL, origin: process.env.NEWS_SITE_ORIGIN }), null, 2)) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
