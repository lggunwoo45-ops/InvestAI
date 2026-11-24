import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import type { MarketVenue } from '@/types/market'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { futuresShortlist, type FuturesPlan, type FuturesSide } from '@/services/cryptoAnalysis/futuresOpportunities'
import { rankFuturesCandidates, type FuturesCandidate } from '@/services/cryptoAnalysis/futuresCandidates'
import { validOpportunityCost } from '@/services/cryptoAnalysis/opportunityEngine'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { checkText, useCost } from './opportunityPresentation'
import { ScanDataIssues } from './ScanObservations'
import { CandidateDecision, CandidateScanSummary } from './CandidateDecision'
import { decisionLabel } from './candidateDecisionCopy'
import { actionCounts } from '@/services/cryptoAnalysis/candidateAction'
import shared from './OpportunityPlans.module.css'
import styles from './FuturesOpportunityBoard.module.css'

export function ScanMarketMode({ venue, onChange, disabled, language }: { venue:MarketVenue; onChange:(venue:MarketVenue)=>void; disabled:boolean; language:Language }) {
  const ko = language === 'ko', futures = venue === 'binance-futures'
  return <div className={styles.switcher} role="group" aria-label={ko ? '현물·선물 탐색 선택' : 'Spot or futures scan'}>
    <button type="button" aria-pressed={!futures} disabled={disabled} onClick={() => { if (futures) onChange('upbit-krw') }}>{ko ? '현물 코인' : 'Spot coins'}</button>
    <button type="button" aria-pressed={futures} disabled={disabled} onClick={() => { if (!futures) onChange('binance-futures') }}>{ko ? '바이낸스 롱·숏' : 'Binance long / short'}</button>
  </div>
}

function futuresCheckText(plan: FuturesPlan, key: FuturesPlan['checks'][number]['key'], ko: boolean) {
  if (plan.side === 'long') return checkText({ ...plan, kind:plan.kind as 'pullback' | 'breakout' | 'rebound', netUpsidePercent:plan.potentialReturnPercent }, key, ko)
  const text = ko ? {
    regime:'상위 시간대의 하락 추세 확인', close:plan.kind === 'breakdown' ? '1시간봉이 하락 돌파선 아래에서 전 봉보다 낮게 음봉 마감' : '1시간봉이 저항 구간에서 전 봉보다 낮게 음봉 마감',
    volume:`1시간 거래량이 이전 20개 봉 평균의 ${plan.volumeRequired}배 이상`, recovery:'반등 약화 확인', price:'현재 가격이 숏 진입 검토 구간 안에 있음',
    structure:'실제로 확인한 저점 목표 < 진입 구간 < 손절 가격', reward:'거래 비용을 뺀 손익비 1.5 이상',
    heat:'RSI 30 초과 · 급락을 뒤쫓는 가격이 아님', risk:'현재 가격이 숏 손절 가격보다 낮음', context:'확인된 매수 체결 우세가 없음',
  } : {
    regime:'Higher-timeframe downtrend', close:plan.kind === 'breakdown' ? 'Bearish hourly close below the breakdown level and previous close' : 'Bearish hourly rejection inside resistance, below the previous close',
    volume:`Hourly volume at least ${plan.volumeRequired}× its previous 20-bar average`, recovery:'Rebound weakening', price:'Current price inside the short entry zone',
    structure:'Observed low target < entry zone < stop', reward:'Reward/risk after assumed costs at least 1.5',
    heat:'RSI above 30; no chasing a sharp fall', risk:'Current price below the short stop', context:'No observed buying-flow dominance',
  }
  return text[key]
}
const names = {
  ko:{pullback:'상승 눌림', breakout:'상승 돌파', rebound:'하락 속 반등', rejection:'반등 저항에서 숏', breakdown:'지지 이탈 후 숏'},
  en:{pullback:'Bullish pullback', breakout:'Upside breakout', rebound:'Countertrend rebound', rejection:'Resistance rejection', breakdown:'Support breakdown'},
}

