import {fireEvent,screen} from '@testing-library/react'
import {useLocation} from 'react-router-dom'
import {expect,it,vi} from 'vitest'
import {renderWithProviders} from '@/test/renderWithProviders'
import {AiAnalysisPage} from './AiAnalysisPage'

vi.mock('@/components/ai-analysis/LiveCandidateSearch',()=>({LiveCandidateSearch:()=> <h2>Search fixture</h2>}))
vi.mock('@/services/cryptoAnalysis/opportunityTrialRefresh',()=>({refreshOpportunityTrials:vi.fn().mockResolvedValue(undefined)}))
function Location(){return <output data-testid="location">{useLocation().hash}</output>}
it('keeps the records tab in the URL so its new-candidates link and browser history can leave it',()=>{
  localStorage.clear()
  renderWithProviders(<><AiAnalysisPage/><Location/></>)
  fireEvent.click(screen.getByRole('button',{name:'Validation records'}))
  expect(screen.getByTestId('location').textContent).toBe('#opportunity-records')
  expect(screen.getByRole('heading',{name:'What happened after the recommendation?'})).toBeTruthy()
  fireEvent.click(screen.getByRole('link',{name:/Find new candidates/}))
  expect(screen.getByTestId('location').textContent).toBe('')
  expect(screen.getByRole('heading',{name:'Search fixture'})).toBeTruthy()
})
