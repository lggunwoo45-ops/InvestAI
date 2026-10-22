import { createHash } from 'node:crypto'
import { createUsageGuard } from '../market-data/usage.mjs'
import { MarketError } from '../market-data/gate.mjs'

export const sources = Object.freeze([
  { id: 'coindesk', label: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss', host: 'coindesk.com', market: 'crypto', category: 'crypto' },
  { id: 'fed-press', label: 'Federal Reserve Board', url: 'https://www.federalreserve.gov/feeds/press_all.xml', host: 'federalreserve.gov', market: 'macro', category: 'macro' },
])
const MAX_BYTES = 1_500_000
const CACHE_MS = 300_000
const RETRY_MS = 30_000
const STALE_MS = 1_800_000
const aliases = {
  BTC: /\bbitcoin\b(?!\s+cash\b)|\bBTC\b/i,
  ETH: /\bethereum\b|\bether\b|\bETH\b/i,
  XRP: /\bXRP\b/i,
  SOL: /\bsolana\b/i,
  ADA: /\bcardano\b/i,
  DOGE: /\bdogecoin\b/i,
  LINK: /\bchainlink\b/i,
  AVAX: /\bavalanche\b/i,
  DOT: /\bpolkadot\b/i,
  BNB: /\bBNB\b/,
}

function text(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi, entity => {
      const named = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }
      if (named[entity.toLowerCase()]) return named[entity.toLowerCase()]
      const code = entity[2].toLowerCase() === 'x' ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1))
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    }).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function tag(item, name) {
  return text(item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, 'i'))?.[1] ?? '')
}

/** Headline attribution and an original link only; no article bodies or invented summaries. */
export function parseHeadlines(xml, source, now = Date.now()) {
  if (Buffer.byteLength(xml) > MAX_BYTES || /<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)) return []
  const unique = new Map()
  for (const item of (xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? []).slice(0, 100)) {
    const title = tag(item, 'title').slice(0, 300)
    const published = Date.parse(tag(item, 'pubDate'))
    let url
    try {
      url = new URL(tag(item, 'link'))
      if (url.protocol !== 'https:' || url.username || url.password || url.port
        || !(url.hostname === source.host || url.hostname.endsWith(`.${source.host}`))) continue
      url.hash = ''
      for (const key of [...url.searchParams.keys()]) if (key.startsWith('utm_')) url.searchParams.delete(key)
    } catch { continue }
    if (!title || !Number.isFinite(published) || published > now + 300_000) continue
    unique.set(url.href, {
      id: `rss-${source.id}-${createHash('sha256').update(url.href).digest('hex').slice(0, 20)}`,
      title, summary: '', url: url.href, source: source.label, publishedAt: new Date(published).toISOString(),
      category: source.category, relatedMarkets: [source.market],
      // Explicit title mentions are routing hints, never sentiment or a trading signal.
      relatedSymbols: source.market === 'crypto' ? Object.entries(aliases).filter(([, pattern]) => pattern.test(title)).map(([symbol]) => symbol) : [],
      sentiment: 'unassessed', importance: 'unassessed', isMock: false,
    })
  }
  return [...unique.values()].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 50)
}

async function boundedXml(response) {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('feed_too_large')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('empty_feed')
  let bytes = 0, xml = ''
  const decoder = new TextDecoder()
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      bytes += next.value.byteLength
      if (bytes > MAX_BYTES) throw new Error('feed_too_large')
      xml += decoder.decode(next.value, { stream: true })
    }
    return xml + decoder.decode()
  } finally { await reader.cancel().catch(() => {}) }
}

export function createNewsService({ fetchImpl = fetch, now = Date.now, feeds = sources } = {}) {
  const entries = new Map()
  async function load(source) {
    let entry = entries.get(source.id)
    if (!entry) { entry = { checkedAt: null, fetchedAt: null, articles: [], failed: false, pending: null }; entries.set(source.id, entry) }
    const age = entry.fetchedAt === null ? Infinity : Math.max(0, now() - entry.fetchedAt)
    const due = entry.checkedAt === null || now() - entry.checkedAt >= (entry.failed ? RETRY_MS : CACHE_MS)
    if (due && !entry.pending) {
      entry.pending = (async () => {
        try {
          const response = await fetchImpl(source.url, {
            signal: AbortSignal.timeout(7000), redirect: 'error',
            headers: { Accept: 'application/rss+xml, application/xml, text/xml', 'User-Agent': 'InvestAI/1.0 (public RSS headline reader)' },
          })
          if (!response.ok || !/(?:xml|rss)/i.test(response.headers.get('content-type') ?? '')) throw new Error('feed_unavailable')
          const articles = parseHeadlines(await boundedXml(response), source, now())
          if (!articles.length) throw new Error('invalid_feed')
          entry.articles = articles
          entry.fetchedAt = now()
          entry.failed = false
        } catch { entry.failed = true }
        finally { entry.checkedAt = now(); entry.pending = null }
      })()
    }
    if (entry.pending) await entry.pending
    const currentAge = entry.fetchedAt === null ? Infinity : Math.max(0, now() - entry.fetchedAt)
    const usable = currentAge <= STALE_MS
    return {
      id: source.id, label: source.label,
      state: !usable ? 'unavailable' : entry.failed || currentAge >= CACHE_MS ? 'stale' : 'ready',
      fetchedAt: entry.fetchedAt === null ? null : new Date(entry.fetchedAt).toISOString(),
      cached: age < CACHE_MS,
      articles: usable ? entry.articles : [],
    }
  }
  return async () => {
    const results = await Promise.all(feeds.map(load))
    const articles = results.flatMap(result => result.articles)
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    const seen = new Set()
    const deduplicated = articles.filter(article => !seen.has(article.url) && seen.add(article.url)).slice(0, 100)
    return {
      version: 1, source: 'public-rss', fallbackUsed: false,
      status: results.every(result => result.state === 'ready') ? 'ready' : deduplicated.length ? 'partial' : 'unavailable',
      checkedAt: new Date(now()).toISOString(),
      sources: results.map(({ articles: items, ...source }) => ({ ...source, count: items.length })),
      articles: deduplicated,
    }
  }
}

export function createNewsHandler({ origins = [], service = createNewsService(), now = Date.now, trustRailwayProxy = false,
  usage = createUsageGuard({ now, trustRailwayProxy, requestLimit: 60 }) } = {}) {
  const allowed = new Set(origins)
  return async (req, res, next = () => { res.writeHead(404); res.end() }) => {
    if (!req.url?.startsWith('/api/news/')) return next()
    const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Origin' }
    const send = (status, body) => { if (!res.destroyed && !res.writableEnded) { res.writeHead(status, headers); res.end(JSON.stringify(body)) } }
    const origin = req.headers.origin
    if (origin && !allowed.has(origin)) return send(403, { error: 'origin_rejected' })
    if (origin) headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Expose-Headers'] = 'Retry-After'
    if (req.method !== 'GET') { headers.Allow = 'GET'; return send(405, { error: 'read_only' }) }
    if (req.url === '/api/news/health') return send(200, { service: 'investai-news', version: 1 })
    if (req.url !== '/api/news/headlines') return send(404, { error: 'not_found' })
    let release
    try {
      release = usage(req)('rest')
      const result = await service(); send(result.status === 'unavailable' ? 503 : 200, result)
    } catch (error) {
      if (error instanceof MarketError && error.retryAfter) headers['Retry-After'] = String(error.retryAfter)
      send(error instanceof MarketError ? error.status : 503, { error: error instanceof MarketError ? error.message : 'news_unavailable' })
    } finally { release?.() }
  }
}
