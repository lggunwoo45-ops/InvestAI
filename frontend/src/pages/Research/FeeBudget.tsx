import { useState } from 'react'
import { feeBudget } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'

export function FeeBudget() {
  const [maker, setMaker] = useState('0.02'), [taker, setTaker] = useState('0.05'), [amount, setAmount] = useState('1000'), [trips, setTrips] = useState('20')
  const [entryMaker, setEntryMaker] = useState(false), [exitMaker, setExitMaker] = useState(false), [target, setTarget] = useState('1'), [stop, setStop] = useState('1')
  const [marginMode, setMarginMode] = useState(false), [leverage, setLeverage] = useState('1')
  const valid = [maker, taker, amount, trips, target, stop, leverage].every(v => v !== '' && Number.isFinite(Number(v))) && Number(leverage) >= 1 && Number(leverage) <= 125
  const result = valid ? feeBudget({ notional: Number(amount) * (marginMode ? Number(leverage) : 1), makerPercent: Number(maker), takerPercent: Number(taker), monthlyTrips: Number(trips), targetPercent: Number(target), stopPercent: Number(stop), entryMaker, exitMaker }) : null
  const fmt = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 4 })
  return <section className={styles.subpanel}><h3>월·연 수수료와 손익분기 도달 비율</h3><p>표시된 수수료는 계산 예시입니다. 계정에 적용되는 메이커·테이커 요율을 직접 확인해 입력하세요.</p>
    <div className={styles.form}><label>금액 입력 방식<select value={String(marginMode)} onChange={e => setMarginMode(e.target.value === 'true')}><option value="false">포지션 금액 직접 입력</option><option value="true">증거금 × 레버리지</option></select></label>
      <label>{marginMode ? '증거금 (USDT)' : '포지션 금액 (USDT)'}<input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} /></label>
      {marginMode && <label>거래 배수<input type="number" min="1" max="125" value={leverage} onChange={e => setLeverage(e.target.value)} /></label>}
      <label>메이커 요율 (%)<input type="number" min="0" step="any" value={maker} onChange={e => setMaker(e.target.value)} /></label><label>테이커 요율 (%)<input type="number" min="0" step="any" value={taker} onChange={e => setTaker(e.target.value)} /></label>
      <label>진입 주문<select value={String(entryMaker)} onChange={e => setEntryMaker(e.target.value === 'true')}><option value="false">테이커</option><option value="true">메이커</option></select></label><label>청산 주문<select value={String(exitMaker)} onChange={e => setExitMaker(e.target.value === 'true')}><option value="false">테이커</option><option value="true">메이커</option></select></label>
      <label>월 왕복 거래 횟수<input type="number" min="0" value={trips} onChange={e => setTrips(e.target.value)} /></label><label>목표 폭 (%)<input type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} /></label><label>손실 종료 폭 (%)<input type="number" min="0" step="any" value={stop} onChange={e => setStop(e.target.value)} /></label>
    </div>{!result ? <p>유효한 금액·요율·목표 폭을 입력해주세요.</p> : <><div className={styles.metrics}>{[['왕복 1회 비용', `${fmt(result.perTrip)} USDT`], ['월 비용', `${fmt(result.monthly)} USDT`], ['연 비용', `${fmt(result.annual)} USDT`], ['손익분기 도달 비율', result.breakevenPercent > 100 ? '100% 초과 · 가정상 손익분기 불가' : `${fmt(result.breakevenPercent)}%`]].map(([title, value]) => <article className={styles.metric} key={title}><span>{title}</span><strong>{value}</strong></article>)}</div><p>계산식: (손실 폭 + 왕복 비용률) ÷ (목표 폭 + 손실 폭). 목표·손실 종료만 발생하고 거래마다 같은 비용을 지불하는 단순 모형입니다. 실제 도달 비율을 예측하지 않습니다. 펀딩·슬리피지는 위 비교기에 별도로 반영하세요.</p></>}
  </section>
}
