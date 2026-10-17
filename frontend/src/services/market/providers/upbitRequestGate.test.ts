import { afterEach, expect, it, vi } from 'vitest'
import { UpbitRequestGate } from './upbitRequestGate'

afterEach(() => vi.useRealTimers())
it('paces catalog, candles and websocket handshakes through one boundary', async () => {
  vi.useFakeTimers()
  const gate = new UpbitRequestGate(); const starts: number[] = []
  const first = gate.run(() => starts.push(Date.now()))
  const second = gate.run(() => starts.push(Date.now()))
  const third = gate.run(() => starts.push(Date.now()))
  await first
  expect(starts).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(10_499)
  expect(starts).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(1); await second
  await vi.advanceTimersByTimeAsync(10_500); await third
  expect(starts[1] - starts[0]).toBe(10_500)
  expect(starts[2] - starts[1]).toBe(10_500)
})
it('skips aborted queued work and retains cooldown after failure', async () => {
  vi.useFakeTimers()
  const gate = new UpbitRequestGate()
  await expect(gate.run(() => { throw new Error('429') })).rejects.toThrow('429')
  gate.defer(60_000)
  const controller = new AbortController(); const operation = vi.fn()
  const pending = gate.run(operation, controller.signal)
  const outcome = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
  await vi.advanceTimersByTimeAsync(1)
  controller.abort(); await outcome
  const next = gate.run(operation)
  await vi.advanceTimersByTimeAsync(59_998); expect(operation).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1); await next
  expect(operation).toHaveBeenCalledOnce()
})
