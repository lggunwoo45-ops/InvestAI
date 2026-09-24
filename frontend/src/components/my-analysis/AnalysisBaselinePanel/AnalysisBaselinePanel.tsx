import { useState } from 'react'

import type { BeginnerInterestStage } from '@/components/my-analysis/BeginnerInterestZone/beginnerInterestZoneModel'
import type { Language } from '@/i18n/translations'
import type { ActionReadinessStatus } from '@/types/myAnalysis'
import styles from './AnalysisBaselinePanel.module.css'

interface AnalysisBaselinePanelProps {
  actionStatus: ActionReadinessStatus
  currentPrice: number
  instrumentId: string
  interestStage: BeginnerInterestStage
  language: Language
  quoteCurrency: string
}

interface BaselineSnapshot {
  actionStatus: ActionReadinessStatus
  capturedAt: string
  interestStage: BeginnerInterestStage
  price: number
}

const copy = {
  en: { title: 'Analysis baseline locked', time: 'Baseline time', price: 'Baseline price', current: 'Current price', change: 'Change since baseline', status: 'Baseline status', stage: 'Baseline interest stage', refresh: 'Refresh baseline', notice: 'Current price can change, but the analysis baseline stays fixed until refreshed.', statuses: { decisionPending: 'Decision pending', waiting: 'Waiting / checking conditions', watchZone: 'Watch zone', conditionalApproach: 'Conditional approach possible', chaseCaution: 'Chase caution', sharpDropReboundCaution: 'Sharp-drop rebound caution' }, stages: { waiting: 'Waiting / checking conditions', first: '1st interest zone', second: '2nd interest zone', third: '3rd interest zone', chaseCaution: 'Chase caution', reboundCaution: 'Sharp-drop rebound caution' } },
  ko: { title: '분석 기준 고정', time: '기준 시점', price: '기준 가격', current: '현재 가격', change: '기준 이후 변화', status: '기준 상태', stage: '기준 관심 단계', refresh: '기준 새로고침', notice: '현재 가격은 바뀔 수 있지만, 분석 기준은 새로고침 전까지 유지됩니다.', statuses: { decisionPending: '판단 보류', waiting: '대기 / 조건 확인 중', watchZone: '관심 구간', conditionalApproach: '조건부 접근 가능', chaseCaution: '추격 접근 주의', sharpDropReboundCaution: '급락 반등 주의' }, stages: { waiting: '대기 / 조건 확인 중', first: '1차 관심구간', second: '2차 관심구간', third: '3차 관심구간', chaseCaution: '추격 접근 주의', reboundCaution: '급락 반등 주의' } },
} as const

function createSnapshot(currentPrice: number, actionStatus: ActionReadinessStatus, interestStage: BeginnerInterestStage): BaselineSnapshot {
  return { actionStatus, interestStage, capturedAt: new Date().toISOString(), price: currentPrice }
}

function number(value: number, language: Language) {
  return Number.isFinite(value) ? new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value) : '—'
}

export function AnalysisBaselinePanel({ actionStatus, currentPrice, instrumentId, interestStage, language, quoteCurrency }: AnalysisBaselinePanelProps) {
  const t = copy[language]
  const [baseline, setBaseline] = useState(() => createSnapshot(currentPrice, actionStatus, interestStage))
  const difference = Number.isFinite(currentPrice) && Number.isFinite(baseline.price) ? currentPrice - baseline.price : null

  return <section className={styles.panel} aria-label={t.title} data-instrument={instrumentId}>
    <header><div><span>{t.title}</span><strong>{t.notice}</strong></div><button type="button" onClick={() => setBaseline(createSnapshot(currentPrice, actionStatus, interestStage))}>{t.refresh}</button></header>
    <dl>
      <div><dt>{t.time}</dt><dd>{new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(baseline.capturedAt))}</dd></div>
      <div><dt>{t.price}</dt><dd>{number(baseline.price, language)} {quoteCurrency}</dd></div>
      <div><dt>{t.current}</dt><dd>{number(currentPrice, language)} {quoteCurrency}</dd></div>
      <div><dt>{t.change}</dt><dd>{difference === null ? '—' : `${difference >= 0 ? '+' : ''}${number(difference, language)} ${quoteCurrency}`}</dd></div>
      <div><dt>{t.status}</dt><dd>{t.statuses[baseline.actionStatus]}</dd></div>
      <div><dt>{t.stage}</dt><dd>{t.stages[baseline.interestStage]}</dd></div>
    </dl>
  </section>
}
