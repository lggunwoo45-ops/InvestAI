import type { Language } from '@/i18n/translations'
import { selectEvidenceCandidates, type EvidenceCandidateRecommendation } from '@/services/recommendation/evidenceCandidateRecommendation'
import styles from './EvidenceRecommendation.module.css'

export function EvidenceFactors({ item, language }: { item: EvidenceCandidateRecommendation; language: Language }) {
  const names = language === 'ko' ? { trend: '추세', momentum: '모멘텀', volume: '거래량', structure: '지지/저항', btc: 'BTC 기준', market: '시장 주의', quality: '데이터 품질', score: '검토 점수' } : { trend: 'Trend', momentum: 'Momentum', volume: 'Volume', structure: 'Support / resistance', btc: 'BTC anchor', market: 'Market caution', quality: 'Data quality', score: 'Review score' }
  return <ul className={styles.factors} aria-label={language === 'ko' ? '판단 근거' : 'Evidence factors'}>{item.evidenceFactors.map((factor) => <li key={factor.key} data-status={factor.status}>{names[factor.key]}: {factor.value} · {factor.statusLabel}</li>)}</ul>
}

export function EvidenceRecommendation({ item, language }: { item: EvidenceCandidateRecommendation; language: Language }) {
  return <article aria-label={`${item.symbol} ${language === 'ko' ? '근거 기반 판단' : 'Evidence review'}`}>
    <strong>{item.symbol} · {item.title}</strong>{item.reviewScore !== undefined && <span> · {item.reviewScore}/100</span>}
    <p>{item.summary}</p><p>{language === 'ko' ? '다음 확인' : 'Next check'}: {item.nextCheck}</p>
    <details><summary>{language === 'ko' ? '근거 보기' : 'Show evidence'}</summary><EvidenceFactors item={item} language={language} /></details>
  </article>
}

export function EvidenceCandidatePanel({ items, language, onSelect }: { items: readonly EvidenceCandidateRecommendation[]; language: Language; onSelect: (id: string) => void }) {
  const { recommended, secondary } = selectEvidenceCandidates(items)
  return <section className={styles.panel} aria-label={language === 'ko' ? 'AI 추천 후보' : 'AI candidates'}>
    <h2>{language === 'ko' ? 'AI 추천 후보' : 'AI candidates'}</h2>
    {recommended.length === 0 && <p>{language === 'ko' ? '현재 기준을 충족하는 후보가 없습니다.' : 'No candidates meet the current evidence criteria.'}</p>}
    {recommended.map((item) => <div key={item.instrumentId}><button type="button" aria-label={`${language === 'ko' ? '근거 후보 선택' : 'Select evidence candidate'} ${item.symbol}`} onClick={() => onSelect(item.instrumentId)}>{item.displayName}</button><EvidenceRecommendation item={item} language={language} /></div>)}
    {secondary.length > 0 && <details><summary>{language === 'ko' ? '보류·제외 근거' : 'Held / excluded evidence'} ({secondary.length})</summary>{secondary.map((item) => <EvidenceRecommendation key={item.instrumentId} item={item} language={language} />)}</details>}
    <small>{language === 'ko' ? '판단 보조 정보이며 거래 지시가 아닙니다.' : 'Decision-support information, not a trade instruction.'}</small>
  </section>
}
