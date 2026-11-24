import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { futuresResult } from '@/test/futuresFixtures'
import { opportunityNow as now, opportunityResult } from '@/test/opportunityFixtures'
import { rankFuturesCandidates } from '@/services/cryptoAnalysis/futuresCandidates'
import { rankSpotCandidates } from '@/services/cryptoAnalysis/spotCandidates'
import { candidateAction } from '@/services/cryptoAnalysis/candidateAction'
import { CandidateDecision } from './CandidateDecision'

it('explains a completed breakout exclusion with measured heat instead of repeating an obsolete entry condition', () => {
  const row = opportunityResult(), hour = row.decision.frames[0]
  hour.rsi = 80
  const candidate = rankSpotCandidates([row], now)[0]
  render(<CandidateDecision candidate={candidate} language="ko" />)
  expect(screen.getByText(/추격 진입을 제외합니다.*80.00/)).toBeTruthy()
  expect(screen.getByText(/단기 확인선은 이미 돌파했지만 위 제외 기준이 우선/)).toBeTruthy()
  expect(screen.getByText(/재평가 기준: RSI 70 미만/)).toBeTruthy()
  expect(screen.queryByText(/1시간봉이 지지 구간 안에서/)).toBeNull()
})

it('explains the exact higher-timeframe trend rule blocking a neutral short', () => {
  const row = futuresResult()
  row.decision.frames.find(f => f.frame === '4H')!.direction = 'neutral'
  const candidate = rankFuturesCandidates([row], now, 'short')[0]
  expect(candidate.verdict).toEqual({action:'excluded',exclusion:'regime'})
  render(<CandidateDecision candidate={candidate} language="ko" />)
  expect(screen.getByText(/큰 흐름은 중립/)).toBeTruthy()
  expect(screen.getByText(/4H 추세 기준: 종가.*20봉 평균/)).toBeTruthy()
})

it('keeps an achievable cost boundary distinct from a newly invented target or an entry permission', () => {
  const candidate = rankFuturesCandidates([futuresResult()], now, 'short')[0]
  candidate.verdict = {action:'excluded',exclusion:'reward'}
  candidate.plan = {...candidate.plan,stop:104,target:90,costPercent:1,netRewardRisk:1.2}
  render(<CandidateDecision candidate={candidate} language="en" />)
  // (90 + 1.5 × 104) / (2.5 × .99) = 99.393939…
  expect(screen.getByText(/entry ≥ 99.393939 USDT gives reward\/risk 1.5/)).toBeTruthy()
  expect(screen.getByText(/not a new entry zone or entry signal/)).toBeTruthy()
})

it('does not claim volume alone will authorize entry when another condition also remains', () => {
  const row = opportunityResult()
  row.decision.frames[0].volumeRatio = 1
  const candidate = rankSpotCandidates([row], now)[0]
  expect(candidate.verdict.action).toBe('volume')
  render(<CandidateDecision candidate={candidate} language="en" />)
  expect(screen.getByText(/Last closed-bar volume is 1.00×.*1.3× is required/)).toBeTruthy()
  expect(screen.getByText(/All remaining conditions must also pass/)).toBeTruthy()
})

it('does not report a stop crossing when the strategy could not calculate any stop', () => {
  const candidate = rankSpotCandidates([opportunityResult()], now)[0]
  candidate.plan = {...candidate.plan,status:'avoid',stop:null,checks:candidate.plan.checks.map(c => ['risk','structure'].includes(c.key) ? {...c,passed:false} : c)}
  candidate.verdict = candidateAction(candidate.plan, false, false)
  expect(candidate.verdict).toEqual({action:'excluded',exclusion:'structure'})
  render(<CandidateDecision candidate={candidate} language="en" />)
  expect(screen.queryByText(/crossed the stop/)).toBeNull()
  expect(screen.getByText(/levels are incomplete or incorrectly ordered/)).toBeTruthy()
})
