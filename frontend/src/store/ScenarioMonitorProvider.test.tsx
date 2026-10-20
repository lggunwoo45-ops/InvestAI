import { act, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScenarioMonitorProvider } from './ScenarioMonitorProvider'
import { ScenarioBoard } from '@/components/scenarios/ScenarioBoard'
import { readScenarios, writeScenarios } from '@/services/scenarios/scenarioStorage'
import { scenarioFixture, scenarioSeries, scenarioTestNow as now } from '@/services/scenarios/scenarioFixtures'
import type { AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'

const input = vi.hoisted(() => ({ data: null as AnalysisSeries | null, mode: 'live' as 'live' | 'mock', calls: [] as string[] }))
vi.mock('@/i18n/useLanguage', () => ({ useLanguage: () => ({ language: 'ko' }) }))
vi.mock('@/hooks/useMarketWorkspace', () => ({ useMarketWorkspace: () => ({ marketDataMode: input.mode }) }))
vi.mock('@/hooks/useTechnicalLevelData', () => ({ useTechnicalLevelData: (_: unknown, frame: string) => { input.calls.push(frame); return input.data } }))
const show = () => <MemoryRouter><ScenarioMonitorProvider><ScenarioBoard compact /></ScenarioMonitorProvider></MemoryRouter>
const advance = () => act(() => vi.advanceTimersByTime(5000))

describe('foreground scenario monitor', () => {
  beforeEach(() => {
    localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(now)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    input.data = scenarioSeries(); input.mode = 'live'; input.calls = []
    writeScenarios({ version: 1, scenarios: [scenarioFixture()], events: [] }, null)
  })
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })
  it('records one transition, shows an in-app alert, and suppresses repeated boundary chatter', () => {
    const view = render(show())
    expect(screen.getByText('관심 구간 대기')).toBeTruthy()
    expect(readScenarios().events).toHaveLength(0)
    input.data = scenarioSeries(105); view.rerender(show()); advance()
    expect(readScenarios().events.map(e => e.kind)).toEqual(['entry'])
    expect(screen.getByRole('complementary', { name: '시나리오 변화 알림' })).toBeTruthy()
    advance()
    input.data = scenarioSeries(115); view.rerender(show()); advance()
    input.data = scenarioSeries(105); view.rerender(show()); advance()
    expect(readScenarios().events).toHaveLength(1)
    expect(new Set(input.calls)).toEqual(new Set(['1H']))
  })
  it('withholds stale prices and does not invent a crossing after reconnecting', () => {
    const view = render(show())
    input.data = { ...scenarioSeries(), connectionStatus: 'disconnected' }; view.rerender(show()); advance()
    expect(screen.getByText('실제 시세 확인 중')).toBeTruthy()
    input.data = scenarioSeries(90); view.rerender(show()); advance()
    expect(screen.getByText('손절 기준 도달')).toBeTruthy()
    expect(readScenarios().events).toHaveLength(0)
  })
  it('stops sensors in hidden/mock mode and after deletion, and restarts from a fresh baseline', () => {
    const view = render(show())
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(screen.getByText('탭 비활성 · 감시 일시 중지')).toBeTruthy()
    input.calls = []; advance(); expect(input.calls).toHaveLength(0)
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    input.data = scenarioSeries(90)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(readScenarios().events).toHaveLength(0)
    input.mode = 'mock'; view.rerender(show()); input.calls = []; advance()
    expect(input.calls).toHaveLength(0)
    expect(screen.getByText('모의 모드 · 감시 중지')).toBeTruthy()
    act(() => writeScenarios({ version: 1, scenarios: [], events: [] }, readScenarios().raw))
    input.mode = 'live'; view.rerender(show()); advance()
    expect(input.calls).toHaveLength(0)
  })
})
