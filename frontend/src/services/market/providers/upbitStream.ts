import { ReconnectingWebSocket } from '../realtime/ReconnectingWebSocket'
import type { MarketConnectionStatus } from '@/types/market'
import { decodeWebSocketData } from './providerUtils'
import { upbitRequestGate } from './upbitRequestGate'
import { upbitRelayBase, UpbitRelayConnection } from './upbitRelay'

type Message = Record<string, unknown>
interface Listener {
  priority?: () => number
  data: (message: Message, receivedAt: number) => void
  status: (status: MarketConnectionStatus, attempt: number) => void
}
interface Session {
  socket: Pick<ReconnectingWebSocket, 'connect' | 'close' | 'reconnect'>
  listeners: Set<Listener>
  status: MarketConnectionStatus
  attempt: number
  generation: number
  latest: Map<string, { data: Message; receivedAt: number }>
}
const sessions = new Map<string, Session>()
const candleTypes = ['candle.1m', 'candle.5m', 'candle.15m', 'candle.60m', 'candle.240m']

/** All timeframes of one market share one handshake and one subscription request. */
export function subscribeUpbitStream(market: string, listener: Listener): () => void {
  let session = sessions.get(market)
  if (!session) {
    const created: Session = {
      socket: null!, listeners: new Set(), status: 'connecting', attempt: 0, generation: 0, latest: new Map(),
    }
    const options = {
      createUrl: () => 'wss://api.upbit.com/websocket/v1',
      beforeConnect: (signal: AbortSignal) => upbitRequestGate.run(() => undefined, signal, () => Math.max(0, ...[...created.listeners].map(item => item.priority?.() ?? 0))),
      idleTimeoutMs: 90_000,
      onOpen: (socket: WebSocket) => socket.send(JSON.stringify([
        { ticket: `investai-${market}-${Date.now()}` },
        ...['ticker', 'trade', 'orderbook', ...candleTypes].map(type => ({ type, codes: [market] })),
        { format: 'DEFAULT' },
      ])),
      onStatus: (status: MarketConnectionStatus, attempt: number) => {
        created.status = status
        created.attempt = attempt
        if (status !== 'live') { created.generation++; created.latest.clear() }
        for (const item of created.listeners) item.status(status, attempt)
      },
      onMessage: (event: MessageEvent, receivedAt = Date.now()) => {
        const generation = created.generation
        void decodeWebSocketData(event.data).then(raw => {
          if (sessions.get(market) !== created || generation !== created.generation) return
          const data = JSON.parse(raw) as Message
          if (!data || typeof data !== 'object') return
          if (data.error) { created.socket.reconnect(); return }
          if (data.code !== market || !['ticker', 'trade', 'orderbook', ...candleTypes].includes(String(data.type))) return
          // Only absolute snapshots are replayed. Replaying trades would double-count executions.
          if (data.type !== 'trade') created.latest.set(String(data.type), { data, receivedAt })
          for (const item of created.listeners) item.data(data, receivedAt)
        }).catch(() => { /* Malformed messages never refresh quote freshness. */ })
      },
    }
    const relay = upbitRelayBase()
    created.socket = relay
      ? new UpbitRelayConnection({ url: `${relay}/stream?market=${encodeURIComponent(market)}`, onStatus: options.onStatus, onMessage: options.onMessage })
      : new ReconnectingWebSocket(options)
    sessions.set(market, created)
    session = created
  }
  const active = session
  active.listeners.add(listener)
  listener.status(active.status, active.attempt)
  if (active.listeners.size === 1) active.socket.connect()
  else for (const item of active.latest.values()) listener.data(item.data, item.receivedAt)
  let released = false
  return () => {
    if (released) return
    released = true
    active.listeners.delete(listener)
    if (!active.listeners.size) { sessions.delete(market); active.socket.close(); active.latest.clear() }
  }
}
