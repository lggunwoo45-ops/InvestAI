import { useMemo, useState } from 'react'

import type { Language } from '@/i18n/translations'
import type { MyAnalysisResult } from '@/types/myAnalysis'
import styles from './MyAnalysisReportSummary.module.css'

interface MyAnalysisReportSummaryProps {
  analysis: MyAnalysisResult
  language: Language
  mode: 'simple' | 'expert'
  symbol: string
  name: string
}

const copy = {
  en: {
    eyebrow: 'Review summary', title: 'Report summary', current: 'Current state', reason: 'Key reason', caution: 'Main caution', next: 'Next check', confidence: 'Data confidence', loaded: 'Loaded evidence', missing: 'Missing evidence', basedOn: 'Based on currently loaded data', copy: 'Copy summary', copied: 'Summary copied', unavailable: 'Copy unavailable', privacy: 'This summary excludes personal notes and average price', plainTitle: 'Market Copilot review summary', summary: 'Summary', safety: 'Caution: This is not investment advice or a trade instruction.', plainText: 'Plain-text summary', guide: 'How to read action status',
    dataLabels: { live: 'Live data', mock: 'Mock/demo data', limited: 'Limited data', unavailable: 'Data unavailable' },
    guideItems: [['Decision pending', 'Data is not reliable enough yet.'], ['Waiting / checking conditions', 'More conditions need confirmation.'], ['Watch zone', 'Worth monitoring while conditions remain incomplete.'], ['Conditional approach possible', 'Some conditions exist, but confirmation is still needed.'], ['Chase caution', 'Recent movement is already large.'], ['Sharp-drop rebound caution', 'A rebound after a sharp drop needs more evidence.']],
  },
  ko: {
    eyebrow: '분석 요약', title: '리포트 요약', current: '현재 상태', reason: '핵심 이유', caution: '주요 주의점', next: '다음 확인', confidence: '데이터 신뢰 상태', loaded: '불러온 근거', missing: '부족한 근거', basedOn: '현재 불러온 데이터를 기준으로 표시', copy: '요약 복사', copied: '요약을 복사했습니다', unavailable: '복사 기능을 사용할 수 없습니다', privacy: '이 요약에는 개인 메모와 평균 가격이 포함되지 않습니다', plainTitle: 'Market Copilot 분석 요약', summary: '요약', safety: '주의: 투자 조언이나 거래 지시가 아닙니다.', plainText: '일반 텍스트 요약', guide: '액션 상태 읽는 법',
    dataLabels: { live: '실제 데이터', mock: '모의/데모 데이터', limited: '제한 데이터', unavailable: '데이터 이용 불가' },
    guideItems: [['판단 보류', '데이터 신뢰도가 아직 충분하지 않습니다.'], ['대기 / 조건 확인 중', '추가 조건 확인이 필요합니다.'], ['관심 구간', '조건이 불완전한 동안 계속 살펴볼 상태입니다.'], ['조건부 접근 가능', '일부 조건은 있지만 추가 확인이 필요합니다.'], ['추격 접근 주의', '최근 움직임이 이미 큰 상태입니다.'], ['급락 반등 접근 주의', '급락 후 반등은 추가 근거가 필요합니다.']],
  },
} as const

function firstItem(items: readonly string[], fallback: string) {
  return items.find((item) => item.trim().length > 0) ?? fallback
}

function buildMyAnalysisPlainTextSummary(analysis: MyAnalysisResult, symbol: string, language: Language) {
  const t = copy[language]
  const next = firstItem(analysis.reviewChecklist, analysis.actionReadiness.nextChecks[0])
  const caution = firstItem(analysis.simpleModeSections.find((section) => section.id === 'simple-caution')?.items ?? [], analysis.actionReadiness.avoidConditions[0])

  return [
    t.plainTitle,
    symbol,
    `${t.current}: ${analysis.actionReadiness.title}`,
    `${t.confidence}: ${t.dataLabels[analysis.dataQuality]}`,
    `${t.summary}: ${analysis.currentRead}`,
    `${t.next}: ${next}`,
    `${t.caution}: ${caution}`,
    t.safety,
  ].join('\n')
}

export function MyAnalysisReportSummary({ analysis, language, mode, symbol, name }: MyAnalysisReportSummaryProps) {
  const t = copy[language]
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'unavailable'>('idle')
  const plainText = useMemo(() => buildMyAnalysisPlainTextSummary(analysis, symbol, language), [analysis, language, symbol])
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
    <div className={styles.quickFacts}>
      <article><h3>{t.reason}</h3><p>{analysis.actionReadiness.whyThisStatus}</p></article>
      <article><h3>{t.caution}</h3><p>{caution}</p></article>
      <article><h3>{t.next}</h3><p>{next}</p></article>
    </div>
    <details className={styles.plainText}>
      <summary>{t.plainText}</summary>
      <textarea aria-label={t.plainText} readOnly value={plainText} />
      <small>{t.privacy}</small>
    </details>
    <details className={styles.guide}>
      <summary>{t.guide}</summary>
      <dl>{t.guideItems.map(([status, meaning]) => <div key={status}><dt>{status}</dt><dd>{meaning}</dd></div>)}</dl>
    </details>
  </section>
}
