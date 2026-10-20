import { afterEach, describe, expect, it, vi } from 'vitest'

import { ReconnectingWebSocket } from './ReconnectingWebSocket'

type Listener = (event: Event | MessageEvent) => void

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  private listeners = new Map<string, Listener[]>()

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  close() {
    this.emit('close', new Event('close'))
  }

  emit(type: string, event: Event | MessageEvent) {
    this.listeners.get(type)?.forEach((listener) => listener(event))
  }
}

describe('ReconnectingWebSocket', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    FakeWebSocket.instances = []
  })

  it('reconnects with backoff after an unexpected close', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', FakeWebSocket)
    const statuses: string[] = []
    const client = new ReconnectingWebSocket({
      createUrl: () => 'wss://example.test/stream',
      onOpen: () => undefined,
      onMessage: () => undefined,
      onStatus: (status, attempt) => statuses.push(`${status}:${attempt}`),
    })

    client.connect()
    expect(FakeWebSocket.instances).toHaveLength(1)
    FakeWebSocket.instances[0].emit('open', new Event('open'))
    FakeWebSocket.instances[0].emit('close', new Event('close'))
    expect(statuses).toEqual(['connecting:0', 'live:0', 'reconnecting:1'])

    await vi.advanceTimersByTimeAsync(1_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    expect(statuses.at(-1)).toBe('reconnecting:1')
    client.close()
  })

  it('does not open a queued connection after unsubscribe', async () => {
    vi.stubGlobal('WebSocket', FakeWebSocket)
    let release: () => void = () => undefined
    const gate = new Promise<void>(resolve => { release = resolve })
    const client = new ReconnectingWebSocket({ createUrl: () => 'wss://example.test', beforeConnect: () => gate, onOpen: vi.fn(), onMessage: vi.fn(), onStatus: vi.fn() })
    client.connect(); client.close(); release()
    await Promise.resolve()
    expect(FakeWebSocket.instances).toHaveLength(0)
  })

  it('recovers a hanging handshake and ignores late messages from the abandoned socket', async () => {
    vi.useFakeTimers(); vi.stubGlobal('WebSocket', FakeWebSocket)
    const message = vi.fn(), status = vi.fn()
    const client = new ReconnectingWebSocket({ createUrl: () => 'wss://example.test', onOpen: vi.fn(), onMessage: message, onStatus: status })
    client.connect()
    const old = FakeWebSocket.instances[0]
    await vi.advanceTimersByTimeAsync(15_000)
    expect(status).toHaveBeenLastCalledWith('reconnecting', 1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(FakeWebSocket.instances).toHaveLength(2)
    old.emit('message', new MessageEvent('message', { data: 'late' }))
    old.emit('open', new Event('open'))
    expect(message).not.toHaveBeenCalled()
    expect(status).not.toHaveBeenCalledWith('live', 0)
    client.close()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(FakeWebSocket.instances).toHaveLength(2)
  })

  it('recovers a silent stream and resets the inactivity deadline on messages', async () => {
    vi.useFakeTimers(); vi.stubGlobal('WebSocket', FakeWebSocket)
    const client = new ReconnectingWebSocket({ createUrl: () => 'wss://example.test', idleTimeoutMs: 90_000, onOpen: vi.fn(), onMessage: vi.fn(), onStatus: vi.fn() })
    client.connect(); FakeWebSocket.instances[0].emit('open', new Event('open'))
    await vi.advanceTimersByTimeAsync(80_000)
    FakeWebSocket.instances[0].emit('message', new MessageEvent('message'))
    await vi.advanceTimersByTimeAsync(89_999)
    expect(FakeWebSocket.instances).toHaveLength(1)
    await vi.advanceTimersByTimeAsync(1001)
    expect(FakeWebSocket.instances).toHaveLength(2)
    client.close()
  })
})
