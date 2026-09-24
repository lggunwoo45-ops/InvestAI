import { useMemo, useState } from 'react'

import { deriveBeginnerInterestStage } from '@/components/my-analysis/BeginnerInterestZone/beginnerInterestZoneModel'
import { derivePositionReview } from '@/components/my-analysis/PositionReviewPanel/positionReviewModel'
import type { MyAnalysisReviewMode } from '@/components/my-analysis/ReviewModeSelector/ReviewModeSelector'
import type { Language } from '@/i18n/translations'
import type { DartDisclosureReview } from '@/types/dart'
import type { MyAnalysisResult } from '@/types/myAnalysis'
import styles from './MyAnalysisReportSummary.module.css'

interface MyAnalysisReportSummaryProps {
  analysis: MyAnalysisResult
  language: Language
  mode: 'simple' | 'expert'
  symbol: string
  name: string
  reviewMode?: MyAnalysisReviewMode
  basisPrice?: number | null
  currentPrice?: number
  quoteCurrency?: string
  disclosureReview?: DartDisclosureReview | null
}

const copy = {
  en: {
    eyebrow: 'Review summary', title: 'Report summary', current: 'Current state', reason: 'Key reason', caution: 'Main caution', next: 'Next check', confidence: 'Data confidence', loaded: 'Loaded evidence', missing: 'Missing evidence', basedOn: 'Based on currently loaded data', copy: 'Copy summary', copied: 'Summary copied', unavailable: 'Copy unavailable', privacy: 'This summary excludes personal notes and average price', positionPrivacy: 'This summary excludes personal notes; basis price appears only as position context', plainTitle: 'Market Copilot review summary', summary: 'Summary', safety: 'Caution: This is not investment advice or a trade instruction.', plainText: 'Plain-text summary', guide: 'How to read action status', interest: 'Interest stage', position: 'Position state', basis: 'My basis price', currentPrice: 'Current price', basisChange: 'Change from basis',
    dataLabels: { live: 'Live data', mock: 'Mock/demo data', limited: 'Limited data', unavailable: 'Data unavailable' },
    disclosure: 'Disclosure review: Recent disclosure evidence is available. Check the original disclosure.', disclosureNeeded: 'Disclosure review: Correction or material disclosures are included, so the original disclosures should be checked.',
    stages: { waiting: 'Waiting / checking conditions', first: '1st interest zone', second: '2nd interest zone', third: '3rd interest zone', chaseCaution: 'Chase caution', reboundCaution: 'Sharp-drop rebound caution' },
    positions: { waiting: 'Waiting / checking conditions', baselineValid: 'Baseline still valid', invalidationReview: 'Invalidation basis review', profitProtection: 'Profit protection review' },
    guideItems: [['Decision pending', 'Data is not reliable enough yet.'], ['Waiting / checking conditions', 'More conditions need confirmation.'], ['Watch zone', 'Worth monitoring while conditions remain incomplete.'], ['Conditional approach possible', 'Some conditions exist, but confirmation is still needed.'], ['Chase caution', 'Recent movement is already large.'], ['Sharp-drop rebound caution', 'A rebound after a sharp drop needs more evidence.']],
  },
  ko: {
    eyebrow: '분석 요약', title: '리포트 요약', current: '현재 상태', reason: '핵심 이유', caution: '주요 주의점', next: '다음 확인', confidence: '데이터 신뢰 상태', loaded: '불러온 근거', missing: '부족한 근거', basedOn: '현재 불러온 데이터를 기준으로 표시', copy: '요약 복사', copied: '요약을 복사했습니다', unavailable: '복사 기능을 사용할 수 없습니다', privacy: '이 요약에는 개인 메모와 평균 가격이 포함되지 않습니다', positionPrivacy: '이 요약에는 개인 메모가 포함되지 않으며 기준가는 보유 맥락으로만 표시됩니다', plainTitle: 'Market Copilot 분석 요약', summary: '요약', safety: '주의: 투자 조언이나 거래 지시가 아닙니다.', plainText: '일반 텍스트 요약', guide: '액션 상태 읽는 법', interest: '관심 단계', position: '보유 상태', basis: '내 기준가', currentPrice: '현재가', basisChange: '기준가 대비',
    dataLabels: { live: '실제 데이터', mock: '모의/데모 데이터', limited: '제한 데이터', unavailable: '데이터 이용 불가' },
    disclosure: '공시 점검: 최근 공시 근거가 있습니다. 원문 확인이 필요합니다.', disclosureNeeded: '공시 점검: 정정 또는 주요사항 관련 공시가 포함되어 있어 원문 확인이 필요합니다.',
    stages: { waiting: '대기 / 조건 확인 중', first: '1차 관심구간', second: '2차 관심구간', third: '3차 관심구간', chaseCaution: '추격 접근 주의', reboundCaution: '급락 반등 주의' },
    positions: { waiting: '대기 / 조건 확인 중', baselineValid: '기준 유지 점검', invalidationReview: '무효화 기준 점검', profitProtection: '수익 보호 검토' },
    guideItems: [['판단 보류', '데이터 신뢰도가 아직 충분하지 않습니다.'], ['대기 / 조건 확인 중', '추가 조건 확인이 필요합니다.'], ['관심 구간', '조건이 불완전한 동안 계속 살펴볼 상태입니다.'], ['조건부 접근 가능', '일부 조건은 있지만 추가 확인이 필요합니다.'], ['추격 접근 주의', '최근 움직임이 이미 큰 상태입니다.'], ['급락 반등 접근 주의', '급락 후 반등은 추가 근거가 필요합니다.']],
  },
} as const

