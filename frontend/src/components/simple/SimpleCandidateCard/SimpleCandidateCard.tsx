import { Link } from 'react-router-dom'

import type { Language } from '@/i18n/translations'
import type { CandidateReviewStatus } from '@/types/candidateFeedback'
import type { SimpleCandidate, SimplePlanningLevel } from '@/types/simpleMode'
import styles from './SimpleCandidateCard.module.css'

interface SimpleCandidateCardProps {
  candidate: SimpleCandidate
  rank: number
  language: Language
  reviewStatus: CandidateReviewStatus
  onOpenMarket: (instrumentId: string) => void
  onSetStatus: (instrumentId: string, status: CandidateReviewStatus) => void
}

const copy = {
  en: { asset: { crypto: 'Crypto', stock: 'Stock' }, horizons: { short: 'Short', swing: 'Swing', long: 'Long' }, quality: { live: 'Live', mock: 'Mock', limited: 'Limited', unavailable: 'Unavailable' }, score: 'Watch Score', why: 'Why watch', good: 'Good points', risk: 'Risk points', planning: 'Planning reference', details: 'View details', market: 'Open Market', save: 'Save as Watching', dismiss: 'Dismiss', saved: 'Watching', dismissed: 'Dismissed', advice: 'Not investment advice · User makes final decision', disabled: 'Stock price planning disabled' },
  ko: { asset: { crypto: '가상자산', stock: '주식' }, horizons: { short: '단기', swing: '스윙', long: '장기' }, quality: { live: '실시간', mock: '모의', limited: '제한', unavailable: '미지원' }, score: '관찰 점수', why: '보는 이유', good: '좋은 점', risk: '위험 요소', planning: '계획 참고', details: '자세히 보기', market: '마켓에서 보기', save: '관찰 중으로 저장', dismiss: '제외', saved: '관찰 중', dismissed: '제외됨', advice: '투자 조언 아님 · 최종 판단은 사용자가 직접 합니다', disabled: '주식 가격 계획 비활성화' },
} as const

function PlanningLevel({ level }: { level: SimplePlanningLevel }) {
  return <div className={styles.level}><dt>{level.label}</dt><dd><strong>{level.value}</strong><small>{level.note}</small></dd></div>
}

export function SimpleCandidateCard({ candidate, rank, language, reviewStatus, onOpenMarket, onSetStatus }: SimpleCandidateCardProps) {
  const t = copy[language]
  const planning = candidate.planningReference
  const levels = [planning.firstObservationPrice, planning.secondObservationPrice, planning.thirdObservationPrice, planning.riskReferencePrice, planning.profitTakingReferenceRange].filter((level): level is SimplePlanningLevel => level !== null)
  return <article className={styles.card} aria-labelledby={`simple-candidate-${candidate.id}`} data-review-status={reviewStatus}>
    <header className={styles.header}><span className={styles.rank}>#{rank}</span><div className={styles.identity}><h2 id={`simple-candidate-${candidate.id}`}>{candidate.symbol}</h2><p>{candidate.name} · {candidate.region}</p></div><div className={styles.score}><span>{t.score}</span><strong>{candidate.score}</strong><small>{language === 'ko' ? '확률 아님' : 'Not probability'}</small></div></header>
    <div className={styles.badges}><span>{t.asset[candidate.assetType]}</span><span>{t.horizons[candidate.horizon]}</span><span data-quality={candidate.dataQuality}>{t.quality[candidate.dataQuality]}</span>{reviewStatus === 'watching' && <span>{t.saved}</span>}{reviewStatus === 'dismissed' && <span>{t.dismissed}</span>}</div>
    <p className={styles.quality}>{candidate.dataQualityNote}</p>
    <section className={styles.reason}><h3>{t.why}</h3><p>{candidate.simpleReason}</p></section>
    <div className={styles.points}><section><h3>{t.good}</h3><ul>{candidate.goodPoints.map((point) => <li key={point}>{point}</li>)}</ul></section><section><h3>{t.risk}</h3><ul>{candidate.riskPoints.map((point) => <li key={point}>{point}</li>)}</ul></section></div>
    <section className={styles.planning}><header><h3>{t.planning}</h3><span>{language === 'ko' ? '계획 참고용' : 'Planning reference only'}</span></header>{planning.available ? <><dl>{levels.map((level) => <PlanningLevel key={level.label} level={level} />)}</dl><p>{planning.notes.join(' ')}</p></> : <div className={styles.disabled}><strong>{t.disabled}</strong><p>{planning.reason}</p></div>}</section>
    <footer><span>{t.advice}</span><div><Link to="/ai-analysis">{t.details}</Link><button type="button" onClick={() => onOpenMarket(candidate.instrumentId)}>{t.market}</button><button type="button" aria-pressed={reviewStatus === 'watching'} onClick={() => onSetStatus(candidate.instrumentId, 'watching')}>{t.save}</button><button type="button" aria-pressed={reviewStatus === 'dismissed'} onClick={() => onSetStatus(candidate.instrumentId, 'dismissed')}>{t.dismiss}</button></div></footer>
  </article>
}
