import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {trialBars,trialFixture} from '@/test/opportunityTrialFixtures'
import {mergeTrialEvidence,TRIAL_HOUR as H} from '@/services/cryptoAnalysis/opportunityTrials'
import {trialStorageKey} from '@/services/cryptoAnalysis/opportunityTrialStorage'
import {refreshOpportunityTrials} from '@/services/cryptoAnalysis/opportunityTrialRefresh'
import {OpportunityTrialLedger} from './OpportunityTrialLedger'

const mode=vi.hoisted(()=>({value:'live'}))
vi.mock('@/i18n/useLanguage',()=>({useLanguage:()=>({language:'ko'})}))
vi.mock('@/hooks/useMarketWorkspace',()=>({useMarketWorkspace:()=>({marketDataMode:mode.value})}))
vi.mock('@/services/cryptoAnalysis/opportunityTrialRefresh',()=>({refreshOpportunityTrials:vi.fn().mockResolvedValue(undefined)}))
beforeEach(()=>{localStorage.clear();mode.value='live';vi.clearAllMocks();vi.spyOn(document,'hidden','get').mockReturnValue(false)})
afterEach(()=>vi.restoreAllMocks())
const show=()=>render(<MemoryRouter><OpportunityTrialLedger/></MemoryRouter>)
it('keeps first-use results empty and explains how to start without invented successes',async()=>{
  show()
  expect(screen.getByRole('heading',{name:'앞으로 쌓을 검증 기록입니다'})).toBeTruthy()
  expect(screen.getByText('0 / 0')).toBeTruthy()
  await waitFor(()=>expect(screen.getByRole('button',{name:'이후 가격 확인'}).hasAttribute('disabled')).toBe(true))
  expect(screen.getByRole('button',{name:'검증 기록 내려받기'}).hasAttribute('disabled')).toBe(true)
  expect(screen.getByText(/서버 동기화하지 않습니다/)).toBeTruthy()
})
it('shows ambiguous loss-to-gain ranges, excludes missing evidence and filters strategy outcomes',async()=>{
  const trial=trialFixture(),bar=trialBars(trial)[0],at=trial.startAt+H
  vi.spyOn(Date,'now').mockReturnValue(at)
  const ambiguous=mergeTrialEvidence(trial,[{...bar,low:trial.stop,high:trial.target}],at)
  const missing={...trial,id:'missing',kind:'breakout' as const,instrument:{...trial.instrument,id:'upbit-eth',symbol:'ETH/KRW'}}
  localStorage.setItem(trialStorageKey(),JSON.stringify({version:1,trials:[ambiguous,missing]}))
  show()
  expect(screen.getByText('2 / 1')).toBeTruthy()
  expect(screen.getByText('목표·손절 순서 불명')).toBeTruthy()
  expect(screen.getByText('자료 확인 불가 · 집계 제외')).toBeTruthy()
  expect(screen.getByText('0.00% ~ +100.00%')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox',{name:'검증할 전략'}),{target:{value:'breakout'}})
  expect(screen.getByText('1 / 0')).toBeTruthy()
  expect(screen.queryByText('목표·손절 순서 불명')).toBeNull()
  await waitFor(()=>expect(screen.getByRole('button',{name:'이후 가격 확인'}).hasAttribute('disabled')).toBe(false))
  fireEvent.click(screen.getByRole('button',{name:'이후 가격 확인'}))
  await waitFor(()=>expect(refreshOpportunityTrials).toHaveBeenCalledTimes(2))
})
it('does not fetch mock prices or overwrite unreadable records',()=>{
  mode.value='mock'
  localStorage.setItem(trialStorageKey(),'broken')
  show()
  expect(refreshOpportunityTrials).not.toHaveBeenCalled()
  expect(screen.getByRole('alert').textContent).toContain('원본을 보존')
  expect(localStorage.getItem(trialStorageKey())).toBe('broken')
  expect(screen.getByRole('button',{name:'이후 가격 확인'}).hasAttribute('disabled')).toBe(true)
})
