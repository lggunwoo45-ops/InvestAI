import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import { DemoPage } from './DemoPage'

const renderPage = (language?: 'ko') => {
  window.localStorage.setItem('market-copilot.language', language ?? 'en')
  return render(<MemoryRouter><AppProviders><DemoPage /></AppProviders></MemoryRouter>)
}

describe('DemoPage', () => {
  it('renders readiness, guided demo content, and correct quick-link hrefs', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Market Copilot 1.5 Beta' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '1.5 Beta Readiness' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What works now' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '5-minute investor demo script' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Known limitations' })).toBeTruthy()
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
    expect(screen.getByRole('heading', { name: '1.5 베타 준비 상태' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '5분 투자자 데모 스크립트' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '현재 작동하는 기능' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '신뢰 경계' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '데모 상태 체크리스트' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '말하지 말아야 할 표현' })).toBeTruthy()
  })
  it('contains unsafe claims only as explicit presenter warnings', () => {
    renderPage()
    const hero = screen.getByRole('heading', { name: 'Market Copilot 1.5 Beta' }).closest('header')
    const warning = screen.getByRole('heading', { name: 'What not to say' }).closest('section')
    expect(hero?.textContent?.toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed profit|completed trading platform|ai stock picker|auto-trading system/)
    expect(warning?.querySelector('[data-guidance="avoid"]')?.textContent?.toLowerCase()).toMatch(/guaranteed profit system/)
    expect(warning?.querySelector('[data-guidance="present"]')?.textContent).toContain('A decision-support beta')
  })
})
