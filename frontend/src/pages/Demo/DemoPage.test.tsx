import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import type { DartProxyHealthResult } from '@/types/dart'
import { DemoPage } from './DemoPage'

const dartHealth = vi.hoisted(() => ({
  current: { status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' } as DartProxyHealthResult,
}))

vi.mock('@/hooks/useDartProxyHealth', () => ({
  useDartProxyHealth: () => dartHealth.current,
}))

const renderPage = (language?: 'ko', mode: 'simple' | 'expert' = 'expert') => {
  window.localStorage.setItem('market-copilot.language', language ?? 'en')
  window.localStorage.setItem('market-copilot.displayMode.v1', mode)
  return render(<MemoryRouter><AppProviders><DemoPage /></AppProviders></MemoryRouter>)
}

describe('DemoPage', () => {
  beforeEach(() => {
    dartHealth.current = { status: 'disabled', apiKeyConfigured: false, message: 'DART API key is not configured.' }
  })

  it('renders readiness, guided demo content, and correct quick-link hrefs', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Market Copilot Beta' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Go to AI Analysis/ }).getAttribute('href')).toBe('/ai-analysis')
    expect(screen.getByRole('link', { name: /My Analysis/ }).getAttribute('href')).toBe('/my-analysis')
    expect(screen.getByRole('heading', { name: 'Beta readiness' })).toBeTruthy()
    const systemStatus = screen.getByRole('region', { name: 'Beta system status' })
    const apiUsage = screen.getByRole('region', { name: 'API usage status' })
    expect(within(apiUsage).getByText('DART API key').closest('li')?.textContent).toContain('Not configured')
    expect(within(systemStatus).getByText('DART proxy').closest('li')?.textContent).toContain('Ready')
    expect(within(systemStatus).getByText('DART API key').closest('li')?.textContent).toContain('Not configured')
    expect(within(systemStatus).getByText('Real AI').closest('li')?.textContent).toContain('Disabled')
    expect(screen.getByRole('heading', { name: 'What works now' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '5-minute investor demo script' })).toBeTruthy()
    expect(screen.getByText('Not included in this beta')).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Investor feedback questions' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Demo health checklist' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What not to say' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Demo flow' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open Market Radar/ }).getAttribute('href')).toBe('/dashboard')
    expect(screen.getByRole('link', { name: /Open Watch Candidates/ }).getAttribute('href')).toBe('/ai-analysis')
    expect(screen.getByRole('link', { name: /Open Korea Stock Candidates/ }).getAttribute('href')).toBe('/ai-analysis')
    expect(screen.getByRole('link', { name: /Open US Stock Candidates/ }).getAttribute('href')).toBe('/ai-analysis')
    expect(screen.getByRole('link', { name: /Open News Center/ }).getAttribute('href')).toBe('/news')
    expect(screen.getByRole('link', { name: /Open AI Usage Plans/ }).getAttribute('href')).toBe('/ai-analysis#ai-usage-plans-title')
  })
  it('renders Korean investor demo labels', () => {
    renderPage('ko')
    expect(screen.getByText('투자자 데모')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '처음 사용 흐름' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '베타 준비 상태' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '베타 시스템 상태' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'API 사용 상태' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '5분 투자자 데모 스크립트' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '현재 작동하는 기능' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '신뢰 경계' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '데모 상태 체크리스트' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '말하지 말아야 할 표현' })).toBeTruthy()
  })
  it('renders the short bilingual-safe path before detailed content in Simple Mode', () => {
    renderPage(undefined, 'simple')
    expect(screen.getByRole('heading', { name: 'Simple demo path' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Open Simple Candidate View' }).getAttribute('href')).toBe('/simple')
    expect(screen.getByRole('heading', { name: 'Trust boundary' })).toBeTruthy()
  })

  it('keeps both status panels synchronized for a configured DART proxy', () => {
    dartHealth.current = { status: 'ready', apiKeyConfigured: true, message: 'DART API key is configured.' }
    renderPage()
    const systemStatus = screen.getByRole('region', { name: 'Beta system status' })
    const apiUsage = screen.getByRole('region', { name: 'API usage status' })
    expect(within(systemStatus).getByText('DART proxy').closest('li')?.textContent).toBe('DART proxyReady')
    expect(within(systemStatus).getByText('DART API key').closest('li')?.textContent).toBe('DART API keyConfigured')
    expect(within(apiUsage).getByText('DART proxy').closest('li')?.textContent).toBe('DART proxyReady')
    expect(within(apiUsage).getByText('DART API key').closest('li')?.textContent).toBe('DART API keyConfigured')
  })

  it('keeps both status panels synchronized when DART health cannot be checked', () => {
    dartHealth.current = { status: 'unavailable', apiKeyConfigured: null, message: 'The local DART proxy is unavailable.' }
    renderPage('ko')
    const systemStatus = screen.getByRole('region', { name: '베타 시스템 상태' })
    const apiUsage = screen.getByRole('region', { name: 'API 사용 상태' })
    expect(within(systemStatus).getByText('DART 프록시').closest('li')?.textContent).toBe('DART 프록시사용 불가')
    expect(within(systemStatus).getByText('DART API 키').closest('li')?.textContent).toBe('DART API 키확인 전')
    expect(within(apiUsage).getByText('DART 프록시').closest('li')?.textContent).toBe('DART 프록시사용 불가')
    expect(within(apiUsage).getByText('DART API 키').closest('li')?.textContent).toBe('DART API 키확인 전')
  })

  it('contains unsafe claims only as explicit presenter warnings', () => {
    renderPage()
    const hero = screen.getByRole('heading', { name: 'Market Copilot Beta' }).closest('header')
    const warning = screen.getByRole('heading', { name: 'What not to say' }).closest('section')
    expect(hero?.textContent?.toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed profit|completed trading platform|ai stock picker|auto-trading system/)
    expect(warning?.querySelector('[data-guidance="avoid"]')?.textContent?.toLowerCase()).toMatch(/guaranteed profit system/)
    expect(warning?.querySelector('[data-guidance="present"]')?.textContent).toContain('A decision-support beta')
  })
})
