import { Link } from 'react-router-dom'

import type { Language } from '@/i18n/translations'
import { scoreToAttentionBand } from '@/services/simple/simpleCandidateEngine'
import type { SimpleCandidate, SimplePlanningLevel } from '@/types/simpleMode'
import styles from './SimpleCandidateCard.module.css'

interface SimpleCandidateCardProps {
  candidate: SimpleCandidate
  language: Language
  onOpenMarket: (instrumentId: string) => void
}

const copy = {
  en: {
    asset: { crypto: 'Crypto', stock: 'Stock' }, quality: { live: 'Live', mock: 'Mock', limited: 'Limited', unavailable: 'Unavailable' }, attention: { high: 'High attention', medium: 'Medium attention', low: 'Low attention' },
    why: 'Why it appeared', check: 'What to check', caution: 'What to be careful about', planning: 'Price check range', details: 'View details', more: 'More details', market: 'Open Market', expert: 'Open Expert Mode', disabled: 'Stock price planning disabled', attentionHelp: 'Attention level is a simple sorting aid, not a probability.',
  },
  ko: {
    asset: { crypto: '가상자산', stock: '주식' }, quality: { live: '실시간', mock: '모의', limited: '제한', unavailable: '미지원' }, attention: { high: '관심도 높음', medium: '관심도 보통', low: '관심도 낮음' },
    why: '왜 보이나요?', check: '확인할 점', caution: '조심할 점', planning: '가격 체크 구간', details: '자세히 보기', more: '자세히 보기', market: '마켓에서 보기', expert: '전문가모드 열기', disabled: '주식 가격 계획 비활성화', attentionHelp: '관심도는 간단한 정렬 참고값이며 확률이 아닙니다.',
  },
} as const

function PercentageLevel({ level }: { level: SimplePlanningLevel }) {
  return <div className={styles.level}><dt>{level.label}</dt><dd>{level.value}</dd></div>
}

export function SimpleCandidateCard({ candidate, language, onOpenMarket }: SimpleCandidateCardProps) {
  const t = copy[language]
  const attention = scoreToAttentionBand(candidate.score)
  const planning = candidate.planningReference
  const levels = [planning.observationArea, planning.riskCheckArea, planning.upsideCheckArea].filter((level): level is SimplePlanningLevel => level !== null)
  return <article className={styles.card} aria-labelledby={`simple-candidate-${candidate.id}`}>
    <header className={styles.header}><div className={styles.identity}><h3 id={`simple-candidate-${candidate.id}`}>{candidate.symbol}</h3><p>{candidate.name} · {candidate.region}</p></div><div className={styles.badges}><span>{t.asset[candidate.assetType]}</span><span data-quality={candidate.dataQuality}>{t.quality[candidate.dataQuality]}</span><span data-attention={attention}>{t.attention[attention]}</span></div></header>
    <div className={styles.summary}><p><strong>{t.why}</strong>{candidate.simpleReason}</p><p><strong>{t.caution}</strong>{candidate.riskPoints[0]}</p></div>
    <div className={styles.actions}><Link to="/ai-analysis">{t.details}</Link><button type="button" onClick={() => onOpenMarket(candidate.instrumentId)}>{t.market}</button></div>
    <details className={styles.details}><summary>{t.more}</summary><div className={styles.detailBody}><section><h4>{t.why}</h4><p>{candidate.simpleReason}</p></section><section><h4>{t.check}</h4><ul>{candidate.goodPoints.map((point) => <li key={point}>{point}</li>)}</ul></section><section><h4>{t.caution}</h4><ul>{candidate.riskPoints.map((point) => <li key={point}>{point}</li>)}</ul></section><section className={styles.planning}><h4>{t.planning}</h4>{planning.available ? <><p className={styles.planningNote}>{planning.notes.join(' ')}</p><dl>{levels.map((level) => <PercentageLevel key={level.label} level={level} />)}</dl></> : <div className={styles.disabled}><strong>{t.disabled}</strong><p>{planning.reason}</p></div>}</section><Link className={styles.expertLink} to="/ai-analysis">{t.expert} →</Link><small>{t.attentionHelp}</small></div></details>
  </article>
}
