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
  initialSnapshot?: AnalysisBaselineSnapshot | null
}

export interface AnalysisBaselineSnapshot {
  actionStatus: ActionReadinessStatus
  capturedAt: string
  interestStage: BeginnerInterestStage
  price: number
}

const copy = {
  en: { title: 'Analysis baseline locked', time: 'Baseline time', price: 'Recorded price', current: 'Current price', change: 'Change since baseline', status: 'Baseline status', stage: 'Baseline interest stage', refresh: 'Refresh baseline', notice: 'Current price can change, but the analysis baseline stays fixed until refreshed.', unavailable: 'A baseline cannot be recorded until a valid current price is available.', statuses: { decisionPending: 'Decision pending', waiting: 'Waiting / checking conditions', watchZone: 'Watch zone', conditionalApproach: 'Conditional approach possible', chaseCaution: 'Movement expansion caution', sharpDropReboundCaution: 'Sharp-drop rebound caution' }, stages: { waiting: 'Waiting / checking conditions', first: 'Observation start', second: 'Conditions forming', third: 'Conditions clear', chaseCaution: 'Movement expansion caution', reboundCaution: 'Sharp-drop rebound caution' } },
  ko: { title: '분석 기준 고정', time: '기준 시점', price: '기록한 가격', current: '현재 가격', change: '기준 이후 변화', status: '기준 상태', stage: '기준 관심 단계', refresh: '기준 새로고침', notice: '현재 가격은 바뀔 수 있지만, 분석 기준은 새로고침 전까지 유지됩니다.', unavailable: '유효한 현재 가격을 확인하기 전에는 기준을 기록하지 않습니다.', statuses: { decisionPending: '판단 보류', waiting: '대기 / 조건 확인 중', watchZone: '관심 구간', conditionalApproach: '조건부 접근 가능', chaseCaution: '변동 확대 주의', sharpDropReboundCaution: '급락 반등 주의' }, stages: { waiting: '대기 / 조건 확인 중', first: '관찰 시작', second: '조건 확인', third: '조건 뚜렷', chaseCaution: '변동 확대 주의', reboundCaution: '급락 반등 주의' } },
} as const

function validSnapshot(snapshot: AnalysisBaselineSnapshot | null | undefined): snapshot is AnalysisBaselineSnapshot {
  return Boolean(snapshot && Number.isFinite(snapshot.price) && snapshot.price > 0 && !Number.isNaN(Date.parse(snapshot.capturedAt)))
}

function createSnapshot(currentPrice: number, actionStatus: ActionReadinessStatus, interestStage: BeginnerInterestStage): AnalysisBaselineSnapshot | null {
  return Number.isFinite(currentPrice) && currentPrice > 0 ? { actionStatus, interestStage, capturedAt: new Date().toISOString(), price: currentPrice } : null
}

function number(value: number, language: Language) {
  return Number.isFinite(value) ? new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value) : '—'
}

export function AnalysisBaselinePanel({ actionStatus, currentPrice, instrumentId, interestStage, language, quoteCurrency, initialSnapshot = null }: AnalysisBaselinePanelProps) {
  const t = copy[language]
  const [baseline, setBaseline] = useState<AnalysisBaselineSnapshot | null>(() => validSnapshot(initialSnapshot) ? initialSnapshot : createSnapshot(currentPrice, actionStatus, interestStage))
  const difference = baseline && Number.isFinite(currentPrice) ? currentPrice - baseline.price : null
  const refresh = () => { const next = createSnapshot(currentPrice, actionStatus, interestStage); if (next) setBaseline(next) }

  return <section className={styles.panel} aria-label={t.title} data-instrument={instrumentId}>
    <header><div><span>{t.title}</span><strong>{t.notice}</strong></div><button type="button" disabled={!Number.isFinite(currentPrice) || currentPrice <= 0} onClick={refresh}>{t.refresh}</button></header>
    {!baseline && <p role="status">{t.unavailable}</p>}
    {baseline && <dl>
      <div><dt>{t.time}</dt><dd>{new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(baseline.capturedAt))}</dd></div>
      <div><dt>{t.price}</dt><dd>{number(baseline.price, language)} {quoteCurrency}</dd></div>
      <div><dt>{t.current}</dt><dd>{number(currentPrice, language)} {quoteCurrency}</dd></div>
      <div><dt>{t.change}</dt><dd>{difference === null ? '—' : `${difference >= 0 ? '+' : ''}${number(difference, language)} ${quoteCurrency}`}</dd></div>
      <div><dt>{t.status}</dt><dd>{t.statuses[baseline.actionStatus]}</dd></div>
      <div><dt>{t.stage}</dt><dd>{t.stages[baseline.interestStage]}</dd></div>
    </dl>}
  </section>
}
