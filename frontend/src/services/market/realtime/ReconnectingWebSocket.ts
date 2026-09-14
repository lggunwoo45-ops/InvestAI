import type { MarketConnectionStatus } from '@/types/market'

interface ReconnectingWebSocketOptions {
  createUrl: () => string
  onOpen: (socket: WebSocket) => void
  onMessage: (event: MessageEvent) => void
  onStatus: (status: MarketConnectionStatus, attempt: number) => void
}

const maximumReconnectDelay = 30_000

/** Owns reconnect policy so exchange adapters only parse provider messages. */
export class ReconnectingWebSocket {
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private closedByClient = false

  constructor(private readonly options: ReconnectingWebSocketOptions) {}

  connect() {
    this.closedByClient = false
    this.openSocket()
  }

  close() {
    this.closedByClient = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.socket?.close()
    this.socket = null
  }

  private openSocket() {
    this.options.onStatus(this.reconnectAttempt === 0 ? 'connecting' : 'reconnecting', this.reconnectAttempt)
    const socket = new WebSocket(this.options.createUrl())
    this.socket = socket

    socket.addEventListener('open', () => {
      this.reconnectAttempt = 0
      this.options.onStatus('live', 0)
      this.options.onOpen(socket)
    })
    socket.addEventListener('message', this.options.onMessage)
    socket.addEventListener('error', () => socket.close())
    socket.addEventListener('close', () => {
      if (this.closedByClient) return
      this.reconnectAttempt += 1
      this.options.onStatus('reconnecting', this.reconnectAttempt)
      const delay = Math.min(1_000 * (2 ** (this.reconnectAttempt - 1)), maximumReconnectDelay)
      this.reconnectTimer = setTimeout(() => this.openSocket(), delay)
    })
  }
}
