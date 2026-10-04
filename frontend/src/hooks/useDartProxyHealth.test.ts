import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DartClient } from '@/services/dart/dartClient'
import { useDartProxyHealth } from './useDartProxyHealth'

const configured = () => new Response(JSON.stringify({ status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' }))

describe('useDartProxyHealth', () => {
  afterEach(() => { vi.useRealTimers() })

  it('recovers when the local proxy becomes available during the bounded retry window', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn()
      .mockRejectedValueOnce(new TypeError('proxy starting'))
      .mockResolvedValueOnce(configured())
    const client = new DartClient(fetcher)
    const { result } = renderHook(() => useDartProxyHealth(client))

    await act(async () => { await Promise.resolve() })
    expect(result.current?.status).toBe('unavailable')
    await act(async () => { await vi.advanceTimersByTimeAsync(1_000) })
    expect(result.current).toEqual({ status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' })
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('bounds automatic retries and rechecks when the window regains focus', async () => {
    vi.useFakeTimers()
    const fetcher = vi.fn().mockRejectedValue(new TypeError('offline'))
    const client = new DartClient(fetcher)
    renderHook(() => useDartProxyHealth(client))

    await act(async () => { await vi.runAllTimersAsync() })
    expect(fetcher).toHaveBeenCalledTimes(3)

    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await Promise.resolve()
    })
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
