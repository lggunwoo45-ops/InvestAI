import { fireEvent, screen, within } from '@testing-library/react'
import { Link, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { renderWithProviders } from './renderWithProviders'
import { opportunityCoin, opportunityDecision, opportunityNow } from './opportunityFixtures'
import { SimpleDecisionBrief } from '@/components/crypto-analysis/SimpleDecisionBrief'
import { ReviewAlertsPage } from '@/pages/Research/ReviewAlertsPage'
import { readScenarios, writeScenarios } from '@/services/scenarios/scenarioStorage'
import { scenarioFixture } from '@/services/scenarios/scenarioFixtures'
import { SimpleHome } from '@/pages/SimpleMode/SimpleHome'
import type { MarketInstrument } from '@/types/market'

vi.mock('@/components/ai-analysis/LiveCandidateSearch', () => ({ LiveCandidateSearch: () => <div>Candidate scanner boundary</div> }))
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(opportunityNow) })
afterEach(() => vi.useRealTimers())

const venues: MarketInstrument[] = [opportunityCoin,
  { ...opportunityCoin, id: 'upbit-btc-sol', symbol: 'SOL/BTC', quoteCurrency: 'BTC' },
  { ...opportunityCoin, id: 'binance-spot-solusdt', marketId: 'binance-spot', symbol: 'SOLUSDT', quoteCurrency: 'USDT' },
]
it.each(venues)('carries $id prices through review, saved alert and result navigation without currency substitution', instrument => {
  renderWithProviders(<Routes><Route path="/" element={<SimpleDecisionBrief instrument={instrument} decision={opportunityDecision()} language="en" holding={false} onDetails={() => {}} />} /><Route path="/review-alerts" element={<ReviewAlertsPage />} /><Route path="/results" element={<h1>Forward record ledger</h1>} /></Routes>)
  expect(screen.getByRole('heading', { name: 'Conditions match · review the downside too' })).toBeTruthy()
  fireEvent.click(screen.getByText('Set alerts and record these prices'))
  fireEvent.click(screen.getByRole('button', { name: 'Review and save analysis prices' }))
  const input = screen.getByLabelText(`Target reference (${instrument.quoteCurrency})`) as HTMLInputElement
  const target = Number(input.value)
  fireEvent.click(screen.getByRole('button', { name: 'Save reviewed criteria' }))
  const saved = readScenarios().scenarios[0]
  expect(saved.instrument).toMatchObject({ id: instrument.id, marketId: instrument.marketId, quoteCurrency: instrument.quoteCurrency })
  expect(saved.target).toBe(target)
  expect(saved.baseline.direction).toBe('sell') // A rebound is not relabelled as a broad uptrend.
  fireEvent.click(screen.getByRole('link', { name: 'Open saved alerts and results →' }))
  const plan = screen.getByRole('region', { name: 'Price plan from analysis' })
  expect(within(plan).getByRole('heading', { name: instrument.symbol })).toBeTruthy()
  expect(within(plan).getByRole('link', { name: /Recheck/ }).getAttribute('href')).toBe(`/my-analysis?instrumentId=${instrument.id}`)
  expect(screen.getByText(/Device monitoring stops/)).toBeTruthy()
  expect(readScenarios().scenarios[0]).toEqual(saved)
  fireEvent.click(screen.getByRole('link', { name: 'Open forward review results →' }))
  expect(screen.getByRole('heading', { name: 'Forward record ledger' })).toBeTruthy()
})

it('withholds actionable price plans when data is unavailable and leaves saved records intact', () => {
  const s = scenarioFixture(); writeScenarios({ version: 1, scenarios: [s], events: [] }, null)
  const before = readScenarios().raw
  renderWithProviders(<SimpleDecisionBrief instrument={opportunityCoin} decision={{ ...opportunityDecision(), direction: 'unavailable', price: null, plan: null, coverage: 0 }} language="en" holding={false} onDetails={() => {}} />)
  expect(screen.queryByText('Set alerts and record these prices')).toBeNull()
  expect(screen.getByRole('button', { name: 'Check data and connection' })).toBeTruthy()
  expect(readScenarios().raw).toBe(before)
})

it('opens the first-use home with actionable choices, without inventing observations', () => {
  renderWithProviders(<SimpleHome />)
  expect(screen.getByRole('heading', { name: 'What would you like to review today?' })).toBeTruthy()
  expect(screen.getByRole('link', { name: /Find candidates/ }).getAttribute('href')).toBe('#find-candidates')
  expect(screen.getByRole('link', { name: /Review holdings/ }).getAttribute('href')).toBe('/portfolio')
  expect(screen.queryByRole('heading', { name: 'Recent observations' })).toBeNull()
})

it('resumes saved plans on home and labels historical observations as historical', () => {
  const s = scenarioFixture(); writeScenarios({ version: 1, scenarios: [s], events: [] }, null)
  renderWithProviders(<SimpleHome />)
  expect(screen.getByRole('heading', { name: 'Pick up where you left off.' })).toBeTruthy()
  expect(screen.getByText('Saved observations, not current prices or fresh recommendations.')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Review price alerts →' }).getAttribute('href')).toBe('/review-alerts')
})

it('rejects a saved-plan link for a different asset without changing the source record', () => {
  const s = scenarioFixture(); writeScenarios({ version: 1, scenarios: [s], events: [] }, null)
  const before = readScenarios().raw
  renderWithProviders(<Routes><Route path="/" element={<Link to={`/review-alerts?scenario=${s.id}&instrumentId=another-market`}>Open mismatched plan</Link>} /><Route path="/review-alerts" element={<ReviewAlertsPage />} /></Routes>)
  fireEvent.click(screen.getByRole('link', { name: 'Open mismatched plan' }))
  expect(screen.getByRole('alert').textContent).toContain('No substitution was made')
  expect(screen.queryByRole('region', { name: 'Price plan from analysis' })).toBeNull()
  expect(readScenarios().raw).toBe(before)
})

it('withholds saving when the edited cost assumption is outside the supported range', () => {
  renderWithProviders(<SimpleDecisionBrief instrument={opportunityCoin} decision={opportunityDecision()} language="en" holding={false} onDetails={() => {}} />)
  fireEvent.click(screen.getByText('Strategy conditions and costs'))
  fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '4' } })
  expect(screen.getByRole('alert').textContent).toContain('0 to 3%')
  expect(screen.queryByText('Set alerts and record these prices')).toBeNull()
  expect(readScenarios().scenarios).toHaveLength(0)
})
