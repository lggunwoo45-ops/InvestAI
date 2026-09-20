import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import { DemoPage } from './DemoPage'

const renderPage = (language?: 'ko') => {
  if (language) window.localStorage.setItem('market-copilot.language', language)
  return render(<MemoryRouter><AppProviders><DemoPage /></AppProviders></MemoryRouter>)
}

describe('DemoPage', () => {
  it('renders scope, flow, trust boundaries, and correct quick-link hrefs', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Market Copilot 1.5 Beta' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'What works now' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Demo flow' })).toBeTruthy()
    expect(screen.getByRole('link', { name: /Open Market Radar/ }).getAttribute('href')).toBe('/dashboard')
    expect(screen.getByRole('link', { name: /Open Watch Candidates/ }).getAttribute('href')).toBe('/ai-analysis')
    expect(screen.getByRole('link', { name: /Open News Center/ }).getAttribute('href')).toBe('/news')
    expect(screen.getByRole('link', { name: /Open Market Workspace/ }).getAttribute('href')).toBe('/market')
    expect(screen.getByRole('link', { name: /Open AI Usage Plans/ }).getAttribute('href')).toBe('/ai-analysis#ai-usage-plans-title')
  })
  it('renders Korean investor demo labels', () => {
    renderPage('ko')
    expect(screen.getByText('투자자 데모')).toBeTruthy()
    expect(screen.getByRole('heading', { name: '현재 작동하는 기능' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: '신뢰 경계' })).toBeTruthy()
  })
  it('does not overclaim product readiness', () => {
    renderPage()
    expect(document.body.textContent?.toLowerCase()).not.toMatch(/buy now|sell now|strong buy|guaranteed profit|profit expected|complete trading system|fully automated investment advisor/)
  })
})
