import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { opportunityCoin, opportunityDecision, opportunityNow, opportunityResult } from '@/test/opportunityFixtures'
import { OpportunityBoard, OpportunityReview } from './OpportunityPlans'
import { buildOpportunityPlans } from '@/services/cryptoAnalysis/opportunityEngine'
import { readScenarios } from '@/services/scenarios/scenarioStorage'

beforeEach(()=>{ localStorage.clear();vi.useFakeTimers();vi.setSystemTime(opportunityNow) })
afterEach(()=>vi.useRealTimers())
it('shows a qualifying rebound, recalculates with costs and removes expired prices',()=>{
  const props = {results:[opportunityResult()],now:opportunityNow,language:'en' as const,simple:true}
  const view = render(<MemoryRouter><OpportunityBoard {...props} /></MemoryRouter>)
  const ready = screen.getByRole('region',{name:'Entry conditions met'})
  expect(within(ready).getByText('Countertrend rebound')).toBeTruthy()
  expect(within(ready).getByRole('link',{name:/Review current plan/}).getAttribute('href')).toContain(opportunityCoin.id)
  fireEvent.change(screen.getByRole('spinbutton',{name:'Assumed round-trip cost (%)'}),{target:{value:''}})
  expect(screen.getByRole('alert').textContent).toContain('Enter a cost')
  expect(within(ready).queryByRole('link')).toBeNull()
  fireEvent.change(screen.getByRole('spinbutton',{name:'Assumed round-trip cost (%)'}),{target:{value:'.2'}})
  view.rerender(<MemoryRouter><OpportunityBoard {...props} now={opportunityNow+90_001} /></MemoryRouter>)
  expect(screen.queryByRole('link',{name:/Review current plan/})).toBeNull()
  expect(screen.getByRole('status').textContent).toContain('Expired')
  expect(screen.queryByText('Entry review zone')).toBeNull()
})
it('sizes a plan within both budgets and explicitly records price-only monitoring',()=>{
  const decision = opportunityDecision(), plan = buildOpportunityPlans(decision).find(p=>p.kind==='rebound')!
  render(<OpportunityReview instrument={opportunityCoin} decision={decision} language="en" />)
  fireEvent.click(screen.getByText('Size a purchase from a loss budget'))
  fireEvent.change(screen.getByRole('spinbutton',{name:'Planned loss budget (KRW)'}),{target:{value:'10'}})
  fireEvent.change(screen.getByRole('spinbutton',{name:'Capital limit (KRW)'}),{target:{value:'1000'}})
  expect(screen.getByText(/Calculated quantity/)).toBeTruthy()
  fireEvent.click(screen.getByText('Record and monitor these price levels'))
  expect(screen.getByText(/not every volume\/RSI strategy condition/)).toBeTruthy()
  fireEvent.click(screen.getByRole('button',{name:'Save this analysis as a scenario'}))
  expect((screen.getByRole('spinbutton',{name:'Entry zone low (KRW)'}) as HTMLInputElement).value).toBe(String(plan.entry![0]))
  const form = screen.getByRole('form')
  fireEvent.submit(form)
  const saved = readScenarios()
  expect(saved.scenarios[0]).toMatchObject({entry:plan.entry,stop:plan.stop,target:plan.target,baseline:{direction:'sell',frame:'1H'}})
})
