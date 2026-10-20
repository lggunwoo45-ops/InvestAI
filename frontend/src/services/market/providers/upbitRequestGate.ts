export type RequestPriority = () => number

interface Job {
  priority: RequestPriority
  start: () => Promise<void>
}

/** One pacing boundary; choose the most relevant request when a slot opens. */
export class UpbitRequestGate {
  private readonly queue: Job[] = []
  private running = false
  private timer: ReturnType<typeof setTimeout> | null = null
  private nextAt = 0

  defer(milliseconds: number) {
    this.nextAt = Math.max(this.nextAt, Date.now() + milliseconds)
    this.pump()
  }

  run<T>(operation: () => Promise<T> | T, signal?: AbortSignal, priority: RequestPriority = () => 0): Promise<T> {
    if (signal?.aborted) return Promise.reject(signal.reason)
    return new Promise<T>((resolve, reject) => {
      const abort = () => {
        const index = this.queue.indexOf(job)
        if (index < 0) return
        this.queue.splice(index, 1)
        signal?.removeEventListener('abort', abort)
        reject(signal?.reason)
        this.pump()
      }
      const job: Job = { priority, start: async () => {
        signal?.removeEventListener('abort', abort)
        try { signal?.throwIfAborted(); resolve(await operation()) } catch (error) { reject(error) }
      } }
      this.queue.push(job)
      signal?.addEventListener('abort', abort, { once: true })
      // Collect same-render work before selecting a priority; handles StrictMode cleanup.
      queueMicrotask(() => this.pump())
    })
  }

  private pump() {
    if (this.running) return
    if (this.timer !== null) clearTimeout(this.timer)
    this.timer = null
    if (!this.queue.length) return
    const delay = this.nextAt - Date.now()
    if (delay > 0) { this.timer = setTimeout(() => this.pump(), delay); return }
    let next = 0
    for (let index = 1; index < this.queue.length; index += 1) {
      if (this.queue[index].priority() > this.queue[next].priority()) next = index
    }
    const [job] = this.queue.splice(next, 1)
    this.running = true
    this.nextAt = Date.now() + 10_500
    void job.start().finally(() => { this.running = false; this.pump() })
  }
}

export const upbitRequestGate = new UpbitRequestGate()
