import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { futuresResult } from '@/test/futuresFixtures'
import { opportunityNow as now } from '@/test/opportunityFixtures'
import { FuturesOpportunityBoard } from './FuturesOpportunityBoard'

beforeEach(() => localStorage.clear())
it('shows a short, its prices and pending checks without turning it into a spot recommendation', () => {
  const row = futuresResult()
  const view = renderWithProviders(<FuturesOpportunityBoard results={[row]} now={now} language="en" simple />)
  const shorts = screen.getByRole('region', { name:'short candidates' })
  expect(within(shorts).getByText('Entry conditions met')).toBeTruthy()
  expect(within(shorts).getByText(/SHORT · Support breakdown/)).toBeTruthy()
  expect(within(shorts).getByRole('link').getAttribute('href')).toBe('/my-analysis?instrumentId=binance-futures-solusdt')
  expect(within(shorts).getByText(/Evidence · 0 pending/).closest('details')?.open).toBe(false)
  fireEvent.click(screen.getByRole('button', {name:'Short · falling'}))
  expect(screen.queryByRole('region', {name:'long candidates'})).toBeNull()
  expect(screen.queryByText(/Record all/)).toBeNull()
  view.rerender(<FuturesOpportunityBoard results={[row]} now={now+90_001} language="en" simple />)
  expect(screen.queryByText('Entry conditions met')).toBeNull()
  expect(screen.getByText('1 scan snapshots have expired')).toBeTruthy()
  expect(screen.getByText('Earlier scan records · not current entry signals')).toBeTruthy()
  expect(screen.queryByText('1 unassessed assets')).toBeNull()
})
it('recalculates when cost changes and never shows a candidate with an invalid cost', () => {
  renderWithProviders(<FuturesOpportunityBoard results={[futuresResult()]} now={now} language="en" />)
  expect(screen.getByText(/Evidence · 0 pending/).closest('details')?.open).toBe(true)
  fireEvent.change(screen.getByRole('spinbutton'),{target:{value:''}})
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.queryByText('Entry conditions met')).toBeNull()
})
