import { SimpleWorkspace, SimpleTasks } from '@/components/simple/SimpleWorkspace'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { calculatePurchasePlan } from '@/services/cryptoAnalysis/strategyLab'
import styles from '@/pages/Settings/SettingsPage.module.css'
export function TradingPage() {
  const { language } = useLanguage(), ko = language === 'ko'
  const simple = useDisplayMode().displayMode === 'simple'
  const [values, setValues] = useState({ entry: '', quantity: '', stop: '', target: '', feePercent: '0.05' })
  const [currency, setCurrency] = useState('KRW')
  const labels = ko ? { entry: '살펴볼 매수가', quantity: '수량', stop: '손절 기준가', target: '목표 기준가', feePercent: '한 번 거래 수수료 (%)' } : { entry: 'Planned entry', quantity: 'Quantity', stop: 'Stop reference', target: 'Target reference', feePercent: 'Fee per side (%)' }
  let result: ReturnType<typeof calculatePurchasePlan> | null = null
  try { result = calculatePurchasePlan({ entry: Number(values.entry), quantity: Number(values.quantity), stop: Number(values.stop), target: Number(values.target), feePercent: Number(values.feePercent) }) } catch { /* Incomplete or invalid form. */ }
  const number = (value: number) => `${value.toLocaleString(language, { maximumFractionDigits: 8 })} ${currency}`
  const field = (key: keyof typeof values) => <label key={key}>{labels[key]}<input inputMode="decimal" type="number" step="any" min="0" value={values[key]} onChange={e => setValues(old => ({ ...old, [key]: e.target.value }))} /></label>
  if (simple) return <SimpleWorkspace title={ko ? '사기 전에, 얼마가 달라질까요?' : 'Before buying, what could change?'} description={ko ? '내가 생각한 가격으로 이익과 손실을 계산해요. 가격을 추천하거나 주문하는 기능은 아니에요.' : 'Compare outcomes at your own prices. This does not suggest prices or place orders.'}>
    <SimpleTasks label={ko ? '매수 계획 순서' : 'Plan a purchase'} tasks={[
      { id: 'amount', title: ko ? '1. 얼마를 살까요?' : '1. Amount', description: ko ? '매수가와 수량' : 'Entry and quantity', content: <section className={styles.card}><label>{ko ? '기준 통화' : 'Quote currency'}<select value={currency} onChange={e => setCurrency(e.target.value)}>{['KRW', 'USDT', 'BTC'].map(v => <option key={v}>{v}</option>)}</select></label>{field('entry')}{field('quantity')}<p>{ko ? '다음 단계에서 올라갔을 때와 내려갔을 때의 가격을 넣어보세요.' : 'Next, enter prices for an advance and a decline.'}</p></section> },
      { id: 'risk', title: ko ? '2. 어디까지 볼까요?' : '2. Price limits', description: ko ? '목표와 손실 기준' : 'Target and stop', content: <section className={styles.card}>{field('target')}{field('stop')}{field('feePercent')}<p>{ko ? '손실 기준은 매수가보다 낮게, 목표는 높게 입력하세요. 수수료 기본값은 예시예요.' : 'Stop must be below entry and target above. The default fee is an example.'}</p></section> },
    ]} />
    <section className={styles.card} aria-live="polite"><h2>{ko ? '이렇게 달라져요' : 'Possible outcomes'}</h2>{result ? <div className={styles.result}><span>{ko ? '수수료를 포함해 필요한 금액' : 'Required amount including fee'}</span><strong>{number(result.cost)}</strong><span>{ko ? '목표에 도달하면' : 'At target'}: {number(result.gain)}</span><span>{ko ? '손실 기준에 도달하면' : 'At stop'}: −{number(result.loss)}</span></div> : <p>{ko ? '두 단계의 가격과 수량을 입력하면 결과를 보여드려요.' : 'Enter prices and quantity in both steps to see the outcome.'}</p>}<p>{ko ? '양쪽 수수료를 포함하며 실제 체결 가격과 세금은 달라질 수 있어요. 입력은 이 화면에서만 유지돼요.' : 'Includes both fees; execution and taxes can differ. Inputs remain only on this page.'}</p><Link to="/my-analysis">{ko ? '종목에서 가격 확인' : 'Review asset prices'} →</Link></section>
  </SimpleWorkspace>
  return <div className={styles.page}><h1>{ko ? '매수 계획 계산' : 'Purchase plan calculator'}</h1><p>{ko ? '얼마를 쓰고, 기준 가격에 도달하면 얼마가 달라지는지 먼저 계산해보세요.' : 'Calculate the cost and possible outcomes at your price criteria.'}</p>
    <div className={styles.grid}><section className={styles.card}><h2>{ko ? '내가 정한 가격' : 'Your price criteria'}</h2>
      <label>{ko ? '기준 통화' : 'Quote currency'}<select value={currency} onChange={e => setCurrency(e.target.value)}>{['KRW', 'USDT', 'BTC'].map(v => <option key={v}>{v}</option>)}</select></label>
      {(Object.keys(values) as (keyof typeof values)[]).map(key => <label key={key}>{labels[key]}<input inputMode="decimal" type="number" step="any" min="0" value={values[key]} onChange={e => setValues(old => ({ ...old, [key]: e.target.value }))} /></label>)}
    </section><section className={styles.card}><h2>{ko ? '예상 손익' : 'Estimated outcome'}</h2>
      {result ? <div className={styles.result} aria-live="polite"><span>{ko ? '필요 금액 · 매수 수수료 포함' : 'Cost including entry fee'}</span><strong>{number(result.cost)}</strong><span>{ko ? '목표 가격에서 순손익' : 'Net P/L at target'}: {number(result.gain)}</span><span>{ko ? '손절 가격에서 예상 손실' : 'Loss at stop'}: {number(result.loss)}</span><span>{ko ? '이익 여지 / 손실 위험' : 'Reward / risk'}: {result.rewardRisk.toFixed(2)}</span></div> : <p role="status">{ko ? '양수로 입력하고 손절 < 매수가 < 목표 순서를 맞춰주세요. 수수료는 0~5%입니다.' : 'Enter positive values with stop < entry < target. Fee range: 0–5%.'}</p>}
      <p>{ko ? '양쪽 거래 수수료를 반영한 단순 계산이에요. 실제 체결 가격·세금은 다를 수 있어요. 주문하지 않으며 이 계산은 저장되지 않아요.' : 'Includes fees on both sides. Execution prices and taxes may differ. No orders are sent and this calculation is not saved.'}</p>
      <Link to="/my-analysis">{ko ? '종목 분석에서 가격 확인 →' : 'Review an instrument →'}</Link><Link to="/portfolio">{ko ? '내 투자에서 보유·목표 기록 →' : 'Record holdings and targets →'}</Link>
    </section></div></div>
}
