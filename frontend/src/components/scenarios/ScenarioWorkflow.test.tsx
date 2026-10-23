import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SaveScenario } from './SaveScenario'
import { ScenarioBoard } from './ScenarioBoard'
import { readScenarios, SCENARIO_KEY, writeScenarios } from '@/services/scenarios/scenarioStorage'
import { scenarioFixture, scenarioSeries, scenarioTestNow as now } from '@/services/scenarios/scenarioFixtures'
import { buildCryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { writePortfolio } from '@/services/portfolio/portfolioStorage'

vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: 'live' }) }))
const s = scenarioFixture()
const seriesFor = (frame: '1H' | '4H' | '1D') => {
  const interval = { '1H': 3600000, '4H': 14400000, '1D': 86400000 }[frame]
  const series = scenarioSeries()
  return { ...series, currentPrice: 279, candles: series.candles.map((c, i) => ({ ...c, timestamp: Math.floor(now / interval) * interval - (80 - i) * interval })) }
}
const frames = () => ({ '1H': seriesFor('1H'), '4H': seriesFor('4H'), '1D': seriesFor('1D') })

describe('scenario review workflow', () => {
  beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(now) })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  it('saves reviewed analysis, keeps it fixed after live analysis changes, edits and confirms deletion', () => {
    const decision = buildCryptoDecision(frames(), now)
    const show = (target = decision.plan!.target) => <MemoryRouter><SaveScenario instrument={s.instrument} decision={{ ...decision, plan: { ...decision.plan!, target } }} language="ko" /><ScenarioBoard /></MemoryRouter>
    const view = render(show())
    fireEvent.click(screen.getByRole('button', { name: '이 분석으로 시나리오 저장' }))
    fireEvent.change(screen.getByLabelText('목표 기준가 (KRW)'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '검토한 기준 저장' }))
    expect(readScenarios().scenarios[0].target).toBe(300)
    view.rerender(show(500))
    expect(readScenarios().scenarios[0].target).toBe(300)
    fireEvent.click(screen.getByRole('button', { name: '기준 수정' }))
    fireEvent.change(screen.getByLabelText('목표 기준가 (KRW)'), { target: { value: '310' } })
    fireEvent.click(screen.getByRole('button', { name: '검토한 기준 저장' }))
    expect(readScenarios().scenarios[0].target).toBe(310)
    fireEvent.click(screen.getByRole('button', { name: '감시 중지' }))
    expect(readScenarios().scenarios[0].enabled).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(readScenarios().scenarios).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: '시나리오 삭제' }))
    expect(readScenarios().scenarios).toHaveLength(0)
  })
  it('blocks an edit if another tab changes the source and preserves that tab’s value', () => {
    writeScenarios({ version: 1, scenarios: [s], events: [] }, null)
    render(<MemoryRouter><ScenarioBoard /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: '기준 수정' }))
    const external = { version: 1, scenarios: [{ ...s, target: 150 }], events: [] }
    localStorage.setItem(SCENARIO_KEY, JSON.stringify(external))
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: SCENARIO_KEY })))
    fireEvent.click(screen.getByRole('button', { name: '검토한 기준 저장' }))
    expect(screen.getByRole('alert').textContent).toContain('저장하지 못했습니다')
    expect(readScenarios().scenarios[0].target).toBe(150)
  })
  it('rejects price order and links an existing holding without changing its portfolio', () => {
    writePortfolio([{ id: 'holding', exchange: 'upbit', venue: 'upbit-krw', instrumentId: s.instrument.id, symbol: s.instrument.symbol, quoteCurrency: 'KRW', quantity: 2, averagePrice: 100 }], null)
    writeScenarios({ version: 1, scenarios: [{ ...s, positionId: 'holding' }], events: [] }, null)
    render(<MemoryRouter><ScenarioBoard /></MemoryRouter>)
    const card = within(screen.getByRole('article'))
    expect(card.getByRole('link', { name: '종목 분석 →' }).getAttribute('href')).toContain('positionId=holding')
    expect(card.getByRole('link', { name: '서버 감시로 연결' }).getAttribute('href')).toContain(`scenario=${s.id}`)
    fireEvent.click(card.getByRole('button', { name: '기준 수정' }))
    fireEvent.change(screen.getByLabelText('손절 기준가 (KRW)'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: '검토한 기준 저장' }))
    expect(readScenarios().scenarios[0].stop).toBe(90)
    expect(screen.getByRole('alert')).toBeTruthy()
  })
  it('does not offer saving for unavailable analysis or futures', () => {
    const decision = buildCryptoDecision(frames(), now)
    const view = render(<SaveScenario instrument={{ ...s.instrument, marketId: 'binance-futures' }} decision={decision} language="ko" />)
    expect(screen.queryByRole('button')).toBeNull()
    view.rerender(<SaveScenario instrument={s.instrument} decision={{ ...decision, direction: 'unavailable', plan: null }} language="ko" />)
    expect(screen.queryByRole('button')).toBeNull()
  })
})