function FuturesCard({ candidate, rank, language, simple }: { candidate:FuturesCandidate; rank:number; language:Language; simple:boolean }) {
  const { result, plan, phase } = candidate
  const hasPricePlan = candidate.hasPricePlan && phase !== 'avoid'
  const ko = language === 'ko', { instrument, decision } = result
  const price = (v:number) => `${formatAnalysisPrice(v, language)} USDT`
  const blockerOrder = ['risk','structure','reward','heat','regime','context','recovery','price','close','volume']
  const pending = plan.checks.filter(c => !c.passed).sort((a,b) => blockerOrder.indexOf(a.key) - blockerOrder.indexOf(b.key)), ready = phase === 'ready'
  const reason = ko ? {
    trend:'단기 흐름과 큰 흐름이 같은 방향이에요.',
    momentum:`최근 단기 ${plan.side === 'long' ? '상승' : '하락'} 움직임을 먼저 포착했어요. 큰 추세가 굳어지기 전의 후보도 포함해요.`,
    relative:`BTC 대비 ${plan.side === 'long' ? '상대 강세' : '상대 약세'}가 있어 우선 관찰해요.`,
    turnaround:`아직 ${plan.side === 'long' ? '상승' : '하락'} 근거는 약해요. 검사한 종목 중 전환 여부를 먼저 살펴볼 관찰 후보예요.`,
  } : {
    trend:'Short-term and higher-timeframe trends align.', momentum:`Early ${plan.side === 'long' ? 'upward' : 'downward'} movement, before full trend confirmation.`,
    relative:`Relative ${plan.side === 'long' ? 'strength' : 'weakness'} versus BTC makes this worth watching.`, turnaround:'Directional evidence is still weak. This is a relative review priority for a possible turn, not an entry signal.',
  }
  const signed = (n:number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}`
  return <article className={shared.card} data-opportunity={phase === 'avoid' ? 'avoid' : ready ? 'ready' : 'watch'} data-phase={phase}>
    <p className={styles.rank}>{plan.side.toUpperCase()} · {ko ? phase === 'avoid' ? '제외 결과' : `검토 순위 ${rank}` : phase === 'avoid' ? 'Excluded result' : `Review priority ${rank}`}</p>
    <header><h3>{instrument.displaySymbol ?? instrument.symbol}</h3><span className={shared.badge}>{decisionLabel(candidate.verdict, ko)}</span></header>
    <CandidateDecision candidate={candidate} language={language} />
    <div className={styles.reason}><strong>{ko ? '흐름 분석' : 'Market evidence'}</strong><p>{reason[candidate.reason]}</p>
      <small>{ko ? '최근 3시간' : 'Last 3 closed hours'} {signed(candidate.change3h)}%{candidate.volumeRatio !== null && ` · ${ko ? '거래량' : 'Volume'} ${candidate.volumeRatio.toFixed(2)}×`}{candidate.relativeBitcoin !== null && ` · BTC ${ko ? '대비 6시간' : 'relative 6h'} ${signed(candidate.relativeBitcoin)}%p`}</small>
      {candidate.countertrend && <p className={styles.caution}>{ko ? `큰 흐름은 ${candidate.higherDirection === 'buy' ? '상승' : '하락'}입니다. 반대 방향을 먼저 살피는 역추세 후보예요.` : 'This is a countertrend candidate: the higher timeframe points the other way.'}</p>}
    </div>
    {hasPricePlan && <p><strong>{plan.side === 'long' ? 'LONG' : 'SHORT'} · {names[language][plan.kind]}</strong></p>}
    <p>{ko ? '현재 선물 가격' : 'Current futures price'} · {decision.price === null ? '—' : price(decision.price)}</p>
    {hasPricePlan && plan.entry && plan.stop && plan.target ? <dl className={shared.prices}>
      <div><dt>{ko ? ready ? '진입 검토 구간' : '조건부 진입 구간' : ready ? 'Entry review zone' : 'Conditional entry zone'}</dt><dd>{plan.entry.map(v => formatAnalysisPrice(v, language)).join('–')} USDT</dd></div>
      <div><dt>{ko ? plan.side === 'short' ? '손절 · 이 가격 위로 오르면' : '손절 · 이 가격 아래로 내리면' : 'Stop reference'}</dt><dd>{price(plan.stop)}</dd></div>
      <div><dt>{ko ? plan.side === 'short' ? '하락 목표 · 이전 저점' : '상승 목표 · 저항' : 'Observed target'}</dt><dd>{price(plan.target)}</dd></div>
    </dl> : null}
    {hasPricePlan && plan.netRewardRisk !== null && <div className={shared.payoff}><strong>{ko ? '비용 반영 손익비' : 'Reward/risk after costs'} {plan.netRewardRisk.toFixed(2)}</strong><small>{ko ? `목표 도달 시 +${plan.potentialReturnPercent?.toFixed(2)}% · 손절 시 −${plan.plannedLossPercent?.toFixed(2)}%` : `At target +${plan.potentialReturnPercent?.toFixed(2)}% · At stop −${plan.plannedLossPercent?.toFixed(2)}%`}</small><small>{ko ? `${plan.priceBasis === 'current' ? '현재 가격' : '진입 구간의 불리한 끝 가격'} 기준 가정 · 레버리지·펀딩비 제외` : `${plan.priceBasis === 'current' ? 'Current price' : 'Less favorable entry edge'} assumption · no leverage / funding`}</small></div>}
    <details open={!simple}><summary>{ko ? `분석 근거 · ${phase === 'avoid' ? '미충족' : '남은 조건'} ${pending.length}개` : `Evidence · ${pending.length} pending`}</summary>
      <ul>{plan.checks.map(c => <li key={c.key}>{c.passed ? '✓' : '○'} {futuresCheckText(plan, c.key, ko)}</li>)}</ul>
      {(!decision.context || decision.context.flow === 'unavailable') && <p>{ko ? '체결 방향은 미확인입니다. 확인된 가격·거래량으로 평가했어요.' : 'Trade-flow direction is unavailable; assessed using observed prices and volume.'}</p>}
      <p>{ko ? '확인 시각' : 'Checked'} {new Date(result.analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')} · Binance Futures · USDT</p>
    </details>
    <Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '이 선물 종목 차트·분석' : 'This futures chart and analysis'} →</Link>
  </article>
}

export function FuturesOpportunityBoard({ results, now, language, simple = false, onRefresh }: { results:readonly ScanResult[]; now:number; language:Language; simple?:boolean; onRefresh?:()=>void }) {
  const ko = language === 'ko', cost = useCost()
  const [filter, setFilter] = useState<'all' | FuturesSide>('all'), [expanded, setExpanded] = useState(false)
  const rows = { long:futuresShortlist(results, now, 'long', cost.cost), short:futuresShortlist(results, now, 'short', cost.cost) }
  const candidates = { long:rankFuturesCandidates(results, now, 'long', cost.cost), short:rankFuturesCandidates(results, now, 'short', cost.cost) }
  const valid = validOpportunityCost(cost.cost)
  const expired = results.filter(r => r.expiresAt < now)
  const sides = (['long', 'short'] as const).filter(side => filter === 'all' || side === filter)
  return <section className={shared.panel} aria-label={ko ? '바이낸스 선물 롱·숏 분석' : 'Binance futures long / short analysis'}>
    <header><h2>{ko ? '롱·숏 진입 판단' : 'Long / short entry decisions'}</h2><p>{ko ? '각 종목을 지금 진입 검토·가격 대기·마감봉 대기·거래량 대기·진입 제외로 판단합니다. 유효한 진입 계획이 있는 종목을 먼저 보여드려요.' : 'Decide whether to review entry now, wait for price, hourly close or volume, or exclude entry. Viable setups rank first.'}</p><small>{ko ? '바이낸스 USDT 무기한 선물 전용 · 순위는 이번 검사 안에서의 관찰 우선순위이며 수익 확률이 아닙니다.' : 'Binance USDT perpetual futures only. Ranks are review priorities within this scan, not profit probabilities.'}</small></header>
    <details><summary>{ko ? '적극 후보와 진입 조건의 차이' : 'Active candidates vs entry conditions'}</summary><p>{ko ? '단기 방향, 최근 3시간 움직임, BTC 대비 강약, 거래량, 진입 구간까지의 거리를 함께 비교합니다. 진입 구간이 1시간 평균 변동 폭의 3배보다 멀면 이번 진입 계획에서 제외합니다. 추세·과열·가격 구조 기준을 통과하지 못한 종목은 진입 제외로 분리하고 검토 순위 뒤에 표시합니다. 자료가 부족하거나 오래된 종목은 제외합니다. 진입 조건 충족은 가격·마감봉·거래량과 비용 반영 손익비 등을 별도로 통과해야 합니다. 같은 코인의 롱·숏은 서로 다른 조건의 대안입니다.' : 'Compare short-term direction, the last three closed hours, strength versus BTC, volume and entry distance. Entry zones farther than three hourly ATRs are excluded from the current entry plan. Failed trend, heat or price-structure gates are explicit exclusions ranked after viable setups; missing or stale data is excluded. Entry readiness separately requires price, closed bars, volume and cost-adjusted reward/risk. Opposite directions for one coin are conditional alternatives.'}</p></details>
    <div className={styles.switcher} role="group" aria-label={ko ? '방향별 결과' : 'Direction results'}>{(['all', 'long', 'short'] as const).map(side => <button type="button" key={side} aria-pressed={filter === side} onClick={() => setFilter(side)}>{side === 'all' ? ko ? '롱·숏 모두' : 'Both directions' : side === 'long' ? ko ? '롱 · 상승' : 'Long · rising' : ko ? '숏 · 하락' : 'Short · falling'}</button>)}</div>
    <details><summary>{ko ? `진입·청산 예상 비용 ${valid ? `${cost.cost}%` : '입력 필요'} · 변경` : `Entry / exit cost ${valid ? `${cost.cost}%` : 'required'} · edit`}</summary>
      <label className={styles.cost}>{ko ? '진입·청산 총 예상 비용 (%)' : 'Estimated entry / exit cost (%)'}<input type="number" min="0" max="3" step="0.05" value={cost.value} onChange={e => cost.change(e.target.value)} aria-invalid={!valid} /></label>
      <p>{ko ? '진입과 청산의 수수료·예상 체결 차이를 합친 비율이에요. 예: 0.2%면 1,000 USDT 거래당 총 2 USDT를 가정해요. 실제 수수료를 자동 조회한 값이 아니며 펀딩비는 제외해요.' : 'Combined entry / exit fees and expected slippage. At 0.2%, a 1,000 USDT position assumes 2 USDT total cost. This is editable, not a retrieved fee; funding is excluded.'}</p>
    </details>
    {expired.length > 0 && <div className={shared.dataWarning} role="status"><h3>{ko ? `${expired.length}개 분석의 시세 확인 시간이 지났어요` : `${expired.length} scan snapshots have expired`}</h3><p>{ko ? '분석 실패가 아닙니다. 지난 검사 기록은 아래에 남겨두었고, 현재 진입 판단에는 최신 가격이 필요해요.' : 'The analysis did not fail. Earlier records remain below; fresh prices are required for a current entry decision.'}</p>{onRefresh && <button type="button" onClick={onRefresh}>{ko ? '롱·숏 최신 가격 다시 검사' : 'Refresh long / short scan'}</button>}
      <details><summary>{ko ? '지난 검사 기록 · 현재 진입 신호 아님' : 'Earlier scan records · not current entry signals'}</summary><p>{ko ? '아래는 지난 시세에 현재 입력한 비용 가정을 적용한 결과입니다.' : 'These historical prices are recalculated using the currently entered cost assumption.'}</p>{expired.map(result => <div key={result.instrument.id}><strong>{result.instrument.displaySymbol ?? result.instrument.symbol}</strong> · {new Date(result.analyzedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')}
        {(['long','short'] as const).map(side => {
          const candidate = rankFuturesCandidates([result], result.analyzedAt, side, cost.cost)[0], plan = candidate?.plan
          return <p key={side}>{side.toUpperCase()} · {!valid ? ko ? '비용 입력 후 기록을 확인하세요.' : 'Enter valid costs to inspect this record.' : candidate && plan
            ? `${ko ? '지난 시세 기준' : 'Historical snapshot'}: ${ko ? candidate.phase === 'ready' ? '조건 충족' : candidate.phase === 'price-wait' ? '가격 도달 대기' : candidate.phase === 'avoid' ? '진입 제외' : decisionLabel(candidate.verdict, true) : candidate.phase} · ${candidate.hasPricePlan && plan.entry && plan.stop && plan.target
              ? `${ko ? '검토 구간' : 'Entry zone'} ${plan.entry.map(v => formatAnalysisPrice(v, language)).join('–')} · ${ko ? '손절' : 'Stop'} ${formatAnalysisPrice(plan.stop, language)} · ${ko ? '목표' : 'Target'} ${formatAnalysisPrice(plan.target, language)}`
              : `${ko ? '방향 전환 확인선' : 'Reassessment reference'} ${formatAnalysisPrice(candidate.reassessPrice,language)}`} USDT`
            : ko ? '검사 당시 평가 자료 부족' : 'Insufficient evidence at scan time'}</p>
        })}</div>)}</details>
    </div>}
    {!valid ? <p role="alert">{ko ? '예상 비용을 0~3%로 입력하면 다시 계산해요.' : 'Enter costs from 0 to 3% to calculate candidates.'}</p> : <div className={styles.columns}>{sides.map(side => {
      const shown = candidates[side].slice(0, expanded ? undefined : 3), counts = actionCounts(candidates[side])
      return <section key={side} className={styles.side} data-side={side} aria-label={ko ? side === 'long' ? '롱 후보' : '숏 후보' : `${side} candidates`}>
        <header><h3>{side === 'long' ? ko ? '롱 판단 결과' : 'Long decisions' : ko ? '숏 판단 결과' : 'Short decisions'}</h3><p>{ko ? `전체 ${counts.total}개 평가 · 상위 ${shown.length}개 표시` : `${counts.total} assessed · showing ${shown.length}`}</p></header>
        <CandidateScanSummary rows={candidates[side]} language={language} />
        {shown.length ? shown.map((candidate,index) => <FuturesCard key={candidate.result.instrument.id} candidate={candidate} rank={index+1} language={language} simple={simple} />) : <p>{expired.length ? ko ? '최신 가격으로 다시 검사하면 현재 후보가 표시돼요.' : 'Refresh prices to see current candidates.' : ko ? '아직 후보를 평가할 최신 자료가 부족해요. 아래 연결 상태를 확인하세요.' : 'Fresh data is insufficient to rank candidates. Review the data status below.'}</p>}
        {rows[side].some(r => r.plan.status === 'unavailable') && <p>{ko ? `자료 부족으로 평가하지 못한 종목 ${rows[side].filter(r => r.plan.status === 'unavailable').length}개` : 'Some assets could not be assessed due to missing data.'}</p>}
      </section>
    })}</div>}
    {!expanded && sides.some(side => candidates[side].length > 3) && <button type="button" onClick={() => setExpanded(true)}>{ko ? '12개 전체 판단 보기' : 'Show all decisions'}</button>}
    <ScanDataIssues results={results.filter(r => r.expiresAt >= now)} now={now} language={language} />
    <p>{ko ? '가격이 구간에 닿아도 마감봉·거래량을 확인해야 해요. 수익률·손실률은 레버리지 없는 가격 변화 기준이며, 펀딩비·청산 위험은 별도입니다. 실제 주문은 실행하지 않아요. 결과는 시세 수신 후 90초간 유효해요.' : 'A price touch alone is insufficient: closed bars and volume must confirm. Returns are unleveraged price-based estimates; funding and liquidation risk are separate. No orders are executed. Results expire 90 seconds after quote receipt.'}</p>
  </section>
}
