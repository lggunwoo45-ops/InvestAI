export class MarketError extends Error {
  constructor(status, message, retryAfter = 0) { super(message); this.status = status; this.retryAfter = retryAfter }
}

/** One server process owns each documented upstream quota group. */
export class Gate {
  constructor(interval, limit = 64) { this.interval = interval; this.limit = limit; this.queue = []; this.nextAt = 0; this.timer = null }
  defer(ms) { this.nextAt = Math.max(this.nextAt, Date.now() + ms); this.pump() }
  run(work, signal) {
    if (signal?.aborted) return Promise.reject(signal.reason)
    if (this.queue.length >= this.limit) return Promise.reject(new MarketError(503, 'queue_full', 1))
    return new Promise((resolve, reject) => {
      const abort = () => {
        const i = this.queue.indexOf(job)
        if (i >= 0) { this.queue.splice(i, 1); reject(signal.reason); this.pump() }
      }
      const job = { start: () => {
        signal?.removeEventListener('abort', abort)
        Promise.resolve().then(() => { signal?.throwIfAborted(); return work() }).then(resolve, reject)
      } }
      this.queue.push(job); signal?.addEventListener('abort', abort, { once: true }); this.pump()
    })
  }
  pump() {
    clearTimeout(this.timer); this.timer = null
    if (!this.queue.length) return
    const delay = this.nextAt - Date.now()
    if (delay > 0) { this.timer = setTimeout(() => this.pump(), delay); return }
    const job = this.queue.shift()
    this.nextAt = Date.now() + this.interval
    job.start(); this.pump()
  }
}
