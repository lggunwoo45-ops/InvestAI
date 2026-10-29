import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import type { CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { ScanResult, ScanPoolMode } from '@/services/cryptoAnalysis/liveCandidateScan'
import { bestOpportunity, buildOpportunityPlans, freshScanResult, opportunityPositionSize, opportunityShortlist, validOpportunityCost, type CheckKey, type OpportunityPlan } from '@/services/cryptoAnalysis/opportunityEngine'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import type { MarketInstrument } from '@/types/market'
import { validScenarioInstrument } from '@/services/scenarios/scenarioStorage'
import { SaveScenario } from '@/components/scenarios/SaveScenario'
import styles from './OpportunityPlans.module.css'

const copy = {
  ko: { kinds:{pullback:'상승 추세 눌림',breakout:'가격 돌파',rebound:'하락 추세 속 반등'}, states:{ready:'진입 조건 충족',watch:'조건 도달 대기',avoid:'현재 조건 불리',unavailable:'평가 자료 부족'}, title:'장세별 기회 탐색', cost:'왕복 거래 비용 가정 (%)', note:'수수료·슬리피지를 합친 가정값입니다. 실제 비용에 맞게 바꾸세요. 목표 달성 확률이나 검증된 수익률을 뜻하지 않습니다.', expired:'이전 결과는 유효 시간이 지나 현재 후보에서 제외했습니다. 최신 가격으로 다시 검색하세요.' },
  en: { kinds:{pullback:'Trend pullback',breakout:'Price breakout',rebound:'Countertrend rebound'}, states:{ready:'Entry conditions met',watch:'Waiting for conditions',avoid:'Unfavorable conditions',unavailable:'Insufficient evidence'}, title:'Opportunities by market regime', cost:'Assumed round-trip cost (%)', note:'Assumed fees plus slippage. Adjust to your actual costs. These are not target probabilities or validated returns.', expired:'Expired results are excluded from current candidates. Scan fresh prices.' },
} as const
export function ScanPoolControl({ value, onChange, disabled, language }: { value:ScanPoolMode; onChange:(mode:ScanPoolMode)=>void; disabled:boolean; language:Language }) {
  const ko = language === 'ko'
  return <label>{ko ? '먼저 살펴볼 종목' : 'Scan priority'}<select value={value} disabled={disabled} onChange={e=>onChange(e.target.value as ScanPoolMode)}><option value="liquidity">{ko ? '거래대금 우선' : 'Liquidity first'}</option><option value="strength">{ko ? '상대 강세 우선' : 'Relative strength first'}</option></select></label>
}
function useCost() {
  const [value, setValue] = useState(() => { try { const v = localStorage.getItem('investai.opportunity.cost.v1'); if (v !== null && v.trim() && validOpportunityCost(Number(v))) return v } catch { /* Optional preference. */ } return '0.2' })
  const cost = value.trim() ? Number(value) : NaN
  const change = (v: string) => { setValue(v); if (v.trim() && validOpportunityCost(Number(v))) try { localStorage.setItem('investai.opportunity.cost.v1',v) } catch { /* Session still works. */ } }
  return { value, cost, change }
}
function CostControl({ language, value, onChange }: { language:Language; value:string; onChange:(value:string)=>void }) {
  const valid = !!value.trim() && validOpportunityCost(Number(value))
  return <div className={styles.cost}><label>{copy[language].cost}<input type="number" min="0" max="3" step="0.05" value={value} onChange={e=>onChange(e.target.value)} aria-invalid={!valid} /></label><p>{copy[language].note}</p>{!valid && <p role="alert">{language === 'ko' ? '비용은 0~3% 사이로 입력하세요.' : 'Enter a cost from 0 to 3%.'}</p>}</div>
}
function checkText(plan:OpportunityPlan, key:CheckKey, ko:boolean) {
  const rules:Record<CheckKey,string> = ko ? {
    regime:plan.kind === 'pullback' ? '큰 흐름이 상승 우세' : plan.kind === 'rebound' ? '상위 시간대 하락 속 반등 전략' : '상위 시간대가 하락 우세가 아님',
    close:plan.kind === 'pullback' ? '1시간봉이 지지 구간 안에서 전 봉보다 높게 상승 마감' : '1시간봉이 돌파 기준 위에서 상승 마감',
    volume:`1시간 거래량이 이전 20개 봉 평균의 ${plan.volumeRequired}배 이상`,
    recovery:'직전 RSI 45 이하에서 2 이상 회복하고 현재 RSI 35~65', price:'현재 가격이 진입 검토 구간 안에 있음',
    structure:'손절 < 진입 구간 < 실제 고점·이동평균 기반 목표', reward:'거래 비용을 뺀 손익비가 1.5 이상',
    heat:'단기 과열·급격한 가격 이탈 없음', risk:'현재 가격이 손절 기준보다 높음', context:'확인된 매도 체결·알트 약세 경고 없음',
  } : {
    regime:plan.kind === 'pullback' ? 'Higher-timeframe uptrend' : plan.kind === 'rebound' ? 'Countertrend setup within a higher-timeframe decline' : 'Higher timeframe is not bearish',
    close:plan.kind === 'pullback' ? 'Hourly bullish close inside support, above the previous close' : 'Hourly bullish close above the breakout threshold',
    volume:`Hourly volume at least ${plan.volumeRequired}× the previous 20-bar average`, recovery:'RSI recovers by 2+ from 45 or less, now between 35 and 65', price:'Current price remains inside the entry zone',
    structure:'Stop < entry zone < observed swing / moving-average target', reward:'Reward/risk after assumed costs is at least 1.5', heat:'No short-term overheating or sudden price displacement', risk:'Current price is above the stop reference', context:'No observed selling-flow or altcoin-weakness warning',
  }
  return rules[key]
}
function PlanCard({ plan, instrument, language, decision, sizing = false }: { plan:OpportunityPlan; instrument:MarketInstrument; language:Language; decision?:CryptoDecision; sizing?:boolean }) {
  const ko = language === 'ko', t = copy[language], price = (v:number) => `${formatAnalysisPrice(v,language)} ${instrument.quoteCurrency}`
  const [budget,setBudget] = useState(''), [capital,setCapital] = useState('')
  const size = opportunityPositionSize(plan, Number(budget), Number(capital))
  const missed = plan.checks.filter(c=>!c.passed)
  const saveDecision:CryptoDecision|null = decision && validScenarioInstrument(instrument) && plan.entry && plan.stop && plan.target && plan.netRewardRisk !== null && ['ready','watch'].includes(plan.status) ? {
    ...decision, plan:{frame:'1H',entry:plan.entry,stop:plan.stop,target:plan.target,resistance:[plan.target,plan.target],sellInvalidation:plan.target, targetBasis:'observed',supportBasis:'range',rewardRisk:plan.netRewardRisk},
  } : null
  return <article className={styles.card} data-opportunity={plan.status}>
    <header><h3>{t.kinds[plan.kind]}</h3><strong className={styles.badge}>{t.states[plan.status]}</strong></header>
    {plan.kind === 'rebound' && <p className={styles.caution}>{ko ? '큰 흐름은 아직 하락입니다. 단기 반등 시도를 따로 평가하며 상승 전환으로 간주하지 않습니다.' : 'The broader trend is still down. This evaluates a short rebound, not a confirmed trend reversal.'}</p>}
    {plan.issue ? <p>{plan.issue === 'cost' ? ko ? '비용 입력을 확인하면 다시 계산합니다.' : 'Correct the cost to recalculate.' : ko ? '유효한 1시간봉과 상위 시간대 자료가 필요합니다. 자료 부족은 매수·매도 신호가 아닙니다.' : 'Valid hourly and higher-timeframe data are required. Missing data is not a trading signal.'}</p> : <>
      <p className={styles.next}>{plan.status === 'ready' ? ko ? '현재 스냅샷에서 조건을 충족했습니다. 주문 전 현재 가격과 아래 손실 기준을 다시 확인하세요.' : 'Conditions match this snapshot. Recheck the current price and planned loss before any order.' : ko ? '충족하지 못한 조건' : 'Unmet conditions'}</p>
      {missed.length > 0 && <ul className={styles.missed}>{missed.map(c=><li key={c.key}>{checkText(plan,c.key,ko)}</li>)}</ul>}
      <dl className={styles.prices}>
        <div><dt>{ko ? '진입 검토 구간' : 'Entry review zone'}</dt><dd>{plan.entry ? `${formatAnalysisPrice(plan.entry[0],language)} – ${price(plan.entry[1])}` : '—'}</dd></div>
        <div><dt>{ko ? '손절 검토 기준' : 'Stop review level'}</dt><dd>{plan.stop ? price(plan.stop) : '—'}</dd></div>
        <div><dt>{ko ? '목표 기준' : 'Target reference'}</dt><dd>{plan.target ? price(plan.target) : ko ? '저항 근거 없음' : 'No resistance reference'}</dd></div>
      </dl>
      {plan.trigger !== null && <p>{ko ? plan.kind === 'pullback' ? '1시간봉이 위 구간 안에서 전 봉보다 높게 마감하는지 확인합니다.' : `돌파 확인: 1시간봉이 ${price(plan.trigger)} 위에서 상승 마감해야 합니다.` : plan.kind === 'pullback' ? 'Watch for an hourly close inside the zone and above the prior close.' : `Breakout confirmation: an hourly bullish close above ${price(plan.trigger)}.`}</p>}
      {plan.netRewardRisk !== null && <div className={styles.payoff}><strong>{ko ? '비용 차감 손익비' : 'Reward/risk after costs'} {plan.netRewardRisk.toFixed(2)} : 1</strong><span>{ko ? '목표 도달 시' : 'At target'} {plan.netUpsidePercent!.toFixed(2)}% · {ko ? '손절 가격 체결 시' : 'If filled at stop'} −{plan.plannedLossPercent!.toFixed(2)}%</span><small>{ko ? `${plan.priceBasis === 'current' ? '확인한 현재 가격' : '조건 대기 구간의 상단'} ${price(plan.referencePrice!)} · 왕복 비용 ${plan.costPercent}% 가정` : `${plan.priceBasis === 'current' ? 'Current quote' : 'Upper edge of the conditional entry zone'} ${price(plan.referencePrice!)} · assumed round-trip cost ${plan.costPercent}%`}</small></div>}
      <details><summary>{ko ? '충족 조건과 계산 근거' : 'Conditions and calculation'}</summary><ul>{plan.checks.map(c=><li key={c.key}>{c.passed ? '✓' : '○'} {checkText(plan,c.key,ko)}</li>)}</ul><p>{ko ? `${plan.targetBasis ? `목표는 ${plan.targetBasis === 'average' ? '상위 시간대 20봉 이동평균' : '확인된 과거 고점'} 기준입니다.` : '목표로 삼을 저항 근거가 없습니다.'} 과열은 1시간 RSI 70 이상, 가격이 20봉 평균보다 2 ATR 초과, 최근 종가에서 1.5 ATR 초과 이탈한 경우입니다. 지지·저항 돌파와 손절 체결은 보장되지 않으며 실제 손실이 계획보다 커질 수 있습니다.` : `${plan.targetBasis ? `The target uses ${plan.targetBasis === 'average' ? 'the higher-timeframe 20-bar average' : 'a previously observed swing high'}.` : 'No overhead target reference is available.'} Heat checks exclude hourly RSI ≥70, prices over SMA20 + 2 ATR, or displacement over 1.5 ATR from the last close. Stops may fill at worse prices; actual losses can exceed the plan.`}</p></details>
      {sizing && ['ready','watch'].includes(plan.status) && <details className={styles.sizing}><summary>{ko ? '손실 예산으로 매수 규모 계산' : 'Size a purchase from a loss budget'}</summary><label>{ko ? '계획 손실 예산' : 'Planned loss budget'} ({instrument.quoteCurrency})<input type="number" min="0" value={budget} onChange={e=>setBudget(e.target.value)} /></label><label>{ko ? '최대 투입 금액' : 'Capital limit'} ({instrument.quoteCurrency})<input type="number" min="0" value={capital} onChange={e=>setCapital(e.target.value)} /></label>{size ? <output><strong>{ko ? '계산 수량' : 'Calculated quantity'} {size.quantity.toLocaleString(language,{maximumSignificantDigits:6})}</strong><span>{ko ? '투입 금액' : 'Notional'} {price(size.notional)} · {ko ? '계획 손실' : 'Planned loss'} {price(size.plannedLoss)}</span></output> : <p>{ko ? '두 금액을 입력하면 비용을 포함해 계산합니다.' : 'Enter both amounts to calculate with costs.'}</p>}<small>{ko ? '레버리지를 사용하지 않는 계산입니다. 급락·체결 지연 시 이 예산보다 더 잃을 수 있습니다.' : 'No leverage is assumed. Gaps and execution delays can exceed this budget.'}</small></details>}
      {saveDecision && <details><summary>{ko ? '이 가격 조건 기록·감시' : 'Record and monitor these price levels'}</summary><p>{ko ? '진입 구간·목표·손절 가격을 기존 시나리오에 저장합니다. 위의 거래량·RSI 등 모든 전략 조건을 자동 감시하는 기능은 아닙니다.' : 'Saves entry, target and stop prices to scenarios. This monitors price levels, not every volume/RSI strategy condition above.'}</p><SaveScenario instrument={instrument} decision={saveDecision} language={language} /></details>}
    </>}
  </article>
}

export function OpportunityReview({ instrument, decision, language }: { instrument:MarketInstrument; decision:CryptoDecision; language:Language }) {
  const cost = useCost(), plans = buildOpportunityPlans(decision,cost.cost), best = bestOpportunity(plans)
  const [showAll,setShowAll] = useState(false)
  return <section className={styles.panel} aria-label={language === 'ko' ? '전략별 진입 조건' : 'Strategy entry conditions'}><h2>{language === 'ko' ? '지금 가격에서 가능한 전략' : 'Strategies at the current price'}</h2><CostControl language={language} value={cost.value} onChange={cost.change} /><PlanCard plan={best} instrument={instrument} language={language} decision={decision} sizing /><button type="button" onClick={()=>setShowAll(v=>!v)} aria-expanded={showAll}>{language === 'ko' ? showAll ? '다른 전략 접기' : '다른 전략도 확인' : showAll ? 'Hide other strategies' : 'Review other strategies'}</button>{showAll && plans.filter(p=>p.kind!==best.kind).map(plan=><PlanCard key={plan.kind} plan={plan} instrument={instrument} language={language} />)}</section>
}

export function OpportunityBoard({ results, now, language, simple = false }: { results:readonly ScanResult[]; now:number; language:Language; simple?:boolean }) {
  const cost = useCost(), ko = language === 'ko', t = copy[language]
  const rows = opportunityShortlist(results,now,cost.cost), ready = rows.filter(r=>r.best.status==='ready'), watch = rows.filter(r=>r.best.status==='watch'), excluded = rows.filter(r=>['avoid','unavailable'].includes(r.best.status))
  const [more,setMore] = useState(false), limit = more ? 12 : simple ? 3 : 4
  const fresh = results.filter(r=>freshScanResult(r,now)), assessed = fresh.filter(r=>r.decision.direction!=='unavailable'), down = assessed.filter(r=>r.decision.direction==='sell').length
  return <section className={styles.panel} aria-label={t.title}><header><div><h2>{t.title}</h2><p>{ko ? '상승 눌림·돌파·하락 속 반등을 따로 검사합니다. 조건을 충족한 종목과 준비 중인 종목을 구분해요.' : 'Evaluate trend pullbacks, breakouts and countertrend rebounds separately. Eligible and pending setups stay distinct.'}</p></div></header>
    <CostControl language={language} value={cost.value} onChange={cost.change} />
    {assessed.length > 0 && <p className={styles.regime}>{ko ? `이번 검색 표본 ${assessed.length}개 중 ${down}개가 하락 우세입니다. 시장 전체를 대표하지 않습니다.` : `${down} of ${assessed.length} assessed scan results lean downward. This sample does not represent the entire market.`}</p>}
    {fresh.length < results.length && <p role="status">{t.expired}</p>}
    {(['ready','watch'] as const).map(status=>{ const group = status==='ready' ? ready : watch; return <section key={status} aria-label={t.states[status]}><h3 className={styles.groupTitle}>{t.states[status]} <span>{group.length}</span></h3>{group.length===0 ? <p>{ko ? status==='ready' ? '현재 모든 진입 조건을 충족한 종목은 없습니다. 아래의 조건 대기·제외 이유를 확인하세요.' : '현재 유효한 조건 대기 계획이 없습니다.' : status==='ready' ? 'No assets currently meet all entry conditions. Review the pending setups and exclusions below.' : 'No valid pending setups at this snapshot.'}</p> : <div className={styles.grid}>{group.slice(0,limit).map(({result,best,relative})=><div key={result.instrument.id} className={styles.asset}><header><h3>{result.instrument.displaySymbol ?? result.instrument.symbol}</h3><small>{new Date(result.analyzedAt).toLocaleTimeString(language)}</small></header>{relative && <p className={styles.strength}>{ko ? `같은 6시간 종가 기준 BTC 대비 ${relative.difference>=0?'+':''}${relative.difference.toFixed(2)}%p · 종목 ${relative.assetReturn.toFixed(2)}% / BTC ${relative.bitcoinReturn.toFixed(2)}%` : `Same six-hour closes: ${relative.difference>=0?'+':''}${relative.difference.toFixed(2)}pp vs BTC · asset ${relative.assetReturn.toFixed(2)}% / BTC ${relative.bitcoinReturn.toFixed(2)}%`}</p>}<PlanCard plan={best} instrument={result.instrument} language={language} /><Link to={`/my-analysis?instrumentId=${encodeURIComponent(result.instrument.id)}`}>{ko ? '현재 가격으로 계획·손실 예산 확인' : 'Review current plan and loss budget'} →</Link></div>)}</div>}</section> })}
    {(ready.length>limit || watch.length>limit) && <button type="button" onClick={()=>setMore(true)}>{ko ? '조건별 후보 더 보기' : 'Show more setups'}</button>}
    {excluded.length>0 && <details className={styles.excluded}><summary>{ko ? `조건 불리·자료 부족 ${excluded.length}개 · 이유 보기` : `${excluded.length} unfavorable / unavailable · reasons`}</summary>{excluded.map(({result,best})=><div key={result.instrument.id}><strong>{result.instrument.symbol} · {t.states[best.status]}</strong><p>{best.issue ? ko ? best.issue==='cost' ? '거래 비용 입력 확인 필요' : '유효한 완료 봉과 시세가 부족합니다.' : 'Valid data and cost assumptions are required.' : best.checks.filter(c=>!c.passed).map(c=>checkText(best,c.key,ko)).join(' · ')}</p><Link to={`/my-analysis?instrumentId=${encodeURIComponent(result.instrument.id)}`}>{ko ? '세 전략의 재검토 가격 보기' : 'Review thresholds for all three strategies'} →</Link></div>)}</details>}
    <details><summary>{ko ? '선정·정렬 기준과 한계' : 'Selection, ordering and limitations'}</summary><p>{ko ? '완료된 1시간봉과 상위 시간대 자료를 사용합니다. 진입 구간 안의 현재 가격 또는 대기 구간 상단에서 비용 차감 손익비 1.5 이상을 요구합니다. 없는 목표 가격을 만들어 채우지 않습니다. 상태별로 묶고 같은 거래소·통화의 BTC와 비교 가능한 6시간 상대 수익률, 거래대금 순으로 정렬합니다. 상대 강세는 함께 하락하는 경우에도 나타납니다. 모든 결과는 수신 후 최대 90초까지 유효합니다.' : 'Uses closed hourly and higher-timeframe bars, requiring net reward/risk ≥1.5 from the current entry-zone price or its upper edge. Missing targets are not invented. Groups sort by aligned six-hour relative returns versus BTC in the same venue/quote, then turnover. Relative strength can occur while both prices fall. Results expire within 90 seconds of receipt.'}</p><p>{ko ? '매수 방향의 전략 가설이며 수익성은 아직 검증 전입니다. 선물 레버리지·펀딩비·세금은 계산에 포함하지 않습니다. 실제 주문은 실행하지 않습니다.' : 'These are long-side strategy hypotheses without validated profitability. Leverage, funding and taxes are excluded. No orders are executed.'}</p></details>
  </section>
}
