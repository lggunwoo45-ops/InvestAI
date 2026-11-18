import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { opportunityNow, opportunityResult } from '@/test/opportunityFixtures'
import { ScanObservations, ScanDataIssues } from './ScanObservations'

it('offers analyzable observations without relabeling unfavorable plans as entry signals', () => {
  const row = opportunityResult()
  row.decision = { ...row.decision, price: 200, extended: true }
  // A price outside the setup invalidates entry without invalidating the source data.
  render(<MemoryRouter><ScanObservations results={[row]} now={opportunityNow} cost={3} language="en" /></MemoryRouter>)
  const region = screen.getByRole('region', { name: 'Observation shortlist' })
  expect(within(region).getByText('Observation only')).toBeTruthy()
  expect(within(region).getByRole('link').getAttribute('href')).toContain(row.instrument.id)
  expect(within(region).queryByText('Entry conditions met')).toBeNull()
})
it('does not fill the observation list with stale or missing evidence and explains the actual data issue', () => {
  const old = { ...opportunityResult(), expiresAt: opportunityNow - 1 }
  const missing = { ...opportunityResult(), instrument: { ...old.instrument, id: 'other', symbol: 'OTHER/KRW' }, decision: { ...old.decision, direction: 'unavailable' as const, frames: old.decision.frames.map(f => ({ ...f, issue: 'gaps' as const })) } }
  render(<MemoryRouter><ScanObservations results={[old, missing]} now={opportunityNow} cost={.2} language="en" /><ScanDataIssues results={[old, missing]} now={opportunityNow} language="en" /></MemoryRouter>)
  expect(screen.queryByRole('region', { name: 'Observation shortlist' })).toBeNull()
  expect(screen.getByText('Snapshot expired · fresh analysis required')).toBeTruthy()
  expect(screen.getByText(/1H: Missing source bars/)).toBeTruthy()
})
