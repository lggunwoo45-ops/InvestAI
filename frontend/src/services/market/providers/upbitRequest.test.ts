import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const url = 'https://api.upbit.com/v1/ticker/all?quote_currencies=KRW'
const ok = () => ({ ok: true, status: 200, json: async () => [{ market: 'KRW-BTC' }] }) as Response
const fail = (status: number, retryAfter?: string) => ({ ok: false, status, headers: new Headers(retryAfter ? { 'Retry-After': retryAfter } : {}) }) as Response
beforeEach(() => { vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-20T00:00:00Z')) })
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })

describe('Upbit request recovery', () => {
  it('recovers from 429 only after Retry-After and retains the complete result', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(fail(429, '20')).mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetcher)
    const { fetchUpbitJson } = await import('./upbitRequest')
    const request = fetchUpbitJson(url)
    await vi.advanceTimersByTimeAsync(19_999)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(request).resolves.toEqual([{ market: 'KRW-BTC' }])
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('retries a browser network/CORS failure at the normal Origin request interval', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetcher)
    const { fetchUpbitJson } = await import('./upbitRequest')
    const request = fetchUpbitJson(url)
    await vi.advanceTimersByTimeAsync(10_499)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(request).resolves.toHaveLength(1)
  })
  it('bounds retries on persistent server failure', async () => {
    const fetcher = vi.fn().mockResolvedValue(fail(503))
    vi.stubGlobal('fetch', fetcher)
    const { fetchUpbitJson } = await import('./upbitRequest')
    const outcome = expect(fetchUpbitJson(url)).rejects.toMatchObject({ kind: 'server', status: 503 })
    await vi.advanceTimersByTimeAsync(21_000)
    await outcome
    expect(fetcher).toHaveBeenCalledTimes(3)
  })
  it.each([418, 400, 404])('does not retry blocked or permanent HTTP %s failures', async status => {
    const fetcher = vi.fn().mockResolvedValue(fail(status))
    vi.stubGlobal('fetch', fetcher)
    const { fetchUpbitJson } = await import('./upbitRequest')
    await expect(fetchUpbitJson(url)).rejects.toMatchObject({ status })
    await vi.advanceTimersByTimeAsync(90_000)
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('times out a hung request and releases the queue for recovery', async () => {
    let initialSignal: AbortSignal | undefined
    const fetcher = vi.fn().mockImplementationOnce((_url, options: RequestInit) => new Promise((_resolve, reject) => {
      initialSignal = options.signal as AbortSignal
      initialSignal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
    })).mockResolvedValueOnce(ok())
    vi.stubGlobal('fetch', fetcher)
    const { fetchUpbitJson } = await import('./upbitRequest')
    const request = fetchUpbitJson(url)
    await vi.advanceTimersByTimeAsync(12_000)
    await expect(request).resolves.toHaveLength(1)
    expect(initialSignal?.aborted).toBe(true)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
  it('cancels queued retries when the screen changes', async () => {
    const fetcher = vi.fn().mockResolvedValue(fail(429))
    vi.stubGlobal('fetch', fetcher)
    const { fetchUpbitJson } = await import('./upbitRequest')
    const controller = new AbortController()
    const outcome = expect(fetchUpbitJson(url, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
    await vi.advanceTimersByTimeAsync(1000)
    controller.abort()
    await outcome
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetcher).toHaveBeenCalledOnce()
  })
})