function firstItem(items: readonly string[], fallback: string) {
  return items.find((item) => item.trim().length > 0) ?? fallback
}

function formatValue(value: number, language: Language) {
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value)
}

function disclosureLine(review: DartDisclosureReview | null, language: Language) {
  if (review?.status === 'review_needed') return copy[language].disclosureNeeded
  if (review?.status === 'review_available') return copy[language].disclosure
  return null
}

function buildMyAnalysisPlainTextSummary(analysis: MyAnalysisResult, symbol: string, language: Language, reviewMode: MyAnalysisReviewMode, basisPrice: number | null, currentPrice: number, quoteCurrency: string, disclosureReview: DartDisclosureReview | null) {
  const t = copy[language]
  const next = firstItem(analysis.reviewChecklist, analysis.actionReadiness.nextChecks[0])
  const disclosure = disclosureLine(disclosureReview, language)
  if (reviewMode === 'position' && basisPrice !== null && Number.isFinite(basisPrice) && basisPrice > 0) {
    const position = derivePositionReview(currentPrice, basisPrice, analysis.dataQuality)
    return [t.plainTitle, symbol, `${t.position}: ${t.positions[position.state]}`, `${t.basis}: ${formatValue(basisPrice, language)} ${quoteCurrency}`, `${t.currentPrice}: ${Number.isFinite(currentPrice) ? `${formatValue(currentPrice, language)} ${quoteCurrency}` : '—'}`, `${t.basisChange}: ${position.percentChange === null ? '—' : `${position.percentChange >= 0 ? '+' : ''}${formatValue(position.percentChange, language)}%`}`, `${t.next}: ${next}`, ...(disclosure ? [disclosure] : []), t.safety].join('\n')
  }

  const stage = deriveBeginnerInterestStage(analysis)

  return [
    t.plainTitle,
    symbol,
    `${t.interest}: ${t.stages[stage]}`,
    `${t.confidence}: ${t.dataLabels[analysis.dataQuality]}`,
    `${t.summary}: ${analysis.currentRead}`,
    `${t.next}: ${next}`,
    ...(disclosure ? [disclosure] : []),
    t.safety,
  ].join('\n')
}

export function MyAnalysisReportSummary({ analysis, language, mode, symbol, name, reviewMode = 'interest', basisPrice = null, currentPrice = Number.NaN, quoteCurrency = '', disclosureReview = null }: MyAnalysisReportSummaryProps) {
  const t = copy[language]
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'unavailable'>('idle')
  const plainText = useMemo(() => buildMyAnalysisPlainTextSummary(analysis, symbol, language, reviewMode, basisPrice, currentPrice, quoteCurrency, disclosureReview), [analysis, basisPrice, currentPrice, disclosureReview, language, quoteCurrency, reviewMode, symbol])
  const disclosure = disclosureLine(disclosureReview, language)
  const caution = firstItem(analysis.simpleModeSections.find((section) => section.id === 'simple-caution')?.items ?? [], analysis.actionReadiness.avoidConditions[0])
  const next = firstItem(analysis.reviewChecklist, analysis.actionReadiness.nextChecks[0])

  const copySummary = async () => {
    if (!navigator.clipboard?.writeText) {
      setCopyState('unavailable')
      return
    }
    try {
      await navigator.clipboard.writeText(plainText)
      setCopyState('copied')
    } catch {
      setCopyState('unavailable')
    }
  }

  return <section className={styles.report} data-mode={mode} data-status={analysis.actionReadiness.status} aria-label={t.eyebrow}>
    <header className={styles.header}>
      <div><span>{t.eyebrow}</span><h2>{t.title}</h2><p>{symbol} · {name}</p></div>
      <div className={styles.actions}>
        <small>{t.basedOn}</small>
        <button type="button" onClick={copySummary}>{t.copy}</button>
        <span role="status" aria-live="polite">{copyState === 'copied' ? t.copied : copyState === 'unavailable' ? t.unavailable : ''}</span>
      </div>
    </header>
    <div className={styles.state}>
      <div><small>{t.current}</small><strong>{analysis.actionReadiness.title}</strong><p>{analysis.currentRead}</p></div>
      <div className={styles.confidence} data-quality={analysis.dataQuality}><small>{t.confidence}</small><strong>{t.dataLabels[analysis.dataQuality]}</strong><span>{t.loaded}: {analysis.evidence.length} · {t.missing}: {analysis.missingEvidence.length}</span></div>
    </div>
    {disclosure && <p className={styles.disclosure}>{disclosure}</p>}
    <div className={styles.quickFacts}>
      <article><h3>{t.reason}</h3><p>{analysis.actionReadiness.whyThisStatus}</p></article>
      <article><h3>{t.caution}</h3><p>{caution}</p></article>
      <article><h3>{t.next}</h3><p>{next}</p></article>
    </div>
    <details className={styles.plainText}>
      <summary>{t.plainText}</summary>
      <textarea aria-label={t.plainText} readOnly value={plainText} />
      <small>{reviewMode === 'position' ? t.positionPrivacy : t.privacy}</small>
    </details>
    <details className={styles.guide}>
      <summary>{t.guide}</summary>
      <dl>{t.guideItems.map(([status, meaning]) => <div key={status}><dt>{status}</dt><dd>{meaning}</dd></div>)}</dl>
    </details>
  </section>
}
