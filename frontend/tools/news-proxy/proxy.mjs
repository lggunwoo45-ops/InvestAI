const MAX_RESPONSE_BYTES = 1_000_000
const UPSTREAM_TIMEOUT_MS = 8_000

export const sourceAllowlist = Object.freeze({
  'fed-press': Object.freeze({
    id: 'fed-press',
    label: 'Federal Reserve Board',
    url: 'https://www.federalreserve.gov/feeds/press_all.xml',
    category: 'macro',
    market: 'macro',
  }),
})

const allowedOrigins = new Set([
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
])

function decodeXml(value) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}

function plainText(value, limit) {
  return decodeXml(value).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit)
}

function tagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]?.trim() ?? ''
}

function safeArticleUrl(value) {
  try {
    const url = new URL(plainText(value, 2_048))
    return url.protocol === 'https:' && (url.hostname === 'federalreserve.gov' || url.hostname.endsWith('.federalreserve.gov')) ? url.href : undefined
  } catch { return undefined }
}

function stableId(value) {
  let hash = 2166136261
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619)
  return (hash >>> 0).toString(36)
}

/** Bounded RSS 2.0 normalization. It never evaluates markup or infers symbols. */
export function parseRss(xml, source) {
  if (!xml || Buffer.byteLength(xml) > MAX_RESPONSE_BYTES || /<!\s*(?:DOCTYPE|ENTITY)/i.test(xml)) return []
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? []
  return items.slice(0, 100).flatMap((item) => {
    const title = plainText(tagValue(item, 'title'), 300)
    const published = new Date(plainText(tagValue(item, 'pubDate'), 100))
    if (!title || !Number.isFinite(published.getTime())) return []
    const url = safeArticleUrl(tagValue(item, 'link'))
    const identifier = plainText(tagValue(item, 'guid'), 2_048) || url || `${title}|${published.toISOString()}`
    return [{
      id: `rss-${source.id}-${stableId(identifier)}`,
      title,
      summary: plainText(tagValue(item, 'description'), 800),
      ...(url ? { url } : {}),
      publishedAt: published.toISOString(),
      source: source.label,
      category: source.category,
      relatedMarkets: [source.market],
      relatedSymbols: [],
      sentiment: 'unassessed',
      importance: 'unassessed',
      isMock: false,
    }]
  })
}

async function readBoundedText(response) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new ProxyError('UPSTREAM_TOO_LARGE', 'The RSS source exceeded the response limit.')
  if (!response.body) {
    const text = await response.text()
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new ProxyError('UPSTREAM_TOO_LARGE', 'The RSS source exceeded the response limit.')
    return text
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let bytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new ProxyError('UPSTREAM_TOO_LARGE', 'The RSS source exceeded the response limit.')
    }
    text += decoder.decode(value, { stream: true })
  }
  return text + decoder.decode()
}

class ProxyError extends Error {
  constructor(code, message) { super(message); this.code = code }
}

function responseBody(source, status, articles, errors, now) {
  return {
    source: source?.id ?? null,
    sourceLabel: source?.label ?? 'Unknown source',
    status,
    fetchedAt: now().toISOString(),
    cacheStatus: 'none',
    fallbackUsed: false,
    articles,
    errors,
  }
}

function sendJson(res, statusCode, payload, origin) {
  const body = JSON.stringify(payload)
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.end(body)
}

/** Creates a closed proxy handler with injectable fetch/time for network-free tests. */
export function createNewsProxyHandler({ fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  return async function newsProxyHandler(req, res) {
    const origin = req.headers.origin
    const unknown = responseBody(null, 'unavailable', [], [], now)
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET')
      return sendJson(res, 405, { ...unknown, errors: [{ code: 'METHOD_NOT_ALLOWED', message: 'Only GET is supported.' }] }, origin)
    }

    const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1:8787')
    if (requestUrl.pathname !== '/api/news/rss') return sendJson(res, 404, { ...unknown, errors: [{ code: 'NOT_FOUND', message: 'Endpoint not found.' }] }, origin)
    if ([...requestUrl.searchParams.keys()].some((key) => key !== 'source')) return sendJson(res, 400, { ...unknown, errors: [{ code: 'INVALID_QUERY', message: 'Only the source identifier is accepted.' }] }, origin)

    const source = sourceAllowlist[requestUrl.searchParams.get('source')]
    if (!source) return sendJson(res, 400, { ...unknown, errors: [{ code: 'UNSUPPORTED_SOURCE', message: 'The requested source is not allowlisted.' }] }, origin)
    if (!source.url.startsWith('https://')) return sendJson(res, 500, responseBody(source, 'unavailable', [], [{ code: 'SOURCE_MISCONFIGURED', message: 'The RSS source is not configured safely.' }], now), origin)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
    try {
      const response = await fetchImpl(source.url, {
        method: 'GET', signal: controller.signal, redirect: 'error',
        headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
      })
      if (!response.ok) throw new ProxyError('UPSTREAM_UNAVAILABLE', 'Unable to load the RSS source.')
      const contentType = response.headers.get('content-type')
      if (contentType && !/\b(?:xml|rss)\b/i.test(contentType)) throw new ProxyError('INVALID_FEED', 'The RSS source returned an invalid content type.')
      const xml = await readBoundedText(response)
      const articles = parseRss(xml, source)
      if (!articles.length) throw new ProxyError('INVALID_FEED', 'The RSS source did not contain valid articles.')
      return sendJson(res, 200, responseBody(source, 'ok', articles, [], now), origin)
    } catch (error) {
      const known = error instanceof ProxyError
      const code = known ? error.code : error?.name === 'AbortError' ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE'
      const message = known ? error.message : code === 'UPSTREAM_TIMEOUT' ? 'The RSS source timed out.' : 'Unable to load the RSS source.'
      return sendJson(res, 502, responseBody(source, 'unavailable', [], [{ code, message }], now), origin)
    } finally { clearTimeout(timer) }
  }
}
