import { fundingComparison } from '@/services/research/fundingComparison'
import type { ResearchSnapshot } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'
export function FundingComparison({ snapshot, now }: { snapshot: ResearchSnapshot | null; now: number }) {
  const rows = fundingComparison(snapshot, now)
  const fmt = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 5 })
  return <section className={styles.subpanel}><h3>공개 펀딩률 비교 · 정산 간격 반영</h3><p>같은 종목의 거래소별 비용만 비교합니다. 낮은 펀딩은 롱의 지급 비용이 적고, 높은 펀딩은 숏의 수취액이 큰 조건입니다. 거래 수수료·유동성·계정 조건은 별도로 확인하세요.</p>
    <div className={styles.tableWrap}><table><caption>수신·정산 시각을 확인한 자료만 표시</caption><thead><tr><th>거래소</th><th>회당 펀딩</th><th>간격</th><th>단순 연환산</th><th>정산 예정</th></tr></thead><tbody>{rows.map(r => <tr key={r.exchange}><th>{r.exchange} · {r.quote}</th><td>{fmt(r.rate * 100)}%</td><td>{r.hours}h</td><td>{fmt(r.annualPercent)}%</td><td>{r.nextAt ? new Date(r.nextAt).toLocaleString('ko-KR') : '미제공'}</td></tr>)}</tbody></table></div>
    {!rows.length && <p>비교할 수 있는 최신 펀딩률과 정산 간격이 없습니다.</p>}<small>연환산 = 회당 펀딩률 × (24 ÷ 정산 간격) × 365. 현재 요율이 1년간 유지되는 가정이며 수익률이 아닙니다. Hyperliquid는 USDC 계약이므로 USDT 계약과 기준통화 차이가 있습니다. 시간 간격이 불명확한 자료는 비교에서 제외합니다.</small>
  </section>
}
