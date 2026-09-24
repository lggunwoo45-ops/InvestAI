const OPEN_DART_LIST_URL = 'https://opendart.fss.or.kr/api/list.json'
const UPSTREAM_TIMEOUT_MS = 8_000
const MAX_RESPONSE_BYTES = 1_000_000
const allowedOrigins = new Set(['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'])

function classify(reportName) {
  if (/정정|기재정정|첨부정정/.test(reportName)) return 'correction'
  if (/사업보고서|반기보고서|분기보고서/.test(reportName)) return 'periodic'
  if (/주요사항보고서|유상증자|무상증자|전환사채|신주인수권부사채|회사합병|영업양수도|최대주주|소송|횡령|배임|상장폐지|거래정지/.test(reportName)) return 'material'
  return 'other'
}

function safeText(value, limit = 300) { return typeof value === 'string' ? value.trim().slice(0, limit) : '' }
function viewerUrl(receiptNo) { return /^\d{8,20}$/.test(receiptNo) ? `https://dart.fss.or.kr/dsaf001/main.do?rcpNo=${receiptNo}` : null }

function result(status, sourceMode, message, disclosures = [], fetchedAt = null) { return { status, sourceMode, message, disclosures, fetchedAt } }
function sendJson(res, statusCode, payload, origin) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  if (origin && allowedOrigins.has(origin)) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin') }
  res.end(JSON.stringify(payload))
}

function normalizeList(payload) {
  if (!Array.isArray(payload?.list)) return []
  return payload.list.slice(0, 10).flatMap((item) => {
    const receiptNo = safeText(item?.rcept_no, 20)
    const reportName = safeText(item?.report_nm)
    const submitted = safeText(item?.rcept_dt, 8)
    if (!receiptNo || !reportName || !/^\d{8}$/.test(submitted)) return []
    const disclosureType = classify(reportName)
    return [{
      id: `dart-${receiptNo}`, receiptNo, corpCode: safeText(item?.corp_code, 8), stockCode: safeText(item?.stock_code, 8), corpName: safeText(item?.corp_name), reportName,
      submittedAt: `${submitted.slice(0, 4)}-${submitted.slice(4, 6)}-${submitted.slice(6, 8)}`, disclosureType, detailUrl: viewerUrl(receiptNo), source: 'OpenDART',
      isCorrection: disclosureType === 'correction', isMaterial: disclosureType === 'material', isPeriodic: disclosureType === 'periodic',
    }]
  })
}

async function readBoundedJson(response) {
  const text = await response.text()
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error('response-too-large')
  return JSON.parse(text)
}

/** Closed OpenDART list proxy with injectable key/fetch for network-free tests. */
export function createDartProxyHandler({ apiKey = process.env.DART_API_KEY ?? '', fetchImpl = globalThis.fetch, now = () => new Date() } = {}) {
  return async function dartProxyHandler(req, res) {
    const origin = req.headers.origin
    if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return sendJson(res, 405, result('error', 'disabled', 'Only GET is supported.'), origin) }
    const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1:8788')
    if (requestUrl.pathname !== '/api/dart/disclosures') return sendJson(res, 404, result('error', 'disabled', 'Endpoint not found.'), origin)
    if ([...requestUrl.searchParams.keys()].some((key) => key !== 'stockCode' && key !== 'corpCode')) return sendJson(res, 400, result('error', 'disabled', 'Only stockCode and corpCode are accepted.'), origin)
    if (!apiKey.trim()) return sendJson(res, 200, result('disabled', 'disabled', 'DART API key is not configured.'), origin)

    const corpCode = requestUrl.searchParams.get('corpCode')?.trim() ?? ''
    const stockCode = requestUrl.searchParams.get('stockCode')?.trim() ?? ''
    if (!/^\d{8}$/.test(corpCode)) return sendJson(res, 200, result('mapping_unavailable', 'disabled', 'DART corporation code mapping is not available for this instrument.'), origin)
    if (stockCode && !/^\d{6}$/.test(stockCode)) return sendJson(res, 400, result('error', 'disabled', 'Invalid stock code.'), origin)

    const upstream = new URL(OPEN_DART_LIST_URL)
    upstream.searchParams.set('crtfc_key', apiKey)
    upstream.searchParams.set('corp_code', corpCode)
    upstream.searchParams.set('page_count', '10')
    upstream.searchParams.set('sort', 'date')
    upstream.searchParams.set('sort_mth', 'desc')
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
    try {
      const response = await fetchImpl(upstream, { method: 'GET', signal: controller.signal, redirect: 'error', headers: { Accept: 'application/json' } })
      if (!response.ok) throw new Error('upstream-unavailable')
      const payload = await readBoundedJson(response)
      if (payload?.status && payload.status !== '000') return sendJson(res, 502, result('unavailable', 'live', 'Disclosure data is unavailable.'), origin)
      const disclosures = normalizeList(payload)
      return sendJson(res, 200, result('ready', 'live', disclosures.length ? 'Recent DART disclosures loaded.' : 'No recent DART disclosures were returned.', disclosures, now().toISOString()), origin)
    } catch {
      return sendJson(res, 502, result('error', 'live', 'Disclosure data is unavailable.'), origin)
    } finally { clearTimeout(timer) }
  }
}
