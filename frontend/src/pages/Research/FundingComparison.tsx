import { ResearchHelp } from './ResearchHelp'
import { SourceIssue } from './ResearchDataStatus'
import { fundingComparison } from '@/services/research/fundingComparison'
import type { ResearchSnapshot } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'
export function FundingComparison({ snapshot, now }: { snapshot: ResearchSnapshot | null; now: number }) {
  const rows = fundingComparison(snapshot, now)
  const excluded = [['Binance', 'mark'], ['Bybit', 'bybit'], ['OKX', 'okx'], ['Bitget', 'bitget'], ['Hyperliquid', 'hyperliquid']].filter(([exchange]) => !rows.some(row => row.exchange === exchange))
  const fmt = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 5 })
  return <section className={styles.subpanel}><h3>공개 펀딩률 비교 · 정산 간격 반영</h3><p>같은 종목의 거래소별 비용만 비교합니다. 낮은 펀딩은 롱의 지급 비용이 적고, 높은 펀딩은 숏의 수취액이 큰 조건입니다. 거래 수수료·유동성·계정 조건은 별도로 확인하세요.</p>
    <ResearchHelp topic="costs" />
    <div className={styles.tableWrap}><table><caption>수신·정산 시각을 확인한 자료만 표시</caption><thead><tr><th>거래소</th><th>회당 펀딩</th><th>간격</th><th>단순 연환산</th><th>정산 예정</th></tr></thead><tbody>{rows.map(r => <tr key={r.exchange}><th>{r.exchange} · {r.quote}</th><td>{fmt(r.rate * 100)}%</td><td>{r.hours}h</td><td>{fmt(r.annualPercent)}%</td><td>{r.nextAt ? new Date(r.nextAt).toLocaleString('ko-KR') : '미제공'}</td></tr>)}</tbody></table></div>
    {!rows.length && <p>비교할 수 있는 최신 펀딩률과 정산 간격이 없습니다.</p>}{!!excluded.length && <details><summary>비교에서 빠진 거래소 {excluded.length}곳 · 이유 확인</summary>{excluded.map(([exchange, key]) => <div key={key}><h4>{exchange}</h4><SourceIssue snapshot={snapshot} sourceKey={key} now={now} fallback="이 종목의 펀딩률·정산 간격·자료 시각을 모두 확인하지 못했습니다. 이 거래소의 해당 계약 지원 여부와 정산 정보를 확인하세요. 요율을 아는 경우 위 계산기에 직접 입력할 수 있습니다." /></div>)}</details>}<small>연환산 = 회당 펀딩률 × (24 ÷ 정산 간격) × 365. 현재 요율이 1년간 유지되는 가정이며 수익률이 아닙니다. Hyperliquid는 USDC 계약이므로 USDT 계약과 기준통화 차이가 있습니다. 시간 간격이 불명확한 자료는 비교에서 제외합니다.</small>
  </section>
}
