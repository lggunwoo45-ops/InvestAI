import { upbitRequestGate, type RequestPriority } from './upbitRequestGate'

type Failure = 'rate-limit' | 'blocked' | 'timeout' | 'network' | 'server' | 'response'
export class UpbitRequestError extends Error {
  constructor(readonly kind: Failure, readonly status?: number) {
    super(`Upbit ${kind}${status ? ` (${status})` : ''}`)
    this.name = 'UpbitRequestError'
  }
}

function retryDelay(value: string | null | undefined) {
  if (!value) return 0
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000
  const date = Date.parse(value)
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0
}

/** Retry transient public-data failures through the existing Origin rate limiter. */
export async function fetchUpbitJson<T>(url: string, signal?: AbortSignal, priority?: RequestPriority): Promise<T> {
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
