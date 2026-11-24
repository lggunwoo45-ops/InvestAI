import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { opportunityCoin, opportunityDecision, opportunityNow, opportunityResult } from '@/test/opportunityFixtures'
import { OpportunityBoard, OpportunityReview } from './OpportunityPlans'
import { buildOpportunityPlans } from '@/services/cryptoAnalysis/opportunityEngine'
import { readScenarios } from '@/services/scenarios/scenarioStorage'
import {readOpportunityTrials} from '@/services/cryptoAnalysis/opportunityTrialStorage'

beforeEach(()=>{ localStorage.clear();vi.useFakeTimers();vi.setSystemTime(opportunityNow) })
afterEach(()=>vi.useRealTimers())
it('shows nearby pending candidates in active scans without confirming or recording them, and expires them', () => {
  const result = opportunityResult()
  result.decision.frames.find(frame => frame.frame === '1H')!.volumeRatio = 1
  const props = { results: [result], now: opportunityNow, language: 'en' as const, active: true }
  const view = render(<MemoryRouter><OpportunityBoard {...props} /></MemoryRouter>)
  const early = screen.getByRole('region', { name: 'Spot review shortlist' })
  expect(within(early).getByText('Waiting for volume')).toBeTruthy()
  expect(within(early).getByText('Market evidence')).toBeTruthy()
  expect(screen.getAllByRole('link', { name: /Current analysis and price alerts/ })).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Record all eligible spot setups (0)' }).hasAttribute('disabled')).toBe(true)
  expect(readOpportunityTrials().trials).toHaveLength(0)
  view.rerender(<MemoryRouter><OpportunityBoard {...props} now={opportunityNow + 90_001} /></MemoryRouter>)
  expect(screen.queryByRole('link', { name: /Current analysis and price alerts/ })).toBeNull()
})
it('records all qualified candidates including hidden cards, but blocks incomplete scans',()=>{
  const result=opportunityResult(),results=Array.from({length:5},(_,i)=>({...result,instrument:{...result.instrument,id:`upbit-c${i}`,symbol:`C${i}/KRW`}}))
  const props={results,now:opportunityNow,language:'en' as const,simple:true,active:true}
  const view=render(<MemoryRouter><OpportunityBoard {...props} canRecord={false}/></MemoryRouter>)
  expect(screen.getAllByRole('link',{name:/Current analysis and price alerts/})).toHaveLength(3)
  expect(screen.getByRole('button',{name:'Record all eligible spot setups (5)'}).hasAttribute('disabled')).toBe(true)
  view.rerender(<MemoryRouter><OpportunityBoard {...props} canRecord/></MemoryRouter>)
  fireEvent.click(screen.getByRole('button',{name:'Record all eligible spot setups (5)'}))
  expect(readOpportunityTrials().trials).toHaveLength(5)
  expect(screen.getByRole('link',{name:/View validation records/}).getAttribute('href')).toBe('/results')
})
it('shows a qualifying rebound, recalculates with costs and removes expired prices',()=>{
  const props = {results:[opportunityResult()],now:opportunityNow,language:'en' as const,simple:true}
  const view = render(<MemoryRouter><OpportunityBoard {...props} /></MemoryRouter>)
  const ready = screen.getByRole('region',{name:'Entry conditions met'})
  expect(within(ready).getByText('Countertrend rebound')).toBeTruthy()
  expect(within(ready).getByRole('link',{name:/Review current plan/}).getAttribute('href')).toContain(opportunityCoin.id)
  fireEvent.click(screen.getByText('Adjust cost assumptions'))
  fireEvent.change(screen.getByRole('spinbutton',{name:'Total estimated buy/sell cost (%)'}),{target:{value:''}})
  expect(screen.getByRole('alert').textContent).toContain('Enter a cost')
  expect(screen.queryByRole('region',{name:'Entry conditions met'})).toBeNull()
  fireEvent.change(screen.getByRole('spinbutton',{name:'Total estimated buy/sell cost (%)'}),{target:{value:'.2'}})
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

it('keeps active observations unrecordable, shows all assets on request, and hides unusable trade levels', () => {
  const rows = Array.from({length:12}, (_, i) => {
    const row = opportunityResult()
    row.instrument.id = `upbit-${i}`
    row.instrument.symbol = `C${i}/KRW`
    row.decision.price = .01
    return row
  })
  const refresh = vi.fn()
  const props = { results:rows, now:opportunityNow, language:'en' as const, active:true, onRefresh:refresh }
  const view = render(<MemoryRouter><OpportunityBoard {...props} /></MemoryRouter>)
  const shortlist = screen.getByRole('region', {name:'Spot review shortlist'})
  expect(within(shortlist).getAllByRole('article')).toHaveLength(3)
  expect(within(shortlist).getAllByText('Entry excluded')).toHaveLength(3)
  expect(within(shortlist).queryByText('Conditional buy zone')).toBeNull()
  expect(screen.getByRole('button', {name:'Record all eligible spot setups (0)'}).hasAttribute('disabled')).toBe(true)
  fireEvent.click(screen.getByRole('button', {name:'Show all decisions (12)'}))
  expect(within(shortlist).getAllByRole('article')).toHaveLength(12)
  fireEvent.click(screen.getByRole('button', {name:'Show top three'}))
  expect(within(shortlist).getAllByRole('article')).toHaveLength(3)
  view.rerender(<MemoryRouter><OpportunityBoard {...props} now={opportunityNow+90_001} /></MemoryRouter>)
  expect(within(shortlist).queryByRole('article')).toBeNull()
  fireEvent.click(screen.getByRole('button', {name:'Refresh spot scan'}))
  expect(refresh).toHaveBeenCalledTimes(1)
  expect(readOpportunityTrials().trials).toHaveLength(0)
})
