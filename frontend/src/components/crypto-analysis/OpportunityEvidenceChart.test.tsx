import {render,screen} from '@testing-library/react'
import {describe,expect,it} from 'vitest'
import {trialBars,trialFixture} from '@/test/opportunityTrialFixtures'
import {evaluateOpportunityTrial,mergeTrialEvidence,TRIAL_HOUR as H} from '@/services/cryptoAnalysis/opportunityTrials'
import {OpportunityEvidenceChart} from './OpportunityEvidenceChart'

describe('Observed price path',()=>{
  it('shows only completed evidence up to the evaluated exit and makes exact values accessible',()=>{
    const t=trialFixture(),bars=trialBars(t),now=t.startAt+24*H
    bars[1].high=t.target
    const record=mergeTrialEvidence(t,bars,now),outcome=evaluateOpportunityTrial(record,now)
    const {container}=render(<OpportunityEvidenceChart trial={record} outcome={outcome} asOf={now} language="ko"/> )
    expect(screen.getByRole('img',{name:/기록 이후 실제 시간봉/})).toBeTruthy()
    expect(container.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(screen.getByText(/봉 안의 체결 순서는 알 수 없습니다/)).toBeTruthy()
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })
  it('does not plot evidence beyond the snapshot or conflicting records',()=>{
    const t=trialFixture(),now=t.startAt+H,record=mergeTrialEvidence(t,trialBars(t,1),now)
    const {rerender}=render(<OpportunityEvidenceChart trial={record} outcome={evaluateOpportunityTrial(record,now-1)} asOf={now-1} language="en"/> )
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText(/No completed hourly bars yet/)).toBeTruthy()
    const revised={...record,issue:'revised' as const}
    rerender(<OpportunityEvidenceChart trial={revised} outcome={evaluateOpportunityTrial(revised,now)} asOf={now} language="en"/> )
    expect(screen.queryByRole('img')).toBeNull()
    expect(screen.getByText(/source conflicts with stored prices/)).toBeTruthy()
  })
})
