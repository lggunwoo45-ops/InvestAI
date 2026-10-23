import { backtest, type Signal } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'

type Side = 'long' | 'short'
export interface CostRow { name: string; fee: string; funding: string; interval: string }
export interface CostEstimate { fees: number; funding: number; total: number }
const fmt = (value: number, digits = 4) => value.toLocaleString('ko-KR', { maximumFractionDigits: digits })

function Field({ label, value, onChange, min, max, step = 'any' }: { label: string; value: string; onChange: (value: string) => void; min?: number; max?: number; step?: number | 'any' }) {
  return <label>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={event => onChange(event.target.value)} /></label>
}

export function GuidedCosts({ amount, hours, side, rows, estimates, onAmount, onHours, onSide, onRow, onFunding, canApplyFunding }: {
  amount: string; hours: string; side: Side; rows: CostRow[]; estimates: (CostEstimate | null)[];
  onAmount: (value: string) => void; onHours: (value: string) => void; onSide: (value: Side) => void;
  onRow: (index: number, key: keyof CostRow, value: string) => void; onFunding: () => void; canApplyFunding: boolean;
}) {
  const both = estimates[0] && estimates[1]
  return <section className={styles.guidedCalculator} aria-label="쉬운 거래비용 비교">
    <div className={styles.calculatorInputs}>
      <h3><span className={styles.stepNumber}>1</span> 같은 거래 조건으로 맞춰주세요</h3>
      <p>실제 거래에 걸리는 전체 금액을 입력해요. 레버리지를 쓰면 맡긴 돈이 아닌, 배수가 반영된 거래 금액이에요.</p>
      <div className={styles.form}><Field label="거래 금액 (USDT)" value={amount} onChange={onAmount} min={0} /><Field label="얼마나 보유하나요? (시간)" value={hours} onChange={onHours} min={0} max={8760} /><label>거래 방향<select value={side} onChange={e => onSide(e.target.value as Side)}><option value="long">오를 때 이익 · 롱</option><option value="short">내릴 때 이익 · 숏</option></select></label></div>
      <h3><span className={styles.stepNumber}>2</span> 비교할 수수료를 입력하세요</h3>
      <p className={styles.caption}>초기 수수료 0.05%는 계산 예시예요. 거래소·회원 등급·주문 방식에 맞는 요율로 바꿔주세요.</p>
      {rows.map((row, i) => <fieldset className={styles.assumptionCard} key={i}><legend>조건 {i + 1}</legend><label>조건 {i + 1} 이름<input value={row.name} maxLength={80} onChange={e => onRow(i, 'name', e.target.value)} /></label><Field label={`조건 ${i + 1} 한 번 거래할 때 수수료 (%)`} value={row.fee} onChange={v => onRow(i, 'fee', v)} min={0} max={100} /><details><summary>선물 보유 비용 설정 · {row.funding || '미입력'}% / {row.interval || '미입력'}시간</summary><p>펀딩비는 선물 보유 중 주고받는 비용이에요. 기본값 0%는 비용이 없다는 가정이며 실제 요율이 아니에요.</p><div className={styles.form}><Field label={`조건 ${i + 1} 정산당 펀딩률 (%)`} value={row.funding} onChange={v => onRow(i, 'funding', v)} /><Field label={`조건 ${i + 1} 정산 간격 (시간)`} value={row.interval} onChange={v => onRow(i, 'interval', v)} min={1} /></div>{i === 0 && <button disabled={!canApplyFunding} onClick={onFunding}>현재 Binance 펀딩을 조건 1에 적용</button>}</details></fieldset>)}
    </div>
    <aside className={styles.calculationStory} aria-label="비용 비교 결과"><span className={styles.eyebrow}>한 번 시작하고 끝낼 때</span><h3>총 비용은 이렇게 나뉘어요</h3>
      {rows.map((row, i) => { const value = estimates[i]; return <article className={styles.costResult} key={i} aria-label={`조건 ${i + 1} 비용 결과`}><h4>조건 {i + 1} · {row.name || '이름 미입력'}</h4>{value ? <><strong className={styles.resultAmount}>{fmt(value.total)} USDT</strong><span>{value.total < 0 ? '보유 중 수취액이 수수료보다 큰 가정이에요.' : '거래를 마칠 때까지의 지급 비용 가정이에요.'}</span><dl className={styles.resultBreakdown}><div><dt>시작·종료 수수료 합계</dt><dd>{fmt(value.fees)} USDT</dd></div><div><dt>보유 중 주고받는 비용</dt><dd>{fmt(value.funding)} USDT</dd></div></dl></> : <p>금액·시간·요율을 모두 입력하면 계산해요. 펼친 보유 비용 설정도 확인해주세요.</p>}</article> })}
      {both && <p className={styles.comparisonConclusion}>두 조건의 비용 차이는 <b>{fmt(Math.abs(estimates[0]!.total - estimates[1]!.total))} USDT</b>예요. {estimates[0]!.total === estimates[1]!.total ? '현재 가정에서는 같아요.' : `조건 ${estimates[0]!.total < estimates[1]!.total ? 1 : 2}의 비용이 더 작아요.`}</p>}
      <p>같은 가격에 시작하고 끝나며 펀딩률이 유지된다고 가정해요. 실제 정산 횟수·가격 변동·슬리피지·할인은 반영하지 않아요. 음수 비용은 받는 금액을 뜻해요.</p>
    </aside>
  </section>
}

