import { PracticalDecisionCard } from '@/components/practicalDecision/PracticalDecisionCard/PracticalDecisionCard'
import { ReviewRangePanel } from '@/components/practicalDecision/ReviewRangePanel/ReviewRangePanel'
import { ChartOverlayLegend } from '@/components/technicalLevels/ChartOverlayLegend/ChartOverlayLegend'
import { TechnicalLevelsPanel } from '@/components/technicalLevels/TechnicalLevelsPanel/TechnicalLevelsPanel'
import type { Language } from '@/i18n/translations'
import type { TechnicalLevelAnalysis } from '@/types/technicalLevels'
import type { CandidateTerminalItem } from './candidateTerminalModel'
import styles from './CandidateInspectorPanel.module.css'

interface CandidateInspectorPanelProps {
  candidate: CandidateTerminalItem | null
  snapshotId: string | null
  generatedAt: string | null
  language: Language
  technicalAnalysis?: TechnicalLevelAnalysis | null
  technicalLoading?: boolean
  onOpenAnalysis: (instrumentId: string, snapshotId: string) => void
}

const copy = {
  en: {
    title: 'Selected candidate inspector', empty: 'Select an interest candidate to review its saved basis and current context.', rank: 'Snapshot order', basis: 'Basis price', current: 'Current price', change: 'Change since basis', score: 'Review score', freshness: 'Snapshot status', evidence: 'Evidence', ruleBasis: 'Saved rule basis', news: 'News state', disclosure: 'Disclosure evidence', disclosureNone: 'Not connected in this snapshot', caution: 'Review cautions', noCaution: 'No additional cautions are recorded.', changes: 'Evidence-state changes', noChanges: 'No material evidence-state changes.', open: 'Open in My Analysis', safety: 'Decision-support information, not a trade instruction or profit guarantee. Review score is not return probability. Review ranges are reference areas, not order prices.', recorded: 'Recorded', freshnessLabels: { basisHeld: 'Baseline held', changeReview: 'Change check needed', expired: 'Snapshot expired', priceUnavailable: 'Current price unavailable', reviewBasisUnavailable: 'Current review basis unavailable' }, fields: { ruleBasis: 'Rule basis', interestStage: 'Interest stage', actionStatus: 'Action status', dataQuality: 'Data quality' },
  },
  ko: {
    title: '선택 후보 상세', empty: '관심 후보를 선택하면 저장된 기준과 현재 맥락을 확인할 수 있습니다.', rank: '기준 기록 순서', basis: '기준가', current: '현재가', change: '기준 이후 변화', score: '검토 점수', freshness: '기준 기록 상태', evidence: '근거', ruleBasis: '저장된 규칙 근거', news: '뉴스 상태', disclosure: '공시 근거', disclosureNone: '이 기준 기록에는 연결되지 않음', caution: '검토 주의', noCaution: '추가로 기록된 주의 사항이 없습니다.', changes: '근거 상태 변화', noChanges: '근거 상태의 중요한 변화가 없습니다.', open: '내 종목 분석에서 열기', safety: '판단 보조 정보이며, 거래 지시나 수익 보장이 아닙니다. 검토 점수는 수익 확률이 아니며, 검토 범위는 주문가가 아닌 참고 영역입니다.', recorded: '기록 시점', freshnessLabels: { basisHeld: '기준 유지', changeReview: '변화 확인 필요', expired: '기준 시점이 오래됨', priceUnavailable: '현재 가격 확인 불가', reviewBasisUnavailable: '현재 판단 근거 확인 불가' }, fields: { ruleBasis: '규칙 근거', interestStage: '관심 단계', actionStatus: '액션 상태', dataQuality: '데이터 품질' },
  },
} as const

function number(value: number | null, language: Language) {
  if (value === null || !Number.isFinite(value)) return '—'
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 4 }).format(value)
}

