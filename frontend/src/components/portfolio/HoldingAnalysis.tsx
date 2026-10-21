import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import { decisionGuide, easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import { currentHoldingResult, type HoldingReview } from '@/services/portfolio/holdingAnalysis'
import type { Position } from '@/services/portfolio/portfolioStorage'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './HoldingAnalysis.module.css'

export function HoldingAnalysis({ position, review, now, running, language }: { position: Position; review?: HoldingReview; now: number; running: boolean; language: Language }) {
  const ko = language === 'ko'
  const result = currentHoldingResult(review, now)
  const guide = result ? decisionGuide(result.decision, language, true) : null
  const stale = review?.result && (now > review.result.expiresAt || now < review.result.analyzedAt)
  const issues = ko ? { catalog: '시세 목록을 가져오지 못했어요.', missing: '이 거래소·마켓에서 저장한 종목을 찾지 못했어요.', analysis: '가격 기록을 가져오지 못했어요.' }
    : { catalog: 'Could not load quotes.', missing: 'The saved asset was not found in this venue.', analysis: 'Could not load price history.' }
  const issue = review?.issue ? issues[review.issue] : ko ? '분석에 필요한 가격 기록이 부족해요.' : 'There is not enough verified price history.'
  return <section className={styles.review} aria-label={ko ? '보유 분석' : 'Holding analysis'}>
    {result && guide ? <>
      <span className={styles.bias} data-direction={result.decision.direction}>{easyDirection[language][result.decision.direction]}</span>
      <h3>{guide.title}</h3><p>{guide.reason}</p>
      {result.decision.plan && <p className={styles.price}><span>{ko ? '더 내려가면 주의할 가격' : 'Price to watch on a further drop'}</span><strong>{formatAnalysisPrice(result.decision.plan.stop, language)} {position.quoteCurrency}</strong><small>{ko ? `${result.decision.plan.frame === '1D' ? '하루' : result.decision.plan.frame === '4H' ? '4시간' : '1시간'} 마감 가격이 이 아래면 보유 위험을 다시 확인해요.` : `Reassess holding risk if a ${result.decision.plan.frame} candle closes below this level.`}</small></p>}
      <small>{new Date(result.analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} · {ko ? `${result.decision.coverage}/3개 시간 흐름 확인` : `${result.decision.coverage}/3 timeframes checked`}</small>
    </> : <p className={styles.pending}>{stale ? (ko ? '분석 시세가 오래됐어요. 다시 분석해주세요.' : 'Analysis quotes have expired. Analyze again.') : review ? issue : running ? (ko ? '이 코인의 분석을 기다리고 있어요…' : 'Waiting for this holding…') : (ko ? '‘보유 코인 전체 분석’을 누르면 지금 확인할 내용을 알려드려요.' : 'Analyze all holdings to see what to check now.')}{review && !stale && <small>{ko ? '자료 확인이 필요한 상태이며, 매수·매도 판단이 아니에요.' : 'This is a data issue, not a trading signal.'}</small>}</p>}
    <Link to={`/my-analysis?${new URLSearchParams({ instrumentId: position.instrumentId, positionId: position.id })}`}>{ko ? '이 코인 자세히 분석' : 'Analyze this holding'} →</Link>
  </section>
}
