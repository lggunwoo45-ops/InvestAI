import { act, render, screen, cleanup, fireEvent } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
vi.mock('@/app/displayMode/useDisplayMode', () => ({ useDisplayMode: () => ({ displayMode: 'expert' }) }))
vi.mock('@/hooks/useUiStore', () => ({ useUiStore: () => ({ isAiCopilotOpen: true, isSidebarPinned: true }) }))
vi.mock('../Sidebar/Sidebar', () => ({ Sidebar: () => <aside>데스크톱 옆 메뉴</aside> }))
vi.mock('../Header/Header', () => ({ Header: () => <header>데스크톱 상단 메뉴</header> }))
vi.mock('../Header/SimpleHeader', () => ({ SimpleHeader: ({ onToggleCopilot }: { onToggleCopilot?: () => void }) => <header>좁은 화면 상단 메뉴<button onClick={onToggleCopilot}>도움말 열기</button></header> }))
vi.mock('../AiCopilot/AiCopilot', () => ({ AiCopilot: ({ onClose }: { onClose?: () => void }) => <aside>AI 도움말<button onClick={onClose}>도움말 닫기</button></aside> }))
vi.mock('@/components/cloud/MemberAccount', () => ({ MemberAccount: () => null }))
vi.mock('@/components/demo/BetaRouteBanner/BetaRouteBanner', () => ({ BetaRouteBanner: () => null }))
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('does not cover the phone market with a desktop-open assistant and still lets the user open and close it', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  render(<MemoryRouter initialEntries={['/market']}><Routes><Route element={<AppShell />}><Route path="/market" element={<div>마켓</div>} /></Route></Routes></MemoryRouter>)
  expect(screen.queryByText('AI 도움말')).toBeNull()
  fireEvent.click(screen.getByText('도움말 열기'))
  expect(screen.getByText('AI 도움말')).toBeTruthy()
  fireEvent.click(screen.getByText('도움말 닫기'))
  expect(screen.queryByText('AI 도움말')).toBeNull()
  expect(screen.getByText('마켓')).toBeTruthy()
})
it('uses the full width on mobile without changing expert mode and restores desktop navigation on resize', () => {
  let compact = true
  const listeners = new Set<() => void>()
  vi.stubGlobal('matchMedia', () => ({ matches: compact, addEventListener: (_: string, listener: () => void) => listeners.add(listener), removeEventListener: (_: string, listener: () => void) => listeners.delete(listener) }))
  const view = render(<MemoryRouter><Routes><Route element={<AppShell />}><Route path="/" element={<div>전문가 분석 기능</div>} /></Route></Routes></MemoryRouter>)
  expect(screen.getByText('좁은 화면 상단 메뉴')).toBeTruthy()
  expect(screen.queryByText('데스크톱 옆 메뉴')).toBeNull()
  expect(view.container.querySelector('[data-display-mode]')?.getAttribute('data-display-mode')).toBe('expert')
  act(() => { compact = false; listeners.forEach(notify => notify()) })
  expect(screen.getByText('데스크톱 옆 메뉴')).toBeTruthy()
  expect(screen.getByText('전문가 분석 기능')).toBeTruthy()
  view.unmount(); expect(listeners.size).toBe(0)
})
