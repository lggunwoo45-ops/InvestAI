import { array, numeric, object, sourceData, type ResearchSnapshot } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'
export function MarketStructure({ snapshot, now }: { snapshot: ResearchSnapshot | null; now: number }) {
  const rows = array(sourceData(snapshot, 'interestHistory', now)).map(object)
  const latest = rows.at(-1), prior = rows.length >= 25 ? rows.at(-25) : null
  const lastInterest = numeric(latest?.sumOpenInterest), oldInterest = numeric(prior?.sumOpenInterest)
  const spot = numeric(object(sourceData(snapshot, 'spot', now)).quoteVolume), futures = numeric(object(sourceData(snapshot, 'futures', now)).quoteVolume)
  const fmt = (n: number | null) => n === null ? '확인 불가' : n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
  const exactlyOneDay = numeric(latest?.timestamp) !== null && numeric(prior?.timestamp) !== null && Number(latest?.timestamp) - Number(prior?.timestamp) === 86_400_000
  const delta = exactlyOneDay && lastInterest !== null && oldInterest !== null && oldInterest > 0 ? (lastInterest / oldInterest - 1) * 100 : null
  return (<section className={styles.subpanel}><h3>미결제약정 변화·현물과 선물 거래대금</h3><div className={styles.metrics}>
    <article className={styles.metric}><span>시간별 미결제약정 · 최근 집계</span><strong>{fmt(lastInterest)}</strong><small>기초자산 수량 · {numeric(latest?.timestamp) ? new Date(Number(latest?.timestamp)).toLocaleString('ko-KR') : '시각 미확인'}</small></article>
    <article className={styles.metric}><span>24시간 전 집계 대비</span><strong>{delta === null ? '확인 불가' : `${fmt(delta)}%`}</strong><small>계약 규모 변화이며 방향 신호가 아닙니다.</small></article>
    <article className={styles.metric}><span>현물 24시간 거래대금</span><strong>{fmt(spot)} USDT</strong><small>Binance 현물 · 해당 종목</small></article>
    <article className={styles.metric}><span>선물 24시간 거래대금</span><strong>{fmt(futures)} USDT</strong><small>Binance USDT 선물 · 해당 종목</small></article>
  </div><div className={styles.tableWrap}><table><caption>미결제약정 최근 6개 시간 집계</caption><thead><tr><th>관측 시각</th><th>기초자산 수량</th><th>명목가치 (USDT)</th></tr></thead><tbody>{rows.slice(-6).reverse().map((r, i) => <tr key={i}><td>{numeric(r.timestamp) ? new Date(Number(r.timestamp)).toLocaleString('ko-KR') : '시각 미확인'}</td><td>{fmt(numeric(r.sumOpenInterest))}</td><td>{fmt(numeric(r.sumOpenInterestValue))}</td></tr>)}</tbody></table></div><small>두 시장의 거래대금은 동일한 자금의 순유입이나 현물 실수요를 뜻하지 않습니다.</small></section>
  )
}
