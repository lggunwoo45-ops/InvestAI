import { cloudSignedIn } from '@/services/cloud/cloudClient'
export function localMonitorAvailable(hostname = window.location.hostname): boolean {
  return cloudSignedIn() || ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
}
