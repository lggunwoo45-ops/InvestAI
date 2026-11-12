import { useMajorSupportHistory } from '@/hooks/useMajorSupportHistory'
import { buildMajorSupport } from '@/services/myAnalysis/majorSupport'
import type { AnalysisSeries } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import type { Language } from '@/i18n/translations'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { scenarioTitles } from './scenarioCopy'
import styles from './MajorSupportPanel.module.css'

export function MajorSupportPanel({ instrument, quote, now, language, expert, onEvidence }: { instrument: MarketInstrument; quote: AnalysisSeries; now: number; language: Language; expert: boolean; onEvidence: () => void }) {
  const ko = language === 'ko'
  const history = useMajorSupportHistory(instrument, quote.dataQuality === 'live')
  const model = buildMajorSupport(instrument, history.data, quote, now)
  const main = model.candidates[0]
  const price = (value: number) => `${formatAnalysisPrice(value, language)} ${instrument.quoteCurrency}`
  const date = (value: number) => new Date(value).toLocaleDateString(ko ? 'ko-KR' : 'en-US')
  const averageName = (value: string) => ko ? ({ '200D': '200일 이동평균', '20W': '20주 이동평균', '50W': '50주 이동평균' }[value] ?? value) : `${value} moving average`
  return <section className={styles.panel} aria-label={scenarioTitles[language].downside} data-major-support>
    <header><span>{ko ? '장기 핵심 지지 분석' : 'LONG-TERM SUPPORT'}</span><h3>{ko ? '가장 주목할 지지대' : 'The key support zone'}</h3><p>{ko ? '가까운 가격보다, 오랜 가격 기록에서 반등 근거가 겹치는 구간을 먼저 봅니다.' : 'Prioritizes overlapping historical support evidence over proximity to the current price.'}</p></header>
    <p className={styles.identity}>{instrument.displaySymbol ?? instrument.symbol} · {instrument.marketId} · {instrument.quoteCurrency}</p>
    {model.status !== 'ready' ? <div className={styles.empty} role="status">
      <strong>{ko ? history.loading ? '장기 가격 기록을 분석하고 있어요' : model.status === 'no-confluence' ? '핵심 지지대로 고를 만큼 근거가 겹치지 않아요' : '핵심 지지대를 판단할 자료가 부족해요' : history.loading ? 'Analyzing long-term price history' : model.status === 'no-confluence' ? 'No support zone has enough overlapping evidence' : 'Insufficient data for a key support zone'}</strong>
      <p>{ko ? history.failed ? '장기 일봉을 불러오지 못했습니다. 연결을 다시 확인할 수 있어요.' : model.status === 'no-confluence' ? '반복 반등·주봉 저점·장기 평균을 비교했지만 대표 구간을 선정하지 못했습니다. 변동폭으로 가격을 만들어 넣지 않습니다.' : '최신 실제 시세와 최소 180개 일봉·24개 완성 주봉이 필요합니다. 최근 구간만으로 장기 지지대를 대신하지 않습니다.' : history.failed ? 'Long-term daily history could not be loaded.' : model.status === 'no-confluence' ? 'No candidate met the repeated-reaction and confluence requirements. Volatility estimates are not substituted.' : 'Requires a fresh live quote, at least 180 daily bars and 24 complete weekly bars.'}</p>
      <button type="button" onClick={history.failed ? history.retry : onEvidence}>{ko ? history.failed ? '장기 자료 다시 불러오기' : '현재 자료 상태 확인' : history.failed ? 'Retry history' : 'Check current data'}</button>
    </div> : <>
      <article className={styles.hero}>
        <div className={styles.heroTop}><strong>{ko ? '핵심 지지 기준' : 'Key support reference'}</strong><span>{ko ? '관측 후보 중 근거 1위' : 'Highest evidence-ranked candidate'}</span></div>
        <b className={styles.primary}>{price(main.center)}</b>
        <p>{ko ? '지지 구간' : 'Support zone'} <strong>{formatAnalysisPrice(main.low, language)} – {price(main.high)}</strong></p>
        <div className={styles.distance}><span>{ko ? '현재가' : 'Current price'} {price(model.price!)}</span><strong>{ko ? '기준선까지' : 'To reference'} {((main.center / model.price! - 1) * 100).toFixed(1)}%</strong></div>
        <p className={styles.explainer}>{ko ? '이 가격까지 떨어진다는 목표가가 아닙니다. 큰 하락이 이어질 때 우선 확인할 지지 후보입니다.' : 'This is not a downside target. It is the leading support candidate to review if a deeper decline develops.'}</p>
      </article>
      <section className={styles.evidence} aria-label={ko ? '핵심 지지 근거' : 'Support evidence'}><h4>{ko ? '왜 이 가격인가요?' : 'Why this level?'}</h4>
        <ul><li>{ko ? `서로 떨어진 시기에 ${main.reactions}차례 반등이 관측됐습니다.` : `${main.reactions} separated historical rebound episodes.`}</li>
          {main.weeklyPivots > 0 && <li>{ko ? `주봉 저점 ${main.weeklyPivots}개가 이 가격대와 겹칩니다.` : `${main.weeklyPivots} weekly pivot lows overlap this zone.`}</li>}
          {main.averages.map(value => <li key={value}>{ko ? `${averageName(value)}도 같은 구간에 있습니다.` : `${averageName(value)} also falls in this zone.`}</li>)}
          {main.volumeReactions > 0 && <li>{ko ? `반등 당시 거래량이 이전 평균보다 컸던 사례가 ${main.volumeReactions}차례 있습니다.` : `${main.volumeReactions} rebound episodes had above-baseline volume.`}</li>}
        </ul><small>{ko ? `관측 기간 ${date(main.firstReaction)} ~ ${date(main.lastReaction)}` : `Observed ${date(main.firstReaction)} – ${date(main.lastReaction)}`}</small>
      </section>
      <div className={styles.invalidation}><strong>{ko ? '언제 이 판단을 버려야 하나요?' : 'When should this assessment be dropped?'}</strong><p>{ko ? `일봉이 지지 구간 하단 ${price(main.low)} 아래에서 2개 연속 마감하면 이 지지 판단을 해제합니다. 장중에도 급격한 이탈이 가능하며, 이 기준은 손실 한도가 아닙니다.` : `Discard this support assessment after two consecutive daily closes below ${price(main.low)}. Intraday breaks remain possible; this is not a loss limit.`}</p></div>
      <details open={expert} key={String(expert)} className={styles.method}><summary>{ko ? '다른 후보와 선정 근거' : 'Other candidates and selection method'}</summary>
        <p>{ko ? `일봉 ${model.days}개 · 완성 주봉 ${model.weeks}개 · ${date(model.from!)} ~ ${date(model.asOf!)}` : `${model.days} daily and ${model.weeks} complete weekly bars · ${date(model.from!)} – ${date(model.asOf!)}`}</p>
        <div className={styles.table}><table><thead><tr><th>{ko ? '후보 기준선' : 'Reference'}</th><th>{ko ? '근거 점수' : 'Evidence score'}</th><th>{ko ? '반등 관측' : 'Rebounds'}</th></tr></thead><tbody>{model.candidates.map((c, i) => <tr key={c.center}><td>{i === 0 ? '★ ' : ''}{price(c.center)}</td><td>{c.score}/100</td><td>{c.reactions}</td></tr>)}</tbody></table></div>
        <p>{ko ? '점수는 반등 성공 확률이 아닙니다. 14일 이상 떨어진 반등(최대 32점), 주봉 저점 중첩(30점), 200일·20주·50주 평균 중첩(20점), 반등 거래량(8점), 관측 반등폭(10점)을 합산합니다. 일봉과 주봉은 같은 거래 기록에서 나온 근거이며 독립적인 신호로 보지 않습니다.' : 'This score is not a bounce probability. It combines separated rebounds (32), weekly pivot overlap (30), long moving-average overlap (20), rebound volume (8), and observed rebound size (10). Daily and weekly evidence comes from the same underlying trades.'}</p>
        <p>{ko ? '최소 28일에 걸친 2회 이상 반등을 확인합니다. 일봉 좌우 3개·주봉 좌우 2개로 확인된 저점과 이후 종가 3% 이상 회복을 사용합니다. 기준선은 저점 묶음의 중앙값(주봉 2배 가중)이며, 구간 폭은 일봉 변동폭과 가격 비율로 정합니다. 거래량은 봉 단위 참고값으로, 실제 가격별 매물대가 아닙니다. 현재가와 가깝다는 이유로 점수를 더하지 않습니다.' : 'Requires at least two separated rebound episodes spanning 28 days. Confirmed daily/weekly pivot lows must be followed by at least a 3% closing-price recovery. The center is the grouped low median with double weight for weekly lows; width uses daily volatility and a price band. Candle volume is not a volume-at-price profile. Proximity receives no bonus.'}</p>
        <a href="https://www.cmegroup.com/education/courses/technical-analysis/support-and-resistance" target="_blank" rel="noreferrer">{ko ? '장기 지지·저항 개념' : 'Support and resistance concepts'} ↗</a>
      </details>
    </>}
    <p className={styles.note}>{ko ? '여러 근거가 겹쳐도 지지는 무너질 수 있습니다. 보장된 바닥이나 검증된 적중률로 표시하지 않습니다.' : 'Support can fail despite overlapping evidence. This is neither a guaranteed bottom nor a validated hit rate.'}</p>
  </section>
}
