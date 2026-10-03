import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { LanguageProvider } from '@/i18n/LanguageProvider'
import { SIDEBAR_PINNED_STORAGE_KEY, UiStoreProvider } from '@/store/UiStoreProvider'
import { Sidebar } from './Sidebar'

function renderSidebar() {
  return render(
    <LanguageProvider>
      <UiStoreProvider>
        <MemoryRouter>
          <Sidebar />
        </MemoryRouter>
      </UiStoreProvider>
    </LanguageProvider>,
  )
}

describe('Sidebar pinning', () => {
  beforeEach(() => window.localStorage.clear())

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('defaults to pinned and persists an unpinned rail across remounts', async () => {
    const firstRender = renderSidebar()
    const sidebar = screen.getByRole('complementary', { name: 'Application sidebar' })

    expect(sidebar.getAttribute('data-pinned')).toBe('true')
    expect(sidebar.getAttribute('data-expanded')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Unpin sidebar' }))

    expect(sidebar.getAttribute('data-pinned')).toBe('false')
    expect(sidebar.getAttribute('data-expanded')).toBe('false')
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeTruthy()
    await waitFor(() => expect(window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY)).toBe('false'))

    firstRender.unmount()
    renderSidebar()

    expect(screen.getByRole('complementary', { name: 'Application sidebar' }).getAttribute('data-pinned')).toBe('false')
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeTruthy()
  })

  it('reveals an unpinned rail on hover or keyboard focus and hides after leaving', () => {
    window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, 'false')
    renderSidebar()
    const sidebar = screen.getByRole('complementary', { name: 'Application sidebar' })

    expect(sidebar.getAttribute('data-expanded')).toBe('false')
    fireEvent.pointerEnter(sidebar, { pointerType: 'mouse' })
    expect(sidebar.getAttribute('data-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Close workspace' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Pin sidebar' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Market' })).toBeTruthy()

    fireEvent.pointerLeave(sidebar, { pointerType: 'mouse' })
    expect(sidebar.getAttribute('data-expanded')).toBe('false')

    const openButton = screen.getByRole('button', { name: 'Open workspace' })
    fireEvent.focus(openButton)
    expect(sidebar.getAttribute('data-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Close workspace' })).toBeTruthy()
    fireEvent.blur(openButton, { relatedTarget: document.body })
    expect(sidebar.getAttribute('data-expanded')).toBe('false')
  })

  it('closes a transient workspace after navigation and recovers invalid persisted state', async () => {
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem')
    window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, 'invalid')
    const invalidRender = renderSidebar()

    expect(screen.getByRole('complementary', { name: 'Application sidebar' }).getAttribute('data-pinned')).toBe('true')
    expect(removeItem).toHaveBeenCalledWith(SIDEBAR_PINNED_STORAGE_KEY)
    await waitFor(() => expect(window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY)).toBe('true'))

    invalidRender.unmount()
    window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, 'false')
    renderSidebar()
    const sidebar = screen.getByRole('complementary', { name: 'Application sidebar' })
    fireEvent.pointerEnter(sidebar, { pointerType: 'mouse' })
    expect(sidebar.getAttribute('data-expanded')).toBe('true')

    fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }))
    expect(sidebar.getAttribute('data-expanded')).toBe('false')
  })

  it('keeps a narrow viewport as an overlay rail while preserving the pinned preference', async () => {
    const mediaQuery = {
      matches: true,
      media: '(max-width: 1024px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }
    vi.stubGlobal('matchMedia', vi.fn(() => mediaQuery))
    renderSidebar()

    const sidebar = screen.getByRole('complementary', { name: 'Application sidebar' })
    await waitFor(() => expect(sidebar.getAttribute('data-expanded')).toBe('false'))
    expect(sidebar.getAttribute('data-pinned')).toBe('true')
    expect(screen.getByRole('button', { name: 'Open workspace' })).toBeTruthy()

    fireEvent.focus(screen.getByRole('button', { name: 'Open workspace' }))
    expect(sidebar.getAttribute('data-expanded')).toBe('true')
    expect(screen.getByRole('button', { name: 'Close workspace' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Unpin sidebar' })).toBeTruthy()
  })

  it('uses the required Korean pin and workspace labels', () => {
    window.localStorage.setItem('market-copilot.language', 'ko')
    renderSidebar()

    fireEvent.click(screen.getByRole('button', { name: '사이드바 고정 해제' }))
    const openButton = screen.getByRole('button', { name: '워크스페이스 열기' })
    fireEvent.focus(openButton)

    expect(screen.getByRole('button', { name: '워크스페이스 닫기' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '사이드바 고정' })).toBeTruthy()
  })
})
