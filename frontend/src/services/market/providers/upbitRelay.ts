import type { MarketConnectionStatus } from '@/types/market'

let localRelay: string | null = null

/** Distinguish Vite's gateway from the existing static Windows demo launcher. */
export async function initializeUpbitRelay() {
  localRelay = null
  if (import.meta.env.VITE_UPBIT_RELAY_URL?.trim() || import.meta.env.MODE === 'test'
    || typeof window === 'undefined' || !['localhost', '127.0.0.1'].includes(window.location.hostname)) return
  try {
    const response = await fetch('/api/upbit/health', { credentials: 'omit', signal: AbortSignal.timeout(800) })
    const health = response.ok ? await response.json() : null
    if (health?.service === 'investai-upbit' && health.version === 1) localRelay = '/api/upbit'
  } catch { /* Static desktop builds keep their existing direct data connection. */ }
}

export function upbitRelayBase(): string | null {
  const configured = import.meta.env.VITE_UPBIT_RELAY_URL?.trim()
  if (configured) {
    const url = new URL(configured)
    if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))
      || url.username || url.password || url.search || url.hash || url.pathname.replace(/\/$/, '') !== '/api/upbit') throw new Error('Invalid Upbit relay URL')
    return url.href.replace(/\/$/, '')
  }
  // Vite dev/preview owns this route. Static Pages keeps the paced direct path
  // until an operator configures the deployed relay; never probe random proxies.
  return localRelay
}

interface RelayOptions {
  url: string
  onStatus: (status: MarketConnectionStatus, attempt: number) => void
  onMessage: (event: MessageEvent, receivedAt: number) => void
}

/** EventSource transports server-owned Upbit WebSockets; it is not a cached quote feed. */
export class UpbitRelayConnection {
  private source: EventSource | null = null
  private timer: ReturnType<typeof setTimeout> | null = null
  private watchdog: ReturnType<typeof setTimeout> | null = null
  private closed = false
  private attempt = 0
  constructor(private readonly options: RelayOptions) {}
  connect() {
    this.closed = false
    this.options.onStatus(this.attempt ? 'reconnecting' : 'connecting', this.attempt)
    const source = new EventSource(this.options.url)
    this.source = source; this.watch(15_000)
    source.addEventListener('status', event => {
      if (this.source !== source) return
      try {
        const value = JSON.parse((event as MessageEvent).data)
        if (!['live', 'connecting', 'reconnecting'].includes(value.status) || !Number.isInteger(value.attempt) || value.attempt < 0) return
        if (value.status === 'live') this.attempt = 0
        this.watch(90_000)
        this.options.onStatus(value.status, value.attempt)
      } catch { /* Invalid status cannot promote the feed. */ }
    })
    source.addEventListener('quote', event => {
      if (this.source !== source) return
      try {
        const value = JSON.parse((event as MessageEvent).data)
        if (!Number.isFinite(value.ageMs) || value.ageMs < 0 || value.ageMs > 90_000 || !value.message || typeof value.message !== 'object') return
        this.watch(90_000)
        this.options.onMessage(new MessageEvent('message', { data: JSON.stringify(value.message) }), Date.now() - value.ageMs)
      } catch { /* Provider validation also checks market, quote and candle timestamps. */ }
    })
    source.addEventListener('error', () => { if (this.source === source) this.reconnect() })
    source.addEventListener('cooldown', event => {
      if (this.source !== source) return
      try {
        const { retryAfter } = JSON.parse((event as MessageEvent).data)
        if (!Number.isFinite(retryAfter) || retryAfter <= 0 || retryAfter > 3600) return
        this.reconnect(retryAfter * 1000)
      } catch { /* Invalid cooldown cannot suppress connection attempts. */ }
    })
  }
  private watch(ms: number) { if (this.watchdog) clearTimeout(this.watchdog); this.watchdog = setTimeout(() => this.reconnect(), ms) }
  close() {
    this.closed = true; this.source?.close(); this.source = null
    if (this.timer) clearTimeout(this.timer)
    if (this.watchdog) clearTimeout(this.watchdog)
  }
  reconnect(minimumDelay = 0) {
    if (this.closed) return
    this.source?.close(); this.source = null
    if (this.watchdog) clearTimeout(this.watchdog)
    if (this.timer) clearTimeout(this.timer)
    this.attempt++; this.options.onStatus('reconnecting', this.attempt)
    this.timer = setTimeout(() => this.connect(), Math.max(minimumDelay, Math.min(1000 * 2 ** (this.attempt - 1), 30_000)))
  }
}
