import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Language } from '@/i18n/translations'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { rankSpotCandidates, type SpotCandidate } from '@/services/cryptoAnalysis/spotCandidates'
import { validOpportunityCost } from '@/services/cryptoAnalysis/opportunityEngine'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { checkText } from './opportunityPresentation'
import styles from './OpportunityPlans.module.css'
import candidateStyles from './SpotCandidateList.module.css'

function SpotCard({ candidate, rank, language, simple }: { candidate: SpotCandidate; rank: number; language: Language; simple: boolean }) {
  const { result, plan, phase, hasPricePlan } = candidate, { instrument, decision } = result, ko = language === 'ko'
  const price = (n: number) => `${formatAnalysisPrice(n, language)} ${instrument.quoteCurrency}`
  const signed = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}`
  const order = ['risk', 'structure', 'reward', 'heat', 'context', 'regime', 'recovery', 'price', 'close', 'volume']
  const pending = plan.checks.filter(c => !c.passed).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
  const reasons = ko ? {
    strength: ['상승 흐름', '단기와 큰 흐름이 함께 상승 쪽이에요. 눌림이나 돌파 후의 움직임을 우선 살펴봐요.'],
    rebound: ['반등 움직임', '큰 흐름은 하락이지만, 최근 3시간과 마지막 완료 봉에서 가격 회복을 포착했어요.'],
    momentum: ['단기 상승 포착', '큰 추세가 굳기 전, 최근 3시간과 마지막 완료 봉의 상승 움직임을 먼저 살펴봐요.'],
    pullback: ['상승 후 되돌림', '최근 3시간 동안 올랐지만 마지막 완료 봉에서는 되돌림이 나왔어요. 상승 움직임이 다시 이어지는지 확인할 후보예요.'],
    relative: ['상대 강세', '같은 마켓의 BTC보다 덜 내리거나 더 올랐어요. 가격 자체가 상승 중이라는 뜻은 아니에요.'],
    turnaround: ['반등 확인 대기', '아직 뚜렷한 상승·반등 근거는 없어요. 비교한 종목 중 다음 회복 여부를 먼저 확인할 후보예요.'],
  } : {
    strength: ['Upward trend', 'Short-term and higher-timeframe trends point up. Review pullbacks or follow-through after a breakout.'],
    rebound: ['Rebound movement', 'The broader trend is down, but the last three hours and latest closed bar show recovery.'],
    momentum: ['Early upward movement', 'Review upward movement in the last three hours and latest closed bar before a full trend forms.'],
    pullback: ['Pullback after a rise', 'The last three hours rose, but the latest closed bar pulled back. Watch whether the upward movement resumes.'],
    relative: ['Relative strength', 'Outperformed BTC in the same venue and quote. Both prices may still be falling.'],
    turnaround: ['Awaiting rebound evidence', 'No clear upward or rebound evidence yet. This is a relative priority for checking the next recovery.'],
  }
  return <article className={styles.card} data-opportunity={phase === 'ready' ? 'ready' : 'watch'}>
    <p className={candidateStyles.rank}>{ko ? `우선 후보 ${rank}` : `Review priority ${rank}`} · {reasons[candidate.reason][0]}</p>
    <header><h3>{instrument.displaySymbol ?? instrument.symbol}</h3><strong className={styles.badge}>{ko ? phase === 'ready' ? '진입 조건 충족' : phase === 'price-wait' ? '가격 도달 대기' : '추가 확인 필요' : phase === 'ready' ? 'Entry conditions met' : phase === 'price-wait' ? 'Waiting for price' : 'Needs confirmation'}</strong></header>
    <small>{instrument.marketId === 'upbit' ? 'Upbit' : 'Binance Spot'} · {instrument.quoteCurrency} · {new Date(result.analyzedAt).toLocaleTimeString(language)}</small>
    <div className={candidateStyles.reason}><strong>{ko ? '왜 살펴보나요?' : 'Why review this?'}</strong><p>{reasons[candidate.reason][1]}</p>
      <small>{ko ? '최근 3시간' : 'Last 3 closed hours'} {signed(candidate.change3h)}%{candidate.volumeRatio !== null && ` · ${ko ? '거래량' : 'Volume'} ${candidate.volumeRatio.toFixed(2)}×`}{candidate.relativeBitcoin !== null && ` · BTC ${ko ? '대비 6시간' : 'relative 6h'} ${signed(candidate.relativeBitcoin)}%p`}</small>
    </div>
    {candidate.countertrend && <p className={styles.caution}>{ko ? '큰 흐름은 아직 하락입니다. 반등을 먼저 살피는 역추세 후보이며 상승 전환이 확정된 것은 아니에요.' : 'The broader trend remains down. This is a countertrend observation, not a confirmed reversal.'}</p>}
    <p>{ko ? '현재 현물 가격' : 'Current spot price'} · {price(decision.price!)}</p>
    {hasPricePlan && plan.entry && plan.stop && plan.target ? <dl className={styles.prices}>
      <div><dt>{ko ? phase === 'ready' ? '진입 검토 구간' : '조건부 매수 구간' : phase === 'ready' ? 'Entry review zone' : 'Conditional buy zone'}</dt><dd>{plan.entry.map(n => formatAnalysisPrice(n, language)).join('–')} {instrument.quoteCurrency}</dd></div>
      <div><dt>{ko ? '손절 · 이 가격 아래로 내리면' : 'Stop reference'}</dt><dd>{price(plan.stop)}</dd></div>
      <div><dt>{ko ? '상승 목표 · 저항' : 'Observed resistance target'}</dt><dd>{price(plan.target)}</dd></div>
    </dl> : <div className={candidateStyles.reference}><span>{ko ? '단기 회복 확인 가격' : 'Short-term recovery reference'}</span><strong>{price(candidate.reassessPrice)}</strong>
      <p>{candidate.reassessConfirmed ? ko ? '최근 1시간봉은 이미 이 가격 위에서 마감했어요. 아래 남은 조건과 손절·목표 조합을 확인해야 해요.' : 'The latest hourly bar already closed above this reference. Remaining conditions and stop / target levels still need confirmation.' : ko ? '직전 3개 완료 봉의 고점입니다. 1시간봉이 이 가격 위에서 마감하면 반등·돌파 조건을 다시 확인해요.' : 'The high of the prior three closed bars. Reassess rebound / breakout conditions after an hourly close above it.'}</p>
      <small>{candidate.planDistant ? ko ? '기존 매수 구간이 멀어 가까운 단기 확인선을 먼저 보여드려요.' : 'The earlier entry zone is remote; review this nearer short-term reference first.' : ko ? '유효한 매수·손절·목표 조합이 아직 없어 관찰 가격만 표시합니다.' : 'No viable buy / stop / target combination yet; this is an observation reference.'}</small>
    </div>}
    {phase === 'price-wait' && candidate.distancePercent !== null && <p>{ko ? `매수 구간까지 ${candidate.distancePercent.toFixed(2)}% 차이 · 가격 도달 뒤에도 남은 조건을 확인하세요.` : `${candidate.distancePercent.toFixed(2)}% from the buy zone; check remaining conditions when reached.`}</p>}
    <p className={styles.next}>{phase === 'ready' ? ko ? '현재 계산상 진입 조건을 충족했어요. 주문 전 최신 가격과 손실 기준을 확인하세요.' : 'Entry conditions match this snapshot. Recheck price and planned loss before an order.'
      : <><strong>{ko ? '아직 매수 신호가 아니에요. ' : 'Not a buy signal yet. '}</strong>{ko ? '미충족 조건: ' : 'Unmet conditions: '}{pending.slice(0, 2).map(c => checkText(plan, c.key, ko)).join(' · ')}{pending.length > 2 && (ko ? ` 외 ${pending.length - 2}개` : ` + ${pending.length - 2} more`)}</>}</p>
    {hasPricePlan && plan.netRewardRisk !== null && <div className={styles.payoff}><strong>{ko ? '비용 반영 손익비' : 'Reward/risk after costs'} {plan.netRewardRisk.toFixed(2)}</strong><small>{ko ? `목표 도달 시 +${plan.netUpsidePercent?.toFixed(2)}% · 손절 시 −${plan.plannedLossPercent?.toFixed(2)}%` : `At target +${plan.netUpsidePercent?.toFixed(2)}% · at stop −${plan.plannedLossPercent?.toFixed(2)}%`}</small><small>{ko ? `${plan.priceBasis === 'current' ? '현재 가격' : '조건부 구간 상단'} 기준 · 매수·매도 총 예상 비용 ${plan.costPercent}%` : `${plan.priceBasis === 'current' ? 'Current price' : 'Upper entry edge'} · total buy/sell cost ${plan.costPercent}%`}</small></div>}
    <details open={!simple}><summary>{ko ? `분석 근거 · 남은 조건 ${pending.length}개` : `Evidence · ${pending.length} pending`}</summary><ul>{plan.checks.map(c => <li key={c.key}>{c.passed ? '✓' : '○'} {checkText(plan, c.key, ko)}</li>)}</ul></details>
    <Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '현재 분석·가격 알림' : 'Current analysis and price alerts'} →</Link>
  </article>
}

export function SpotCandidateList({ results, now, cost, language, simple }: { results: readonly ScanResult[]; now: number; cost: number; language: Language; simple: boolean }) {
  const [expanded, setExpanded] = useState(false), ko = language === 'ko'
  const candidates = rankSpotCandidates(results, now, cost), shown = candidates.slice(0, expanded ? undefined : 3)
  if (!validOpportunityCost(cost)) return null
  return <section aria-label={ko ? '현물 우선 후보' : 'Spot review shortlist'}>
    <h3 className={styles.groupTitle}>{ko ? `우선 후보 ${shown.length}개` : `Review shortlist · ${shown.length}`}</h3>
    <p>{ko ? '완전한 상승 추세를 기다리지 않고 단기 회복·상대 강세까지 비교합니다. 매수 조건이 아직 맞지 않아도 살펴볼 후보를 먼저 보여드려요.' : 'Compare early recovery and relative strength before a full uptrend forms. Review candidates can appear before buy conditions are met.'}</p>
    {shown.length ? <div className={styles.grid}>{shown.map((candidate, index) => <SpotCard key={candidate.result.instrument.id} candidate={candidate} rank={index + 1} language={language} simple={simple} />)}</div>
      : <p>{ko ? '후보를 비교할 최신 자료가 부족해요. 다시 검색하거나 아래 자료 상태를 확인하세요.' : 'Fresh data is insufficient to rank candidates. Rescan or review data status below.'}</p>}
    {candidates.length > 3 && <button type="button" onClick={() => setExpanded(v => !v)}>{ko ? expanded ? '우선 3개만 보기' : `후보 전체 보기 (${candidates.length}개)` : expanded ? 'Show top three' : `Show all candidates (${candidates.length})`}</button>}
    <details><summary>{ko ? '적극 탐색의 기준' : 'Active scan criteria'}</summary><p>{ko ? '완료된 1시간봉의 최근 3시간 움직임·회복, 같은 거래소와 통화의 BTC 대비 강약, 거래량, 진입 구간까지의 거리로 순위를 매깁니다. 모두 하락 중이면 아직 반등 근거가 약한 후보도 그렇게 표시해요. 가까운 매수 구간·손절·목표 조합이 없으면 직전 3개 봉 고점의 관찰 가격을 보여줍니다. 순위는 상승 확률이 아닙니다. 진입 조건 충족과 자동 검증 기록에는 기존 조건을 그대로 적용해요. 자료 부족·시세 만료 종목은 제외합니다. 현물 매수 방향의 분석이며 수신 후 최대 90초까지 유효합니다. 실제 주문은 실행하지 않습니다.' : 'Rank closed-hourly movement, recovery, same-venue and same-quote BTC relative strength, volume and entry distance. Weak rebound evidence stays explicit, even if every price is falling. Missing or remote price plans use an observed three-bar recovery reference. Ranks are not probabilities. Strict entry conditions and validation records are unchanged. Missing / expired data is excluded. These are spot buy-side observations, valid for up to 90 seconds after receipt. No orders are executed.'}</p></details>
  </section>
}
