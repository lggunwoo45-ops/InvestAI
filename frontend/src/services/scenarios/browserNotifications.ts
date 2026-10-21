const KEY = 'investai.notifications.v1'
export function notificationPreference(): { enabled: boolean; error: boolean } {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return { enabled: false, error: false }
    const data = JSON.parse(raw)
    if (data?.version !== 1 || typeof data.enabled !== 'boolean') return { enabled: false, error: true }
    return { enabled: data.enabled, error: false }
  } catch { return { enabled: false, error: true } }
}
export function setNotificationPreference(enabled: boolean) {
  if (notificationPreference().error) throw new Error('storage-unavailable')
  localStorage.setItem(KEY, JSON.stringify({ version: 1, enabled }))
}
export function notificationPermission(): NotificationPermission | 'unsupported' {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}
/** Called only after a new foreground transition was successfully persisted. */
export function notifyScenario(symbol: string, eventLabels: readonly string[], tag: string): void {
  if (document.visibilityState === 'hidden' || !notificationPreference().enabled || notificationPermission() !== 'granted') return
  try {
    const notification = new Notification(`InvestAI · ${symbol}`, { body: eventLabels.join(' · '), tag })
    // A system notification is a timestamped event, never a persistent live verdict.
    const timer = window.setTimeout(() => notification.close(), 15_000)
    notification.onclose = () => window.clearTimeout(timer)
  } catch { /* In-app alerts and saved history remain available. */ }
}
