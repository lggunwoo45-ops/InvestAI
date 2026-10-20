import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'
import type { NewsLoadResult } from '@/services/news/newsService'
import { NewsProviderModeProvider } from './NewsProviderModeProvider'
import { newsProviderModeStorageKey } from './newsProviderModeStorage'
const mocks = vi.hoisted(() => ({ load: vi.fn() }))
vi.mock('@/services/news/newsService', () => ({ newsService: { loadNews: mocks.load } }))
const feed: NewsLoadResult = { requestedMode: 'live', state: 'rss-ready', source: 'rss', providerLabel: 'CoinDesk',
  articles: [], lastUpdatedAt: '2026-10-20T12:00:00Z', error: null, fallback: false }
function Probe() {
  const { result, refresh, setMode } = useNewsProviderMode()
  return <><output>{result?.lastUpdatedAt ?? 'pending'}</output><button onClick={refresh}>Refresh</button><button onClick={() => setMode('mock')}>Demo</button></>
}
beforeEach(() => { vi.clearAllMocks(); window.localStorage.setItem(newsProviderModeStorageKey, 'live') })
it('retains the original receipt while refreshing and ignores a late response after mode change', async () => {
  let complete: ((result: NewsLoadResult) => void) | undefined, signal: AbortSignal | undefined
  mocks.load.mockResolvedValueOnce(feed).mockImplementation((_mode, options) => { signal = options.signal; return new Promise(resolve => { complete = resolve }) })
  render(<NewsProviderModeProvider><Probe /></NewsProviderModeProvider>)
  expect(await screen.findByText(feed.lastUpdatedAt!)).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
  expect(screen.getByText(feed.lastUpdatedAt!)).toBeTruthy()
  const finishLive = complete
  const refreshSignal = signal
  fireEvent.click(screen.getByRole('button', { name: 'Demo' }))
  // Switching mode hides the old live feed before the demo request resolves.
  expect(screen.getByText('pending')).toBeTruthy()
  expect(refreshSignal?.aborted).toBe(true)
  await act(async () => finishLive?.(feed))
  expect(screen.getByText('pending')).toBeTruthy()
  expect(signal?.aborted).toBe(false)
})
it('refreshes when the document returns to the foreground and cancels on unmount', async () => {
  let signal: AbortSignal | undefined
  mocks.load.mockImplementation((_mode, options) => { signal = options.signal; return Promise.resolve(feed) })
  const visible = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
  const view = render(<NewsProviderModeProvider><Probe /></NewsProviderModeProvider>)
  await screen.findByText(feed.lastUpdatedAt!)
  await act(async () => document.dispatchEvent(new Event('visibilitychange')))
  expect(mocks.load).toHaveBeenCalledTimes(2)
  visible.mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  expect(mocks.load).toHaveBeenCalledTimes(2)
  view.unmount()
  expect(signal?.aborted).toBe(true)
  visible.mockRestore()
})
