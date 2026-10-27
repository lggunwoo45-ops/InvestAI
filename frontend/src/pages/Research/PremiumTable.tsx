import { array, kimchiPremium, numeric, object, providerNow, researchAssets, sourceData, type ResearchSnapshot } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'
import { ResearchHelp } from './ResearchHelp'
export function PremiumTable({ snapshot, now }: { snapshot: ResearchSnapshot | null; now: number }) {
  const korea = array(sourceData(snapshot, 'koreaAll', now)).map(object), overseas = array(sourceData(snapshot, 'spotAll', now)).map(object)
  const stable = korea.find(r => r.market === 'KRW-USDT'), fx = numeric(stable?.trade_price)
  const localTime = (value: unknown, key: string) => numeric(value) === null ? null : Number(value) + now - providerNow(snapshot, key, now)
  const fxAt = localTime(stable?.timestamp, 'koreaAll')
  const rows = researchAssets.flatMap(asset => {
    const local = korea.find(r => r.market === `KRW-${asset}`), spot = overseas.find(r => r.symbol === `${asset}USDT`)
    const localAt = localTime(local?.timestamp, 'koreaAll'), spotAt = localTime(spot?.closeTime, 'spotAll'), localPrice = numeric(local?.trade_price), spotPrice = numeric(spot?.lastPrice)
    if (!fx || !localPrice || !spotPrice || ![fxAt, localAt, spotAt].every(at => at !== null && Math.abs(now - at) <= 120_000) || Math.max(fxAt!, localAt!, spotAt!) - Math.min(fxAt!, localAt!, spotAt!) > 60_000) return []
    const premium = kimchiPremium(localPrice, spotPrice, fx)
    return premium === null ? [] : [{ asset, localPrice, spotPrice, premium, volume: numeric(local?.acc_trade_price_24h) ?? 0 }]
  }).sort((a, b) => b.volume - a.volume)
  const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 4 })
  return <section className={styles.subpanel}><h3>코인별 국내외 가격 차이</h3><p>Upbit 원화 거래대금 순입니다. Binance 현물과 USDT 원화 기준으로 비교하며, 입출금 가능 여부와 전송 비용을 확인하지 않은 가격 차이입니다.</p>
    <ResearchHelp topic="premium" /><p>{researchAssets.length}개 검토 종목 중 {rows.length}개 비교 가능 · 국내·해외·USDT 환산 시세가 각각 2분 이내이고 서로 1분 이내인 종목만 포함합니다.</p>
    <div className={styles.tableWrap}><table><caption>같은 시점의 시세가 확보된 종목만 표시</caption><thead><tr><th>코인</th><th>국내 KRW</th><th>해외 USDT</th><th>환산 가격 차이</th></tr></thead><tbody>{rows.map(r => <tr key={r.asset}><th>{r.asset}</th><td>{fmt(r.localPrice)}</td><td>{fmt(r.spotPrice)}</td><td>{fmt(r.premium)}%</td></tr>)}</tbody></table></div>{!rows.length && <p>동시점 국내외 시세가 부족합니다. 위 계산기에 직접 입력할 수 있습니다.</p>}
    {rows.length < researchAssets.length && <details><summary>비교하지 못한 종목 확인</summary><p>{researchAssets.filter(asset => !rows.some(row => row.asset === asset)).join(' · ')}</p><p>거래소 미상장, 필요한 가격 누락 또는 위 시각 조건 미충족으로 제외했습니다. 제외는 가격 차이가 0이라는 의미가 아닙니다. 확보한 가격은 위 계산기에 직접 입력할 수 있습니다.</p></details>}
  </section>
}
