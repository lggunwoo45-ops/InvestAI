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
})
