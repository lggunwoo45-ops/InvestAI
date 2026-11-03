import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import { DemoPage } from './DemoPage'

describe('Customer guide', () => {
  beforeEach(() => { localStorage.clear(); localStorage.setItem('market-copilot.language', 'ko'); localStorage.setItem('market-copilot.displayMode.v1', 'simple') })
  const mount = () => render(<MemoryRouter><AppProviders><DemoPage /></AppProviders></MemoryRouter>)
  it('opens analysis and changes instructions with the chosen task', () => {
    mount()
    expect(screen.getByRole('link', { name: 'BTC 바로 분석하기 →' }).getAttribute('href')).toBe('/my-analysis?instrumentId=upbit-btc')
    fireEvent.click(screen.getByRole('button', { name: '이미 가진 종목을 봐요' }))
    expect(screen.getByRole('button', { name: '이미 가진 종목을 봐요' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('link', { name: '내 종목 관리 →' }).getAttribute('href')).toBe('/portfolio')
    expect(screen.queryByRole('link', { name: 'BTC 분석 열기 →' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '후보와 결과를 기록해요' }))
    expect(screen.getByRole('link', { name: '새 후보 찾기 →' }).getAttribute('href')).toBe('/ai-analysis')
  })
  it('switches the shared display preference and explains missing data and price levels', () => {
    mount()
    fireEvent.click(screen.getByRole('button', { name: '전문가모드로 보기' }))
    expect(screen.getByRole('heading', { name: '지금은 전문가모드예요' })).toBeTruthy()
    expect(localStorage.getItem('market-copilot.displayMode.v1')).toBe('expert')
    expect(screen.getByText(/하락 판단에서는 저항보다 위에 있을 수 있으며 지지선과 같은 뜻이 아닙니다/)).toBeTruthy()
    expect(screen.getByText(/자료 없음·갱신 필요가 나오면 어떻게 하나요/)).toBeTruthy()
    expect(screen.queryByText('5분 투자자 데모 스크립트')).toBeNull()
  })
  it('offers the same task flow in English', () => {
    localStorage.setItem('market-copilot.language', 'en'); mount()
    expect(screen.getByRole('heading', { level: 1, name: /Understand one asset\.\s+Keep a record\./ })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'I already hold an asset' }))
    expect(screen.getByRole('link', { name: 'Manage holdings →' }).getAttribute('href')).toBe('/portfolio')
  })
})
