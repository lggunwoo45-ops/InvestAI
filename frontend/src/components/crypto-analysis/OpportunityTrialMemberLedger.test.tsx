import { DisplayModeProvider } from '@/app/displayMode/DisplayModeProvider'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {beforeEach,expect,it,vi} from 'vitest'
import {trialFixture} from '@/test/opportunityTrialFixtures'
const identity=vi.hoisted(()=>({user:{id:'member'},opportunityTrialsAvailable:true,generation:1}))
vi.mock('@/services/cloud/cloudClient',()=>({cloudSnapshot:()=>identity,subscribeCloud:()=>()=>{},cloudSessionGeneration:()=>identity.generation,cloudRequest:vi.fn()}))
vi.mock('@/i18n/useLanguage',()=>({useLanguage:()=>({language:'ko'})}))
vi.mock('@/hooks/useMarketWorkspace',()=>({useMarketWorkspace:()=>({marketDataMode:'mock'})}))
vi.mock('@/services/cryptoAnalysis/opportunityTrialRefresh',()=>({refreshOpportunityTrials:vi.fn()}))
import {cloudRequest} from '@/services/cloud/cloudClient'
import {refreshOpportunityTrials} from '@/services/cryptoAnalysis/opportunityTrialRefresh'
import {trialStorageKey} from '@/services/cryptoAnalysis/opportunityTrialStorage'
import {OpportunityTrialLedger} from './OpportunityTrialLedger'
beforeEach(()=>{vi.clearAllMocks();localStorage.clear();localStorage.setItem('market-copilot.displayMode.v1','expert');identity.generation++})
it('reads real server observations regardless of mock workspace mode and keeps legacy records separate',async()=>{
  const t=trialFixture(),raw=JSON.stringify({version:1,trials:[t]});localStorage.setItem(trialStorageKey(),raw)
  vi.mocked(cloudRequest).mockResolvedValue({version:1,asOf:t.recordedAt,trials:[t]})
  render(<MemoryRouter><DisplayModeProvider><OpportunityTrialLedger/></DisplayModeProvider></MemoryRouter>)
  await waitFor(()=>expect(screen.getByText(/앱을 닫아도 서버가 관찰합니다/)).toBeTruthy())
  expect(screen.getByText('진입 시가 확인 대기')).toBeTruthy()
  expect(refreshOpportunityTrials).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button',{name:'이 기기 이전 기록'}))
  expect(screen.getByText(/서버 동기화하지 않습니다/)).toBeTruthy()
  expect(screen.getByText(/실시간 모드에서만 실제 가격 기록/)).toBeTruthy()
  expect(localStorage.getItem(trialStorageKey())).toBe(raw)
})
it('lets a member retry an empty failed server read instead of displaying fake first-use success',async()=>{
  vi.mocked(cloudRequest).mockRejectedValueOnce(Error('offline'))
  render(<MemoryRouter><DisplayModeProvider><OpportunityTrialLedger/></DisplayModeProvider></MemoryRouter>)
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('offline'))
  expect(screen.queryByRole('heading',{name:'아직 기록한 후보가 없어요'})).toBeNull()
  vi.mocked(cloudRequest).mockResolvedValue({version:1,asOf:Date.now(),trials:[]})
  fireEvent.click(screen.getByRole('button',{name:'이후 가격 확인'}))
  await waitFor(()=>expect(screen.getByRole('heading',{name:'아직 기록한 후보가 없어요'})).toBeTruthy())
})

it('keeps failed server reads retryable in simple mode without invented empty success', async () => {
  localStorage.setItem('market-copilot.displayMode.v1', 'simple')
  vi.mocked(cloudRequest).mockRejectedValueOnce(Error('offline'))
  render(<MemoryRouter><DisplayModeProvider><OpportunityTrialLedger /></DisplayModeProvider></MemoryRouter>)
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('offline'))
  expect(screen.queryByRole('heading', { name: '첫 후보를 기록해보세요' })).toBeNull()
  expect(screen.queryByText('저장한 후보')).toBeNull()
  vi.mocked(cloudRequest).mockResolvedValue({ version: 1, asOf: Date.now(), trials: [] })
  const retry = screen.getByRole('button', { name: '이후 결과 확인' })
  await waitFor(() => expect(retry.hasAttribute('disabled')).toBe(false))
  fireEvent.click(retry)
  await waitFor(() => expect(screen.getByRole('heading', { name: '첫 후보를 기록해보세요' })).toBeTruthy())
})
