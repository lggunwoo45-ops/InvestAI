/** One pacing boundary shared by Upbit REST calls and websocket handshakes. */
export class UpbitRequestGate {
  private tail: Promise<unknown> = Promise.resolve()
  private nextAt = 0

  defer(milliseconds: number) { this.nextAt = Math.max(this.nextAt, Date.now() + milliseconds) }

  run<T>(operation: () => Promise<T> | T, signal?: AbortSignal): Promise<T> {
    const task = this.tail.then(async () => {
      signal?.throwIfAborted()
      while (Date.now() < this.nextAt) {
        await new Promise<void>((resolve, reject) => {
          const abort = () => { clearTimeout(timer); reject(signal?.reason) }
          const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve() }, this.nextAt - Date.now())
          signal?.addEventListener('abort', abort, { once: true })
        })
        signal?.throwIfAborted()
      }
      this.nextAt = Date.now() + 10_500
      return operation()
    })
    this.tail = task.catch(() => undefined)
    return task
  }
}

export const upbitRequestGate = new UpbitRequestGate()
