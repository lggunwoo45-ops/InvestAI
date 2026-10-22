import { upbitRequestGate, type RequestPriority } from './upbitRequestGate'
import { upbitRelayBase } from './upbitRelay'

type Failure = 'rate-limit' | 'blocked' | 'timeout' | 'network' | 'server' | 'response'
export class UpbitRequestError extends Error {
  constructor(readonly kind: Failure, readonly status?: number, readonly retryAfter = 0) {
    super(`Upbit ${kind}${status ? ` (${status})` : ''}`)
    this.name = 'UpbitRequestError'
  }
}

// Shared across symbols and timeframes in this page. Never persisted or used as
// identity: the server remains authoritative, including after a page reload.
let relayCooldown: { base: string; until: number; status: number } | null = null

function retryDelay(value: string | null | undefined) {
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0
}

/** Retry transient public-data failures through the existing Origin rate limiter. */
export async function fetchUpbitJson<T>(url: string, signal?: AbortSignal, priority?: RequestPriority): Promise<T> {
  const relay = upbitRelayBase()
  if (relay) {
    signal?.throwIfAborted()
    const upstream = new URL(url)
    if (upstream.origin !== 'https://api.upbit.com' || !upstream.pathname.startsWith('/v1/')) throw new UpbitRequestError('response')
    if (relayCooldown?.base === relay && relayCooldown.until > Date.now()) {
      throw new UpbitRequestError('rate-limit', relayCooldown.status, Math.ceil((relayCooldown.until - Date.now()) / 1000))
    }
    const response = await fetch(`${relay}${upstream.pathname.slice(3)}${upstream.search}`, {
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(12_000)]) : AbortSignal.timeout(12_000),
      credentials: 'omit', headers: { Accept: 'application/json' },
    })
    // Respect the server's cooldown without queueing a burst of future requests
    // or silently bypassing protection through the direct exchange endpoint.
    if (!response.ok) {
      const delay = [429, 503].includes(response.status)
        ? Math.min(3_600_000, retryDelay(response.headers.get('Retry-After')) || (response.status === 429 ? 60_000 : 0)) : 0
      if (delay) {
        relayCooldown = { base: relay, status: response.status,
          until: Math.max(Date.now() + delay, relayCooldown?.base === relay ? relayCooldown.until : 0) }
      }
      await response.body?.cancel()
      throw new UpbitRequestError(delay || response.status === 429 ? 'rate-limit' : 'server', response.status, Math.ceil(delay / 1000))
    }
    return response.json() as Promise<T>
  }
  for (let attempt = 0; ; attempt++) {
    try {
      return await upbitRequestGate.run(async () => {
        const controller = new AbortController()
        const abort = () => controller.abort(signal?.reason)
        signal?.addEventListener('abort', abort, { once: true })
        // Queue waiting is not network time. A hung response must release the queue.
        const timer = setTimeout(() => controller.abort(), 12_000)
        try {
          signal?.throwIfAborted()
          const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
          if (response.status === 429 || response.status === 418) {
            upbitRequestGate.defer(Math.max(response.status === 418 ? 60_000 : 10_500, retryDelay(response.headers?.get('Retry-After'))))
            throw new UpbitRequestError(response.status === 418 ? 'blocked' : 'rate-limit', response.status)
          }
          if (!response.ok) throw new UpbitRequestError(response.status >= 500 ? 'server' : 'response', response.status)
          const data = await response.json() as T
          signal?.throwIfAborted()
          return data
        } catch (error) {
          signal?.throwIfAborted()
          if (controller.signal.aborted) throw new UpbitRequestError('timeout')
          if (error instanceof TypeError) throw new UpbitRequestError('network')
          throw error
        } finally {
          clearTimeout(timer)
          signal?.removeEventListener('abort', abort)
        }
      }, signal, priority)
    } catch (error) {
      signal?.throwIfAborted()
      if (attempt >= 2 || !(error instanceof UpbitRequestError) || !['rate-limit', 'timeout', 'network', 'server'].includes(error.kind)) throw error
    }
  }
}