export function GuidedPremium({ asset, krw, overseas, fx, premium, basis, onKrw, onOverseas, onFx, onFill, canFill }: {
  asset: string; krw: string; overseas: string; fx: string; premium: number | null; basis: string;
  onKrw: (value: string) => void; onOverseas: (value: string) => void; onFx: (value: string) => void; onFill: () => void; canFill: boolean;
}) {
  const converted = premium === null ? null : Number(overseas) * Number(fx)
  const diff = converted === null ? null : Number(krw) - converted
  return <section className={styles.guidedCalculator} aria-label="쉬운 국내외 가격 비교">
    <div className={styles.calculatorInputs}><h3><span className={styles.stepNumber}>1</span> 같은 코인 1개의 가격을 넣어주세요</h3><p>원화와 USDT는 단위가 달라요. 해외 가격을 원화로 바꾼 뒤 비교할게요.</p>
      <button className={styles.primaryAction} disabled={!canFill} onClick={onFill}>동시점 공개 시세로 채우기</button>{!canFill && <p className={styles.caption}>국내·해외 시세가 없거나 시각 차이가 커요. 확인한 가격을 직접 입력할 수 있어요.</p>}
      <div className={styles.stackedFields}><Field label={`${asset} 국내 가격 (KRW)`} value={krw} onChange={onKrw} min={0} /><Field label={`${asset} 해외 가격 (USDT)`} value={overseas} onChange={onOverseas} min={0} /></div>
      <h3><span className={styles.stepNumber}>2</span> USDT를 원화로 바꿔주세요</h3><Field label="1 USDT 원화 가격 (KRW)" value={fx} onChange={onFx} min={0} /><p className={styles.caption}>공개 시세는 업비트의 USDT 원화 가격을 사용해요. 은행의 원/달러 환율과는 달라요.</p>
    </div>
    <aside className={styles.calculationStory} aria-label="가격 비교 결과"><span className={styles.eyebrow}>같은 단위로 비교하면</span><h3>{premium === null ? '세 가격을 넣으면 비교할 수 있어요' : premium === 0 ? '입력한 두 가격이 같아요' : premium > 0 ? '국내 가격이 더 비싸요' : '국내 가격이 더 저렴해요'}</h3>
      {premium !== null && converted !== null && diff !== null ? <><strong className={styles.resultAmount}>{fmt(Math.abs(premium), 2)}%</strong><dl className={styles.resultBreakdown}><div><dt>국내 코인 1개</dt><dd>{fmt(Number(krw), 2)}원</dd></div><div><dt>해외 코인 1개 · 원화 환산</dt><dd>{fmt(converted, 2)}원</dd></div><div><dt>국내 − 해외 환산 가격</dt><dd>{fmt(diff, 2)}원</dd></div></dl><p className={styles.conversionFormula}>{fmt(Number(overseas))} USDT × {fmt(Number(fx))}원 = {fmt(converted, 2)}원</p><small>{basis}</small></> : <p>숫자가 없거나 0 이하이면 가격 차이를 계산하지 않아요.</p>}
      <p>이 비율을 흔히 김치프리미엄이라고 불러요. 거래비용과 이체 중 가격 변화가 빠져 있으므로, 그대로 얻을 수 있는 이익은 아니에요.</p>
    </aside>
  </section>
}

const plainSignals: Record<Signal, [string, string]> = {
  aboveMean: ['최근 평균보다 가격이 높았을 때', '직전 20시간 평균 종가보다 높음'],
  belowMean: ['최근 평균보다 가격이 낮았을 때', '직전 20시간 평균 종가보다 낮음'],
  volumeExpansion: ['거래량이 크게 늘었을 때', '직전 20시간 평균 거래량의 1.5배 이상'],
  rsiLow: ['최근 하락 움직임이 강했을 때', '최근 14개 변화량으로 계산한 RSI 30 이하'],
  rsiHigh: ['최근 상승 움직임이 강했을 때', '최근 14개 변화량으로 계산한 RSI 70 이상'],
}

