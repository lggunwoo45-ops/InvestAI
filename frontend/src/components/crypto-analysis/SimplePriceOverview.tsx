import type { CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import type { Language } from '@/i18n/translations'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './SimplePriceOverview.module.css'

/** Uses the same validated, closed-bar evidence as the analysis; never a sample chart. */
export function SimplePriceOverview({ decision, instrument, language }: { decision: CryptoDecision; instrument: MarketInstrument; language: Language }) {
  const frame = decision.frames.find(row => row.frame === '4H' && !row.issue) ?? decision.frames.find(row => !row.issue)
  const values = frame?.candles.slice(-45) ?? []
  if (decision.direction === 'unavailable' || values.length < 2 || decision.price === null) return null
  const low = Math.min(...values.map(v => v.close)), high = Math.max(...values.map(v => v.close)), span = high - low || 1
  const points = values.map((v, i) => `${i / (values.length - 1) * 600},${150 - (v.close - low) / span * 130}`).join(' ')
  const ko = language === 'ko'
  return <figure className={styles.overview}>
    <figcaption><span>{instrument.marketId} · {instrument.symbol}</span><strong>{formatAnalysisPrice(decision.price, language)} <small>{instrument.quoteCurrency}</small></strong><span>{ko ? '최근 완료 봉의 흐름' : 'Recent closed-bar trend'} · {frame!.frame}</span></figcaption>
    <svg viewBox="0 0 600 180" role="img" aria-label={ko ? '분석에 사용한 실제 완료 봉 종가 차트' : 'Validated closed-bar price chart'}><path className={styles.grid} d="M0 20H600 M0 85H600 M0 150H600"/><polyline points={points}/></svg>
    <div className={styles.scale}><span>{new Date(values[0].timestamp).toLocaleDateString(language)}</span><span>{new Date(values.at(-1)!.timestamp).toLocaleDateString(language)}</span></div>
    <p>{ko ? '가격 흐름을 간단히 보여줍니다. 캔들·거래량·보조선 설정은 마켓에서 확인하세요.' : 'A quick price overview. Open Market for candles, volume and overlay settings.'}</p>
  </figure>
}
