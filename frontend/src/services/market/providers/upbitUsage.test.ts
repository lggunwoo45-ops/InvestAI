import { afterEach, beforeEach, expect, it, vi } from 'vitest'

const base = 'https://quotes.example/api/upbit'
const btc = 'https://api.upbit.com/v1/candles/days?market=KRW-BTC&count=120'
const eth = btc.replace('BTC', 'ETH')
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(100_000)
  vi.stubEnv('VITE_UPBIT_RELAY_URL', base)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it.each([429, 503])('HTTP %s cooldown suppresses new symbols and retries until expiry, without direct fallback', async status => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{}', { status, headers: { 'Retry-After': '60' } }))
    .mockImplementation(async () => new Response('[]'))
  vi.stubGlobal('fetch', fetcher)
  const { fetchUpbitJson } = await import('./upbitRequest')
  await expect(fetchUpbitJson(btc)).rejects.toMatchObject({ kind: 'rate-limit', retryAfter: 60 })
  await vi.advanceTimersByTimeAsync(59_000)
  await expect(fetchUpbitJson(eth)).rejects.toMatchObject({ retryAfter: 1 })
  expect(fetcher).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(1000)
  await expect(fetchUpbitJson(eth)).resolves.toEqual([])
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls.every(([url]) => url.startsWith(base))).toBe(true)
})

it('supports date Retry-After, caps malformed huge delays and preserves cancellation during a cooldown', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('{}', { status: 429, headers: { 'Retry-After': new Date(180_000).toUTCString() } }))
  vi.stubGlobal('fetch', fetcher)
  const { fetchUpbitJson } = await import('./upbitRequest')
  await expect(fetchUpbitJson(btc)).rejects.toMatchObject({ retryAfter: 80 })
  const abort = new AbortController(); abort.abort()
  await expect(fetchUpbitJson(eth, abort.signal)).rejects.toMatchObject({ name: 'AbortError' })
  await vi.advanceTimersByTimeAsync(80_000)
  fetcher.mockResolvedValue(new Response('{}', { status: 503, headers: { 'Retry-After': '9999999999' } }))
  await expect(fetchUpbitJson(eth)).rejects.toMatchObject({ retryAfter: 3600 })
})

it('ordinary failures do not add a delay, and a success cannot shorten another concurrent request cooldown', async () => {
  let finish: (value: Response) => void = () => {}
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    .mockResolvedValueOnce(new Response('{}', { status: 503, headers: { 'Retry-After': '60' } }))
  vi.stubGlobal('fetch', fetcher)
  const { fetchUpbitJson } = await import('./upbitRequest')
  const first = fetchUpbitJson(btc)
  await expect(fetchUpbitJson(eth)).rejects.toMatchObject({ retryAfter: 60 })
  finish(new Response('[]')); await first
  await expect(fetchUpbitJson(btc)).rejects.toMatchObject({ retryAfter: 60 })
  expect(fetcher).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(60_000)
  fetcher.mockResolvedValueOnce(new Response('{}', { status: 503 })).mockResolvedValueOnce(new Response('[]'))
  await expect(fetchUpbitJson(btc)).rejects.toMatchObject({ kind: 'server', retryAfter: 0 })
  await expect(fetchUpbitJson(btc)).resolves.toEqual([])
})

it('stream cooldown closes the old connection, ignores its late errors, and reconnects only after the requested wait', async () => {
  class Source extends EventTarget {
    static instances: Source[] = []
    close = vi.fn()
    constructor() { super(); Source.instances.push(this) }
    emit(type: string, data: unknown) { this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) })) }
  }
  vi.stubGlobal('EventSource', Source)
  const { UpbitRelayConnection } = await import('./upbitRelay')
  const onStatus = vi.fn()
  const stream = new UpbitRelayConnection({ url: base + '/stream?market=KRW-BTC', onStatus, onMessage: vi.fn() })
  stream.connect()
  const source = Source.instances[0]
  for (const retryAfter of [0, -1, '60', 3601]) source.emit('cooldown', { retryAfter })
  expect(source.close).not.toHaveBeenCalled()
  source.emit('cooldown', { retryAfter: 60 }); source.emit('error', {})
  expect(source.close).toHaveBeenCalledOnce()
  expect(onStatus).toHaveBeenLastCalledWith('reconnecting', 1)
  await vi.advanceTimersByTimeAsync(59_999)
  expect(Source.instances).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(Source.instances).toHaveLength(2)
  Source.instances[1].emit('cooldown', { retryAfter: 60 })
  stream.close(); await vi.advanceTimersByTimeAsync(60_000)
  expect(Source.instances).toHaveLength(2)
})