export function GuidedPatterns({ signals, target, horizon, cost, side, result, onSignal, onTarget, onHorizon, onCost, onSide }: {
  signals: Signal[]; target: string; horizon: string; cost: string; side: Side; result: ReturnType<typeof backtest>;
  onSignal: (signal: Signal) => void; onTarget: (value: string) => void; onHorizon: (value: string) => void; onCost: (value: string) => void; onSide: (value: Side) => void;
}) {
  const samples = result?.samples ?? 0
  return <section className={styles.guidedCalculator} aria-label="쉬운 과거 흐름 검토">
    <div className={styles.calculatorInputs}><h3><span className={styles.stepNumber}>1</span> 어떤 때를 찾아볼까요?</h3><p>여러 조건을 고르면 <b>모두 함께 나타난 때</b>를 찾아요.</p><div className={styles.signalChoices}>{(Object.keys(plainSignals) as Signal[]).map(signal => <label className={styles.signalChoice} key={signal}><input type="checkbox" checked={signals.includes(signal)} onChange={() => onSignal(signal)} /><span><b>{plainSignals[signal][0]}</b><small>{plainSignals[signal][1]}</small></span></label>)}</div>
      <h3><span className={styles.stepNumber}>2</span> 그 뒤 얼마 동안 살펴볼까요?</h3><div className={styles.form}><Field label="위·아래로 확인할 가격 폭 (%)" value={target} onChange={onTarget} min={0.1} max={99} /><Field label="이후 관찰 시간" value={horizon} onChange={onHorizon} min={1} max={168} step={1} /></div><p className={styles.caption}>예를 들어 2%·24시간이면, 이후 하루 동안 위로 2%와 아래로 2% 중 어느 쪽에 먼저 닿았는지 확인해요.</p>
      <details><summary>손익 계산의 방향·비용 설정</summary><div className={styles.form}><label>손익 계산 방향<select value={side} onChange={e => onSide(e.target.value as Side)}><option value="long">오를 때 이익 · 롱</option><option value="short">내릴 때 이익 · 숏</option></select></label><Field label="왕복 수수료·슬리피지 (%)" value={cost} onChange={onCost} min={0} /></div><p>비용 기본값 0.2%는 예시예요. 실제 요율을 확인해 바꿔주세요.</p></details>
    </div>
    <aside className={styles.calculationStory} aria-label="과거 사례 결과"><span className={styles.eyebrow}>불러온 과거 자료 안에서</span><h3>{!result ? '조건과 숫자를 확인해주세요' : samples ? '비교할 수 있는 사례를 찾았어요' : '비교할 수 있는 사례가 없어요'}</h3>
      {!result ? <p>조건을 하나 이상 선택하고 가격 폭·관찰 시간·비용을 입력해주세요.</p> : <><strong className={styles.resultAmount}>{samples}건</strong><p>서로 겹치지 않는 관찰 기간만 세었어요. 같은 시간봉에서 위·아래 모두 닿아 순서를 모르는 {result.ambiguous}건은 제외했어요.</p>
        {samples > 0 && <><div className={styles.outcomeRows}>{[['위 가격에 먼저 도달', result.up], ['아래 가격에 먼저 도달', result.down], ['기간 안에 둘 다 미도달', result.timeout]].map(([label, count]) => <div className={styles.outcomeRow} key={String(label)}><span>{label}</span><b>{count}건</b><meter min={0} max={samples} value={Number(count)} aria-label={String(label)} /></div>)}</div><dl className={styles.resultBreakdown}><div><dt>{side === 'long' ? '상승' : '하락'} 방향 목표 우선 도달 비율</dt><dd>{result.proportion === null ? '확인 불가' : fmt(result.proportion * 100, 2) + '%'}</dd></div><div><dt>비용 반영 평균 단순 손익</dt><dd>{result.meanNetPercent === null ? '확인 불가' : fmt(result.meanNetPercent, 2) + '%'}</dd></div></dl></>}
        {samples < 30 && <p className={styles.sampleNotice} role="status">사례가 30건보다 적어요. 이 결과만으로 효과가 검증됐다고 볼 수 없어요.</p>}
      </>}
      <p>이미 지나간 가격을 비교한 결과예요. 앞으로의 성공 확률이 아니며, 레버리지·복리·펀딩 비용은 반영하지 않아요.</p>
    </aside>
  </section>
}
