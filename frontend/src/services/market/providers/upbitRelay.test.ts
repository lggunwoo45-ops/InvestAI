import { afterEach, expect, it, vi } from 'vitest'
import { UpbitRelayConnection, upbitRelayBase, initializeUpbitRelay } from './upbitRelay'
import { fetchUpbitJson } from './upbitRequest'

afterEach(async () => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); await initializeUpbitRelay() })
it('enables only a verified local gateway and preserves static desktop builds', async () => {
  vi.stubEnv('MODE', 'production'); vi.stubEnv('VITE_UPBIT_RELAY_URL', '')
  const fetcher = vi.fn().mockResolvedValueOnce(new Response('{"service":"investai-upbit","version":1}'))
    .mockResolvedValueOnce(new Response('<html>static demo</html>'))
    .mockRejectedValueOnce(new TypeError('unavailable'))
  vi.stubGlobal('fetch', fetcher)
  await initializeUpbitRelay(); expect(upbitRelayBase()).toBe('/api/upbit')
  await initializeUpbitRelay(); expect(upbitRelayBase()).toBeNull()
  await initializeUpbitRelay(); expect(upbitRelayBase()).toBeNull()
  expect(fetcher).toHaveBeenCalledTimes(3)
})
it('uses only the configured HTTPS relay and preserves the paced direct path when unconfigured', () => {
  vi.stubEnv('VITE_UPBIT_RELAY_URL', '')
  expect(upbitRelayBase()).toBeNull()
  vi.stubEnv('VITE_UPBIT_RELAY_URL', 'https://quotes.example/api/upbit/')
  expect(upbitRelayBase()).toBe('https://quotes.example/api/upbit')
  for (const value of ['http://remote.example/api/upbit', 'https://user:secret@quotes.example/api/upbit', 'https://quotes.example/other', 'https://quotes.example/api/upbit?token=secret']) {
    vi.stubEnv('VITE_UPBIT_RELAY_URL', value); expect(upbitRelayBase).toThrow()
  }
})
it('requests cold histories immediately through the relay and does not fall back on a server failure', async () => {
  vi.useFakeTimers(); vi.stubEnv('VITE_UPBIT_RELAY_URL', 'https://quotes.example/api/upbit')
  const fetcher = vi.fn().mockResolvedValue(new Response('[]'))
  vi.stubGlobal('fetch', fetcher)
  // Each fetch response must have a distinct readable body.
  fetcher.mockImplementation(async () => new Response('[]'))
  await Promise.all(['days', 'minutes/60', 'minutes/240'].map(frame => fetchUpbitJson(`https://api.upbit.com/v1/candles/${frame}?market=KRW-BTC&count=120`)))
  expect(fetcher).toHaveBeenCalledTimes(3)
  expect(fetcher.mock.calls.every(call => String(call[0]).startsWith('https://quotes.example/api/upbit/'))).toBe(true)
  fetcher.mockResolvedValueOnce(new Response('{}', { status: 503 }))
  await expect(fetchUpbitJson('https://api.upbit.com/v1/candles/days?market=KRW-ETH&count=120')).rejects.toMatchObject({ status: 503 })
  expect(fetcher).toHaveBeenCalledTimes(4)
})
it('preserves replay age, handles reconnects and ignores events after close', () => {
  vi.useFakeTimers(); vi.setSystemTime(100_000)
  class Source extends EventTarget {
    static instance: Source
    close = vi.fn()
    constructor() { super(); Source.instance = this }
    emit(type: string, data: unknown) { this.dispatchEvent(new MessageEvent(type, { data: JSON.stringify(data) })) }
  }
  vi.stubGlobal('EventSource', Source)
  const onStatus = vi.fn(), onMessage = vi.fn()
  const stream = new UpbitRelayConnection({ url: '/api/upbit/stream?market=KRW-BTC', onStatus, onMessage })
  stream.connect(); const source = Source.instance
  source.emit('status', { status: 'live', attempt: 0 })
  expect(onStatus).toHaveBeenLastCalledWith('live', 0)
  source.emit('quote', { message: { type: 'ticker', code: 'KRW-BTC' }, ageMs: 3000 })
  expect(onMessage.mock.calls[0][1]).toBe(97_000)
  for (const ageMs of [-1, 90_001, '0']) source.emit('quote', { message: {}, ageMs })
  expect(onMessage).toHaveBeenCalledOnce()
  source.emit('error', {})
  expect(onStatus).toHaveBeenLastCalledWith('reconnecting', 1)
  stream.close(); vi.advanceTimersByTime(30_000)
  source.emit('quote', { message: {}, ageMs: 0 })
  expect(onMessage).toHaveBeenCalledOnce(); expect(Source.instance).toBe(source)
})
