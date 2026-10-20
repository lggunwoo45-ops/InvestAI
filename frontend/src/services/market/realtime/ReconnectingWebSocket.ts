import type { MarketConnectionStatus } from '@/types/market'

interface ReconnectingWebSocketOptions {
  createUrl: () => string
  onOpen: (socket: WebSocket) => void
  onMessage: (event: MessageEvent) => void
  onStatus: (status: MarketConnectionStatus, attempt: number) => void
  beforeConnect?: (signal: AbortSignal) => Promise<unknown>
  idleTimeoutMs?: number
}

const maximumReconnectDelay = 30_000

/** Owns reconnect policy so exchange adapters only parse provider messages. */
export class ReconnectingWebSocket {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private closedByClient = false
  private pendingConnection: AbortController | null = null
  private watchdog: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly options: ReconnectingWebSocketOptions) {}

  connect() {
    this.closedByClient = false
    this.openSocket()
  }

  close() {
    this.closedByClient = true
    this.pendingConnection?.abort()
    this.clearWatchdog()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close()
    this.socket = null
  }

  reconnect() {
    if (this.closedByClient) return
    const socket = this.socket
    this.socket = null
    this.clearWatchdog()
    socket?.close()
    this.scheduleReconnect()
  }

  private clearWatchdog() {
    if (this.watchdog) clearTimeout(this.watchdog)
    this.watchdog = null
  }

  private watch(milliseconds: number) {
    this.clearWatchdog()
    this.watchdog = setTimeout(() => this.reconnect(), milliseconds)
  }

  private openSocket() {
    if (this.closedByClient) return
    this.options.onStatus(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting', this.reconnectAttempt)
    if (this.options.beforeConnect) {
      const controller = new AbortController()
      this.pendingConnection = controller
      void this.options.beforeConnect(controller.signal).then(() => {
        if (!controller.signal.aborted && !this.closedByClient) this.createSocket()
      }).catch(() => {
        if (!controller.signal.aborted && !this.closedByClient) this.scheduleReconnect()
      })
      return
    }
    this.createSocket()
  }

  private scheduleReconnect() {
    if (this.closedByClient) return
    this.clearWatchdog()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectAttempt += 1
    this.options.onStatus('reconnecting', this.reconnectAttempt)
    const delay = Math.min(1_000 * (2 ** (this.reconnectAttempt - 1)), maximumReconnectDelay)
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.openSocket() }, delay)
  }

  private createSocket() {
    const socket = new WebSocket(this.options.createUrl())
    this.socket = socket
    // Time spent in the exchange rate-limit queue is deliberately excluded.
    this.watch(15_000)

    socket.addEventListener('open', () => {
      if (this.closedByClient || this.socket !== socket) return
      this.reconnectAttempt = 0
      this.clearWatchdog()
      if (this.options.idleTimeoutMs) this.watch(this.options.idleTimeoutMs)
      this.options.onStatus('live', 0)
      this.options.onOpen(socket)
    })
    socket.addEventListener('message', event => {
      if (this.closedByClient || this.socket !== socket) return
      if (this.options.idleTimeoutMs) this.watch(this.options.idleTimeoutMs)
      this.options.onMessage(event)
    })
    socket.addEventListener('error', () => { if (this.socket === socket) this.reconnect() })
    socket.addEventListener('close', () => {
      if (this.socket === socket) { this.socket = null; this.scheduleReconnect() }
    })
  }
}
