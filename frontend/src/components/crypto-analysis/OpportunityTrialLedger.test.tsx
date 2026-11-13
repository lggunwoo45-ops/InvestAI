import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { DisplayModeProvider } from '@/app/displayMode/DisplayModeProvider'
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
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
beforeEach(()=>{localStorage.clear();localStorage.setItem('market-copilot.displayMode.v1','expert');mode.value='live';vi.clearAllMocks();vi.spyOn(document,'hidden','get').mockReturnValue(false)})
afterEach(()=>vi.restoreAllMocks())
const show=()=>render(<MemoryRouter><DisplayModeProvider><OpportunityTrialLedger/></DisplayModeProvider></MemoryRouter>)
it('keeps first-use results empty and explains how to start without invented successes',async()=>{
  show()
  expect(screen.getByRole('heading',{name:'아직 기록한 후보가 없어요'})).toBeTruthy()
  expect(screen.queryByText('0 / 0')).toBeNull()
  expect(screen.queryByRole('button',{name:'이후 가격 확인'})).toBeNull()
  expect(screen.queryByRole('button',{name:'검증 기록 내려받기'})).toBeNull()
  expect(screen.getByRole('link',{name:'첫 후보 검색하기 →'}).getAttribute('href')).toBe('/ai-analysis')
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
  expect(screen.getByText('0.00% ~ 100.00%')).toBeTruthy()
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
it('filters list outcomes without inflating aggregate results and keeps the original market link',async()=>{
  const t=trialFixture(),bar=trialBars(t)[0],now=t.startAt+H
  vi.spyOn(Date,'now').mockReturnValue(now)
  const win=mergeTrialEvidence({...t,id:'win',kind:'breakout'},[{...bar,high:t.target}],now)
  const loss=mergeTrialEvidence({...t,id:'loss',kind:'pullback'},[{...bar,low:t.stop}],now)
  localStorage.setItem(trialStorageKey(),JSON.stringify({version:1,trials:[win,loss]}))
  show()
  expect(screen.getByText('2 / 2')).toBeTruthy()
  expect(screen.getByText('50.00%')).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox',{name:'목록에서 볼 결과'}),{target:{value:'target'}})
  expect(screen.getByText('2 / 2')).toBeTruthy()
  expect(screen.getByText('50.00%')).toBeTruthy()
  expect(screen.queryByText('손절 도달',{selector:'strong'})).toBeNull()
  expect(screen.getByRole('link',{name:'현재 같은 종목 분석 →'}).getAttribute('href')).toBe('/my-analysis?instrumentId=upbit-sol')
  fireEvent.click(screen.getByText('전략별 결과 비교',{selector:'summary'}))
  const table=screen.getByRole('table',{name:/기록한 사례의 가상 결과/})
  expect(within(table).getByRole('rowheader',{name:'상승 추세 눌림'})).toBeTruthy()
  fireEvent.change(screen.getByRole('combobox',{name:'거래시장'}),{target:{value:'binance-spot'}})
  expect(screen.getByText('0 / 0')).toBeTruthy()
  expect(screen.getByText(/선택한 조건에 맞는 기록이 없습니다/)).toBeTruthy()
  expect(screen.getByRole('button',{name:'현재 조건 CSV'}).hasAttribute('disabled')).toBe(true)
  await waitFor(()=>expect(screen.getByRole('button',{name:'이후 가격 확인'}).hasAttribute('disabled')).toBe(false))
})

function ViewControls() { const { setDisplayMode } = useDisplayMode(); return <><button onClick={() => setDisplayMode('simple')}>Simple view</button><button onClick={() => setDisplayMode('expert')}>Expert view</button></> }
it('shows every outcome in simple mode and restores expert filters without refetching or changing records', async () => {
  const trial = trialFixture(), bar = trialBars(trial)[0], at = trial.startAt + H
  vi.spyOn(Date, 'now').mockReturnValue(at)
  const ambiguous = mergeTrialEvidence(trial, [{ ...bar, low: trial.stop, high: trial.target }], at)
  const missing = { ...trial, id: 'missing', kind: 'breakout' as const, instrument: { ...trial.instrument, id: 'upbit-eth', symbol: 'ETH/KRW' } }
  const original = JSON.stringify({ version: 1, trials: [ambiguous, missing] })
  localStorage.setItem(trialStorageKey(), original)
  render(<MemoryRouter><DisplayModeProvider><OpportunityTrialLedger /><ViewControls /></DisplayModeProvider></MemoryRouter>)
  fireEvent.change(screen.getByRole('combobox', { name: '검증할 전략' }), { target: { value: 'breakout' } })
  fireEvent.click(screen.getByText('Simple view'))
  expect(screen.queryByRole('combobox', { name: '검증할 전략' })).toBeNull()
  expect(screen.getByText('목표·손절 도달 순서 불명')).toBeTruthy()
  expect(screen.getByText('자료가 부족해 결과 확인 불가')).toBeTruthy()
  expect(screen.getAllByRole('link', { name: '이 종목 다시 분석 →' }).map(link => link.getAttribute('href'))).toEqual(expect.arrayContaining(['/my-analysis?instrumentId=' + trial.instrument.id,'/my-analysis?instrumentId=upbit-eth']))
  fireEvent.click(screen.getByText('Expert view'))
  expect((screen.getByRole('combobox', { name: '검증할 전략' }) as HTMLSelectElement).value).toBe('breakout')
  expect(localStorage.getItem(trialStorageKey())).toBe(original)
  await waitFor(() => expect(refreshOpportunityTrials).toHaveBeenCalledTimes(1))
})
