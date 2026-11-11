import { Link } from 'react-router-dom'
import type { CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { bestOpportunity, buildOpportunityPlans, validOpportunityCost } from '@/services/cryptoAnalysis/opportunityEngine'
import { decisionGuide, easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import { validScenarioInstrument } from '@/services/scenarios/scenarioStorage'
import { SaveScenario } from '@/components/scenarios/SaveScenario'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import type { MarketInstrument } from '@/types/market'
import type { Language } from '@/i18n/translations'
import { CostControl } from './OpportunityPlans'
import { checkText, useCost } from './opportunityPresentation'
import styles from '@/components/product/InvestmentWorkflow.module.css'

export function SimpleDecisionBrief({ instrument, decision, language, holding, positionId, onDetails }: {
  instrument: MarketInstrument; decision: CryptoDecision; language: Language; holding: boolean; positionId?: string; onDetails: () => void;
}) {
  const ko = language === 'ko', cost = useCost()
  const best = bestOpportunity(buildOpportunityPlans(decision, cost.cost))
  const guide = decisionGuide(decision, language, holding)
  const available = decision.direction !== 'unavailable'
  const strategy = !holding && ['ready', 'watch'].includes(best.status)
  const missed = best.checks.filter(c => !c.passed)
  const names = ko ? { pullback: '상승 중 눌림', breakout: '가격 돌파', rebound: '하락 중 단기 반등' } : { pullback: 'Trend pullback', breakout: 'Breakout', rebound: 'Countertrend rebound' }
  const headline = strategy ? best.status === 'ready'
    ? ko ? '현재 조건 충족 · 손실 기준까지 확인하세요' : 'Conditions match · review the downside too'
    : ko ? `${names[best.kind]}, 아직 확인할 조건이 있어요` : `${names[best.kind]} · conditions are still pending`
    : !holding && available && ko ? decision.direction === 'sell' ? '하락 우세 · 회복 조건부터 확인하세요' : decision.extended ? '추격 위험 · 진입 가격을 다시 확인하세요' : '아직 진입 조건이 맞지 않아요' : guide.title
  const sourceDecision: CryptoDecision = strategy && best.entry && best.stop && best.target && best.netRewardRisk !== null ? {
    ...decision, plan: { frame: '1H', entry: best.entry, stop: best.stop, target: best.target, resistance: [best.target, best.target], sellInvalidation: best.target, targetBasis: 'observed', supportBasis: 'range', rewardRisk: best.netRewardRisk },
  } : decision
  const plan = sourceDecision.plan
  const canSave = available && (holding || validOpportunityCost(cost.cost)) && validScenarioInstrument(instrument) && plan && plan.stop < plan.entry[0] && plan.entry[1] < plan.target
  const price = (n: number) => `${formatAnalysisPrice(n, language)} ${instrument.quoteCurrency}`
  const candleTimes = decision.frames.filter(f => !f.issue && f.asOf !== null).map(f => `${f.frame} ${new Date(f.asOf!).toLocaleString(language)}`)
  return <section className={styles.brief} data-status={holding ? 'watch' : best.status} aria-label={ko ? '지금 판단과 다음 행동' : 'Decision and next action'}>
    <div className={styles.headline}><span className={styles.eyebrow}>{ko ? '지금 판단' : 'CURRENT VIEW'}</span><span className={styles.tag}>{easyDirection[language][decision.direction]}</span></div>
    <h3>{headline}</h3>
    <ul><li>{guide.reason}</li>{available && <li>{holding ? ko ? '평단가보다 시장의 위험 기준이 달라졌는지 먼저 확인하세요.' : 'Check whether the market risk criteria have changed, alongside your cost basis.' : missed.length ? (ko ? `${names[best.kind]} 전략: ${checkText(best, missed[0].key, ko)} 조건을 아직 충족하지 못했어요.` : checkText(best, missed[0].key, false) + ' · not met') : ko ? '현재 가격과 완료 봉으로 조건을 확인했습니다. 체결과 수익을 보장하지 않습니다.' : 'Conditions use the current quote and closed bars; fills and returns are not guaranteed.'}</li>}</ul>
    {available && <div className={styles.next}><strong>{ko ? '다음에 확인할 조건' : 'What to check next'}</strong>{strategy && best.trigger !== null ? ko ? `1시간봉이 ${price(best.trigger)} ${best.kind === 'pullback' ? '기준의 진입 구간에서 상승 마감하고' : '위에서 상승 마감하고'}, 거래량이 평소의 ${best.volumeRequired}배 이상인지 함께 확인하세요.` : `Check an hourly bullish close ${best.kind === 'pullback' ? 'inside the entry zone' : 'above ' + price(best.trigger)} and volume at least ${best.volumeRequired}× its baseline.` : plan ? ko ? `${plan.frame === '1D' ? '하루' : plan.frame === '4H' ? '4시간' : '1시간'}봉이 ${price(decision.direction === 'sell' && !holding ? plan.sellInvalidation : plan.stop)} ${decision.direction === 'sell' && !holding ? '위' : '아래'}에서 마감하면 현재 판단을 다시 확인하세요.` : `Reassess on a ${plan.frame} close ${decision.direction === 'sell' && !holding ? 'above ' + price(plan.sellInvalidation) : 'below ' + price(plan.stop)}.` : guide.next}
      {strategy && <p className={styles.note}>{ko ? '아래 가격 알림은 다시 분석할 계기입니다. 거래량·봉 마감 등 이 전략의 전체 조건 충족을 알려주는 알림은 아닙니다.' : 'A price alert is a prompt to review again, not confirmation of every strategy condition.'}</p>}
    </div>}
    {available && plan && <dl className={styles.prices}>
      <div><dt>{ko ? strategy ? '진입 검토 구간' : '지지 구간' : strategy ? 'Entry review zone' : 'Support zone'}</dt><dd>{formatAnalysisPrice(plan.entry[0], language)} – {price(plan.entry[1])}</dd></div>
      <div><dt>{ko ? strategy ? '목표 기준' : '저항 기준' : strategy ? 'Target reference' : 'Resistance reference'}</dt><dd>{price(plan.target)}</dd></div>
      <div><dt>{ko ? '하락 위험 기준' : 'Downside risk threshold'}</dt><dd>{price(plan.stop)}</dd></div>
    </dl>}
    <div className={styles.actions}><button type="button" onClick={onDetails}>{ko ? available ? '차트·근거 확인' : '연결·자료 상태 확인' : available ? 'Review chart and evidence' : 'Check data and connection'}</button><Link to="/dashboard#find-candidates">{ko ? '다른 후보 찾기' : 'Find other candidates'} →</Link></div>
    {canSave && <details><summary>{ko ? '이 가격으로 알림 설정·기록' : 'Set alerts and record these prices'}</summary><p className={styles.note}>{instrument.marketId === 'upbit' ? 'Upbit' : 'Binance Spot'} · {instrument.symbol} · {instrument.quoteCurrency}. {ko ? '분석 가격을 아래에 채웠습니다. 저장 전 수정할 수 있습니다. 매수 주문은 실행하지 않습니다.' : 'Analysis prices are prefilled for review. You can edit them before saving. No order is placed.'}</p><SaveScenario key={`${instrument.id}:${strategy ? best.kind : 'trend'}`} instrument={instrument} decision={sourceDecision} language={language} positionId={positionId} workflow /></details>}
    {available && !canSave && <p className={styles.note}>{ko ? '이 종목·가격 구조는 현물 가격 알림 저장을 지원하지 않습니다. 근거 확인과 기존 분석 기능은 계속 이용할 수 있습니다.' : 'This instrument or price structure does not support spot price-plan alerts. Analysis remains available.'}</p>}
    {!holding && <details><summary>{ko ? '전략 조건·거래 비용 확인' : 'Strategy conditions and costs'}</summary><CostControl language={language} value={cost.value} onChange={cost.change} /><p>{names[best.kind]}</p><ul>{best.checks.map(c => <li key={c.key}>{c.passed ? '✓' : '○'} {checkText(best, c.key, ko)}</li>)}</ul>{best.netRewardRisk !== null && <p>{ko ? '비용 차감 손익비' : 'Reward/risk after costs'} {best.netRewardRisk.toFixed(2)} : 1</p>}</details>}
    <p className={styles.note}>{instrument.marketId} · {instrument.quoteCurrency} · {ko ? `${decision.coverage}/3개 시간대 확인` : `${decision.coverage}/3 timeframes checked`}</p>
    {candleTimes.length > 0 && <details><summary>{ko ? '분석에 사용한 완료 봉 시각' : 'Closed-bar timestamps'}</summary><p className={styles.note}>{candleTimes.join(' · ')}</p></details>}
  </section>
}
