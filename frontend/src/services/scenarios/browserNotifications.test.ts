import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notificationPreference, notifyScenario, setNotificationPreference } from './browserNotifications'
const created = vi.fn()
class FakeNotification {
  static permission = 'granted'
  static requestPermission = vi.fn()
  onclose: (() => void) | null = null
  close = vi.fn()
  constructor(...args: unknown[]) { created(...args) }
}
beforeEach(() => { localStorage.clear(); created.mockClear(); vi.useFakeTimers(); vi.stubGlobal('Notification', FakeNotification); vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible') })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals() })
describe('opt-in foreground notifications', () => {
  it('defaults off and never requests permission automatically', () => {
    notifyScenario('BTC', ['Changed'], 'one')
    expect(created).not.toHaveBeenCalled(); expect(FakeNotification.requestPermission).not.toHaveBeenCalled()
  })
  it('requires saved opt-in, permission and a visible document', () => {
    setNotificationPreference(true); notifyScenario('BTC', ['Target reached'], 'one')
    expect(created).toHaveBeenCalledWith('InvestAI · BTC', { body: 'Target reached', tag: 'one' })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    notifyScenario('BTC', ['Changed'], 'two'); expect(created).toHaveBeenCalledTimes(1)
  })
  it('preserves unreadable storage and fails closed', () => {
    localStorage.setItem('investai.notifications.v1', 'broken')
    expect(notificationPreference()).toEqual({ enabled: false, error: true })
    expect(() => setNotificationPreference(true)).toThrow()
    expect(localStorage.getItem('investai.notifications.v1')).toBe('broken')
    notifyScenario('BTC', ['Changed'], 'one'); expect(created).not.toHaveBeenCalled()
  })
})
