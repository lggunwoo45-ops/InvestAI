export function localMonitorAvailable(hostname = window.location.hostname): boolean {
  return ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}