function time(value: string | null, language: Language) {
  if (!value) return '—'
  return new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function newsStateLabel(value: string, language: Language) {
  const normalized = value.trim().toLocaleLowerCase()
  const labels = language === 'ko'
    ? { unavailable: '사용 불가', 'not available': '사용 불가', mock: '모의 뉴스', 'rss-ready': '실제 RSS 연결', 'rss-unavailable': 'RSS 사용 불가', 'local-proxy-ready': '로컬 프록시 연결', 'local-proxy-unavailable': '로컬 프록시 사용 불가', 'provider-not-configured': '제공자 미설정' }
    : { unavailable: 'Unavailable', 'not available': 'Unavailable', mock: 'Mock news', 'rss-ready': 'Real RSS connected', 'rss-unavailable': 'RSS unavailable', 'local-proxy-ready': 'Local proxy connected', 'local-proxy-unavailable': 'Local proxy unavailable', 'provider-not-configured': 'Provider not configured' }
  return labels[normalized as keyof typeof labels] ?? value
}

export function CandidateInspectorPanel({ candidate, snapshotId, generatedAt, language, technicalAnalysis = null, technicalLoading = false, onOpenAnalysis }: CandidateInspectorPanelProps) {
  const t = copy[language]
  if (!candidate) return <aside className={styles.inspector} aria-label={t.title} data-empty="true"><header><span>INSPECTOR</span><h2>{t.title}</h2></header><p className={styles.empty}>{t.empty}</p></aside>

  const { item } = candidate
  const cautions = [candidate.practicalDecision.caution, ...candidate.reviewScore.cautions].filter((value, index, values) => value && values.indexOf(value) === index)
  return <aside className={styles.inspector} aria-label={t.title} data-freshness={candidate.freshness}>
    <header><div><span>INSPECTOR · RECORD {item.order}</span><h2 aria-live="polite">{item.symbol}</h2><p>{item.displayName} · {item.marketId}</p></div><strong>{candidate.reviewScore.label}</strong></header>
    <dl className={styles.metrics}>
      <div><dt>{t.rank}</dt><dd>{item.order} / 5</dd></div>
      <div><dt>{t.basis}</dt><dd>{number(item.basisPrice, language)} {item.quoteCurrency}</dd></div>
      <div><dt>{t.current}</dt><dd>{number(candidate.currentPrice, language)} {candidate.currentPrice === null ? '' : item.quoteCurrency}</dd></div>
      <div><dt>{t.change}</dt><dd>{candidate.changeSinceBasis === null ? '—' : `${candidate.changeSinceBasis >= 0 ? '+' : ''}${number(candidate.changeSinceBasis, language)} ${item.quoteCurrency}`}</dd></div>
      <div><dt>{t.score}</dt><dd>{candidate.reviewScore.score === null ? '—' : `${candidate.reviewScore.score}/100`}</dd></div>
      <div><dt>{t.freshness}</dt><dd>{t.freshnessLabels[candidate.freshness]}</dd></div>
    </dl>
    <PracticalDecisionCard result={candidate.practicalDecision} language={language} compact showSafety={false} />
    <ReviewRangePanel ranges={candidate.reviewRanges} language={language} quoteCurrency={item.quoteCurrency} compact showSafety={false} />
    {technicalAnalysis && <>
      <TechnicalLevelsPanel levelSet={technicalAnalysis.levelSet} movingAverageContext={technicalAnalysis.movingAverageContext} displayMode="simple" language={language} isLoading={technicalLoading} />
      <ChartOverlayLegend status={technicalAnalysis.levelSet.status} lines={technicalAnalysis.overlayLines} displayMode="simple" language={language} isLoading={technicalLoading} />
    </>}
    <section className={styles.evidence} aria-label={t.evidence}><header><span>{t.evidence}</span><strong>{t.ruleBasis}</strong></header><dl>{item.ruleBasis.map((entry) => <div key={entry.key}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl><p>{t.news}: {newsStateLabel(item.newsState, language)}</p><p>{t.disclosure}: {item.disclosureCount > 0 ? item.disclosureCount : t.disclosureNone}</p></section>
    <section className={styles.changes} aria-label={t.changes}><strong>{t.changes}</strong>{candidate.freshnessChanges.length > 0 ? <ul>{candidate.freshnessChanges.map((change) => <li key={change.field}>{t.fields[change.field]}: {change.previousValue} → {change.currentValue}</li>)}</ul> : <p>{t.noChanges}</p>}</section>
    <section className={styles.cautions} aria-label={t.caution}><strong>{t.caution}</strong>{cautions.length > 0 ? <ul>{cautions.map((caution) => <li key={caution}>{caution}</li>)}</ul> : <p>{t.noCaution}</p>}</section>
    <footer><small>{t.recorded}: {time(generatedAt, language)} · {t.safety}</small><button type="button" disabled={!snapshotId} onClick={() => snapshotId && onOpenAnalysis(item.instrumentId, snapshotId)}>{t.open} →</button></footer>
  </aside>
}
