// Run against a freshly started local relay for a cold-data measurement.
// No stored chart previews, simulated data or browser rate-limit bypasses.
const base = process.argv[2] ?? 'http://127.0.0.1:8790/api/upbit'
const market = process.argv[3] ?? 'KRW-BTC'
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/upbit$/.test(base) || !/^(KRW|BTC|USDT)-[A-Z0-9]+$/.test(market)) throw new Error('Use a local relay URL and valid market code')
const start = performance.now()
async function get(path) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(15_000) })
  const data = await response.json()
  if (!response.ok || !Array.isArray(data) || !data.length) throw new Error(`Request failed: ${path} (${response.status})`)
  console.log(JSON.stringify({ path, elapsedMs: Math.round(performance.now() - start), rows: data.length, timing: response.headers.get('server-timing') }))
}
await get('/ticker/all?quote_currencies=KRW,BTC,USDT')
await Promise.all(['days', 'minutes/60', 'minutes/240'].map(frame => get(`/candles/${frame}?market=${market}&count=120`)))
const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15_000)
try {
  const response = await fetch(`${base}/stream?market=${market}`, { signal: controller.signal })
  if (!response.ok) throw new Error(`Stream failed (${response.status})`)
  let buffer = '', received = false; const decoder = new TextDecoder()
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true })
    let end
    while ((end = buffer.indexOf('\n\n')) >= 0) {
      const event = buffer.slice(0, end); buffer = buffer.slice(end + 2)
      if (!event.startsWith('event: quote\n')) continue
      const data = JSON.parse(event.slice(event.indexOf('data: ') + 6))
      if (data.message.type === 'ticker' && data.message.code === market && data.ageMs < 5000) {
        console.log(JSON.stringify({ market, firstLiveTickerMs: Math.round(performance.now() - start), replayAgeMs: data.ageMs }))
        received = true; break
      }
    }
    if (received) break
  }
  if (!received) throw new Error('No live ticker received')
} finally { clearTimeout(timeout); controller.abort() }
