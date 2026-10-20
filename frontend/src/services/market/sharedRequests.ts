interface PendingRequest<T> {
  controller: AbortController
  promise: Promise<T>
  consumers: number
  settled: boolean
}

/** Deduplicate work without giving any one caller ownership of its cancellation. */
export class SharedRequests<T> {
  private readonly pending = new Map<string, PendingRequest<T>>()

  run(key: string, load: (signal: AbortSignal) => Promise<T>, signal?: AbortSignal): Promise<T> {
    if (signal?.aborted) return Promise.reject(new DOMException('Request aborted', 'AbortError'))
    let request = this.pending.get(key)
    if (!request) {
      const controller = new AbortController()
      request = { controller, consumers: 0, settled: false, promise: Promise.resolve().then(() => {
        controller.signal.throwIfAborted()
        return load(controller.signal)
      }) }
      this.pending.set(key, request)
      const owned = request
      const settle = () => {
        owned.settled = true
        if (this.pending.get(key) === owned) this.pending.delete(key)
      }
      owned.promise.then(settle, settle)
    }
    const owned = request
    owned.consumers += 1
    return new Promise<T>((resolve, reject) => {
      let finished = false
      const release = () => {
        if (finished) return false
        finished = true
        signal?.removeEventListener('abort', abort)
        owned.consumers -= 1
        if (!owned.consumers && !owned.settled) {
          if (this.pending.get(key) === owned) this.pending.delete(key)
          owned.controller.abort()
        }
        return true
      }
      const abort = () => { if (release()) reject(new DOMException('Request aborted', 'AbortError')) }
      signal?.addEventListener('abort', abort, { once: true })
      owned.promise.then(
        value => { if (release()) resolve(value) },
        error => { if (release()) reject(error) },
      )
    })
  }
}
