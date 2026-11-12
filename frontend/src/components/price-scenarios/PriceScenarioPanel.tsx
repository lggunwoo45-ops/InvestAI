import { scenarioTitles } from './scenarioCopy'
import { useEffect, useId, useState } from 'react'
import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { buildStockPriceScenarios, type PriceScenarios, type ScenarioSide, type ScenarioZone } from '@/services/myAnalysis/priceScenarios'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './PriceScenarioPanel.module.css'



export function PriceScenarioPanel({ model, side, language, expert = false, onEvidence, stock = false }: { model: PriceScenarios; side: ScenarioSide; language: Language; expert?: boolean; onEvidence?: () => void; stock?: boolean }) {
  const ko = language === 'ko', up = side === 'upside', scenario = model[side]
  const price = (n: number) => `${formatAnalysisPrice(n, language)} ${model.currency}`
  const range = (z: ScenarioZone) => z.low === z.high ? price(z.low) : `${formatAnalysisPrice(z.low, language)} – ${price(z.high)}`
  const distance = (n: number) => { const value = (n / model.price! - 1) * 100; return Number.isFinite(value) ? `${value > 0 ? '+' : ''}${value.toFixed(2)}%` : '—' }
  const frame = ko ? ({ '1H': '1시간봉', '4H': '4시간봉', '1D': '일봉' } as const)[model.frame] : model.frame
  const basis = (z: ScenarioZone) => ko ? z.basis === 'atr' ? '변동폭 기반 추정' : z.basis === 'pivot' ? '관측된 피벗 지지' : '과거 가격에서 관측' : z.basis === 'atr' ? 'Volatility estimate' : z.basis === 'pivot' ? 'Observed pivot support' : 'Observed in price history'
  const bias = ko ? ({ buy: '현재는 상승 쪽이 우세합니다.', sell: '현재는 하락 쪽이 우세합니다.', neutral: '현재는 시간대별 방향이 혼재합니다.', unavailable: '', unassessed: '일봉의 지지·저항을 기준으로 살펴봅니다.' } as const)[model.bias] : ({ buy: 'The current bias is upward.', sell: 'The current bias is downward.', neutral: 'Timeframe directions are mixed.', unavailable: '', unassessed: 'Reviewing daily support and resistance.' } as const)[model.bias]
  return <section className={styles.panel} data-side={side} data-mode={expert ? 'expert' : 'simple'} aria-label={scenarioTitles[language][side]}>
    <header><span className={styles.eyebrow}>{ko ? up ? '상방 시나리오' : '하방 시나리오' : up ? 'UPSIDE SCENARIO' : 'DOWNSIDE SCENARIO'}</span><h3>{ko ? up ? '상승할 때 확인할 가격' : '하락할 때 확인할 가격' : up ? 'Price levels to watch on an advance' : 'Price levels to watch on a decline'}</h3><p>{ko ? '최고가·최저가를 맞히는 예측이 아니라, 조건에 따라 다음에 살펴볼 구간입니다.' : 'Conditional reference levels, not a prediction of the highest or lowest future price.'}</p></header>
    <p className={styles.identity}>{model.symbol} · {model.venue} · {model.currency}</p>
    {model.status === 'unavailable' ? <div className={styles.unavailable} role="status">
      <strong>{ko ? '가격 구간을 아직 계산할 수 없어요' : 'Price levels are not available yet'}</strong>
      <p>{ko ? model.issue === 'history' ? '최근 완료된 일봉이 충분하지 않습니다. 유효한 가격 기록이 확보되면 표시합니다.' : model.issue === 'range' ? '유효한 가격 변동폭이 없어 구간을 만들 수 없습니다.' : stock ? '최신 실제 시세와 완료된 일봉 20개 이상이 필요합니다. 모의·연결 지연 자료로는 가격을 제시하지 않습니다.' : '최신 실제 시세와 유효한 시간대 2개 이상이 필요합니다. 모의·오래된 자료로는 가격을 제시하지 않습니다.' : model.issue === 'history' ? 'Recent completed daily bars are insufficient.' : model.issue === 'range' ? 'No usable price range is available.' : stock ? 'Fresh live quotes and at least 20 completed daily bars are required.' : 'Fresh live quotes and at least two valid timeframes are required.'}</p>
      {onEvidence && <button type="button" onClick={onEvidence}>{ko ? '시간대별 자료 상태 확인' : 'Check timeframe data'}</button>}
    </div> : <>
      <div className={styles.context}><div><span>{ko ? '현재 기준 가격' : 'Current reference price'}</span><strong>{price(model.price!)}</strong></div><p>{bias}{((up && model.bias === 'sell') || (!up && model.bias === 'buy')) && <><br />{ko ? up ? '따라서 상방은 추세 회복을 확인해야 하는 반등 가정입니다.' : '따라서 하방은 지지가 무너질 때 대비하는 가정입니다.' : up ? 'The upside case requires evidence of a recovery.' : 'The downside case is a contingency for lost support.'}</>}</p></div>
      <div className={styles.steps}>{([scenario.first, scenario.next] as const).map((z, index) => <article key={index}>
        <div className={styles.stepHeading}><span>{index + 1}</span><h4>{ko ? index === 0 ? up ? '먼저 확인할 저항' : '먼저 확인할 지지' : up ? '돌파 후 다음 구간' : '이탈 후 다음 구간' : index === 0 ? up ? 'First resistance' : 'First support' : up ? 'After a breakout' : 'After a breakdown'}</h4></div>
        {z ? <><span className={styles.basis} data-estimated={z.basis === 'atr'}>{basis(z)}</span><strong className={styles.price}>{range(z)}</strong><small>{ko ? '현재가 대비' : 'From current price'} {distance(z.low)}{z.low !== z.high && ` ~ ${distance(z.high)}`}</small>
          {index === 0 && model.price! >= z.low && model.price! <= z.high && <p>{ko ? '현재 가격이 이 구간 안에 있습니다. 종가와 이후 움직임을 확인하세요.' : 'Price is already inside this zone. Check the close and subsequent movement.'}</p>}
          <p>{ko ? index === 0 ? up ? '상승이 막히거나 쉬어갈 수 있는 구간입니다.' : '하락이 멈추거나 반등을 시도할 수 있는 구간입니다.' : up ? '앞 구간을 넘어선 뒤에 검토합니다. 여기까지 상승한다는 뜻은 아닙니다.' : '앞 구간이 무너진 뒤에 검토합니다. 여기서 반드시 멈춘다는 뜻은 아닙니다.' : index === 0 ? up ? 'An advance may pause or reverse here.' : 'A decline may stabilize or attempt a rebound here.' : 'Consider only after the first level is passed; reaching or stopping here is not assured.'}</p>
        </> : <p>{ko ? '추가 기준을 만들 근거가 없습니다. 가격을 임의로 채우지 않습니다.' : 'There is no usable reference for this stage.'}</p>}
      </article>)}</div>
      {scenario.first && <div className={styles.condition}><strong>{ko ? '다음 구간을 보려면' : 'Before considering the next level'}</strong><p>{ko ? `${frame}이 ${price(up ? scenario.first.high : scenario.first.low)} ${up ? '위' : '아래'}에서 마감하는지 확인하세요. 잠깐 닿는 것과 구분하고, 이후 ${up ? '지지 전환' : '반등 실패'}·거래량도 함께 살펴보세요.` : `Check for a ${frame} close ${up ? 'above' : 'below'} ${price(up ? scenario.first.high : scenario.first.low)}. A brief touch is different; inspect follow-through and volume.`}</p></div>}
      <div className={styles.reassess}><strong>{ko ? up ? '상승 가정을 다시 볼 가격' : '하락 가정을 다시 볼 가격' : 'Reassessment threshold'}</strong>{scenario.reassess !== null ? <><b>{price(scenario.reassess)}</b><p>{ko ? `${frame}이 이 가격 ${up ? '아래' : '위'}에서 마감하면 ${up ? '상승' : '하락'} 가정을 재검토합니다. 반대 방향이 확정됐다는 뜻은 아닙니다.` : `Reassess this case if a ${frame} closes ${up ? 'below' : 'above'} this price. This does not confirm the opposite direction.`}</p></> : <p>{ko ? '반대편 가격 기준이 없어 숫자로 정할 수 없습니다.' : 'No opposing reference is available.'}</p>}</div>
      <details className={styles.method} open={expert} key={`${side}-${expert}`}><summary>{ko ? '기준 시간과 계산 방법' : 'Timeframe and calculation'}</summary>
        <p>{ko ? `기준: ${frame} · 유효 완료 봉 ${model.count}개` : `Reference: ${frame} · ${model.count} valid completed bars`}</p>
        {model.asOf !== null && <p>{ko ? '기준 봉 시각' : 'Reference bar time'}: {new Date(model.asOf).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}</p>}
        <p>{ko ? model.atr !== null ? `1차 구간은 기존 가격 계획을 사용합니다. 다음 구간은 최근 60개 완료 봉에서 찾으며, 관측 가격이 없으면 앞 구간 끝에서 평균 변동폭(ATR)의 2배를 확장하고 ±0.25 ATR로 표시합니다. ATR: ${price(model.atr)}. 기존 계획을 만들 수 없으면 현재가 주변 관측 가격 또는 ±2 ATR부터 시작합니다.` : '완료된 일봉의 기존 1·2차 지지·저항 계산을 사용합니다. 현재 진행 중인 일봉은 보수적으로 제외하며, 관측 가격이 없으면 추정 가격을 만들지 않습니다.' : model.atr !== null ? `Uses the existing first price zones. Further zones use the last 60 completed bars, or a 2 ATR extension from the first zone's edge with a ±0.25 ATR band. ATR: ${price(model.atr)}. Without an existing plan, start with observed levels around price or ±2 ATR.` : 'Uses the existing first and second daily support/resistance calculations. Forming daily bars are excluded conservatively; missing levels are not extrapolated.'}</p>
        <p>{ko ? '시간봉은 계산 단위이며 도달 예상 시간이 아닙니다. ATR은 변동폭을 나타내며 상승·하락 방향이나 도달 확률을 예측하지 않습니다.' : 'The timeframe is a calculation interval, not an estimated arrival time. ATR measures volatility, not direction or arrival probability.'}</p>
        <a href="https://www.fidelity.com/learning-center/trading-investing/technical-analysis/support-and-resistance" target="_blank" rel="noreferrer">{ko ? '지지·저항 개념' : 'Support and resistance'} ↗</a>{' · '}<a href="https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/atr" target="_blank" rel="noreferrer">ATR ↗</a>
      </details>
    </>}
    <p className={styles.note}>{ko ? '예상 구간은 가격 상한·하한이나 수익 보장이 아닙니다. 수수료·슬리피지·선물 청산가는 포함하지 않습니다.' : 'These levels are not price limits or guaranteed returns. Fees, slippage and futures liquidation are not included.'}</p>
  </section>
}

export function StockPriceScenarios({ instrument, series, language, expert, activeSide, onSideChange }: { instrument: MarketInstrument; series: AnalysisSeries; language: Language; expert: boolean; activeSide?: ScenarioSide; onSideChange?: (side: ScenarioSide) => void }) {
  const [localSide, setLocalSide] = useState<ScenarioSide>('upside'), [clock, setClock] = useState(Date.now)
  const side = activeSide ?? localSide
  const setSide = (next: ScenarioSide) => { setLocalSide(next); onSideChange?.(next) }
  const id = useId()
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer) }, [])
  const model = buildStockPriceScenarios(instrument, series, clock)
  return <div className={styles.stock}>
    <div className={styles.switcher} role="group" aria-label={language === 'ko' ? '상승·하락 시나리오' : 'Price scenarios'}>{(['upside', 'downside'] as const).map(value => <button type="button" key={value} aria-controls={id} aria-pressed={side === value} onClick={() => setSide(value)}>{scenarioTitles[language][value]}</button>)}</div>
    <div id={id}><PriceScenarioPanel model={model} side={side} language={language} expert={expert} stock /></div>
  </div>
}
