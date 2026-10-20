import { Gate, MarketError } from './gate.mjs'
import { validMarket } from './rest.mjs'

const types = ['ticker', 'trade', 'orderbook', 'candle.1m', 'candle.5m', 'candle.15m', 'candle.60m', 'candle.240m']

/** Public quotes only. One upstream connection per active market, shared across viewers. */
export function createStreams({ Socket = WebSocket, interval = 250, maximum = 24 } = {}) {
  const sessions = new Map(), gate = new Gate(interval)
  const subscribe = (market, listener) => {
    if (!validMarket(market)) throw new MarketError(400, 'invalid_market')
    let session = sessions.get(market)
    if (!session) {
      if (sessions.size >= maximum) throw new MarketError(503, 'stream_capacity', 5)
      session = { listeners: new Set(), latest: new Map(), socket: null, timer: null, watchdog: null, controller: null, attempt: 0, status: 'connecting', generation: 0 }
      sessions.set(market, session)
      const owned = session
      const status = value => { owned.status = value; for (const target of owned.listeners) target.status(value, owned.attempt) }
      const watch = delay => { clearTimeout(owned.watchdog); owned.watchdog = setTimeout(retry, delay) }
      const retry = () => {
        if (sessions.get(market) !== owned) return
        clearTimeout(owned.timer); clearTimeout(owned.watchdog)
        owned.controller?.abort(); const socket = owned.socket; owned.socket = null; owned.generation++; socket?.close()
        owned.latest.clear(); owned.attempt++; status('reconnecting')
        owned.timer = setTimeout(connect, Math.min(1000 * 2 ** (owned.attempt - 1), 30_000))
      }
      const connect = () => {
        const controller = new AbortController(); owned.controller = controller
        void gate.run(() => {
          if (sessions.get(market) !== owned || controller.signal.aborted) return
          const socket = new Socket('wss://api.upbit.com/websocket/v1'); owned.socket = socket; watch(12_000)
          socket.addEventListener('open', () => {
            if (owned.socket !== socket) return
            owned.attempt = 0; status('live'); watch(90_000)
            socket.send(JSON.stringify([{ ticket: `investai-${market}` }, ...types.map(type => ({ type, codes: [market] })), { format: 'DEFAULT' }]))
          })
          socket.addEventListener('message', event => {
            if (owned.socket !== socket) return
            const receivedAt = Date.now(), generation = owned.generation
            const data = event.data
            void (typeof data === 'string' ? Promise.resolve(data) : data instanceof Blob ? data.text() : Promise.resolve(Buffer.from(data).toString('utf8'))).then(raw => {
              if (owned.socket !== socket || owned.generation !== generation || raw.length > 256_000) return
              const message = JSON.parse(raw)
              if (message?.error) { gate.defer(10_000); retry(); return }
              if (message?.code !== market || !types.includes(message.type)) return
              watch(90_000)
              if (message.type !== 'trade') owned.latest.set(message.type, { message, receivedAt })
              for (const target of owned.listeners) target.data(message, receivedAt)
            }).catch(() => {})
          })
          for (const event of ['close', 'error']) socket.addEventListener(event, () => { if (owned.socket === socket) retry() })
        }, controller.signal).catch(() => { if (!controller.signal.aborted) retry() })
      }
      owned.start = connect
    }
    const owned = session
    owned.listeners.add(listener); listener.status(owned.status, owned.attempt)
    if (owned.listeners.size === 1) owned.start()
    else for (const item of owned.latest.values()) if (Date.now() - item.receivedAt <= 90_000) listener.data(item.message, item.receivedAt)
    let stopped = false
    return () => {
      if (stopped) return; stopped = true
      owned.listeners.delete(listener)
      if (!owned.listeners.size) {
        sessions.delete(market); owned.controller?.abort(); clearTimeout(owned.timer); clearTimeout(owned.watchdog)
        const socket = owned.socket; owned.socket = null; socket?.close(); owned.latest.clear()
      }
    }
  }
  return { subscribe, close() { for (const session of sessions.values()) { session.controller?.abort(); clearTimeout(session.timer); clearTimeout(session.watchdog); const socket = session.socket; session.socket = null; socket?.close() } sessions.clear() } }
}
