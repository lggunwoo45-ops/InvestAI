import type { Language } from '@/i18n/translations'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { OpportunityPlan } from '@/services/cryptoAnalysis/opportunityEngine'
import type { FuturesPlan } from '@/services/cryptoAnalysis/futuresOpportunities'
import { actionCounts, type CandidateVerdict } from '@/services/cryptoAnalysis/candidateAction'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './OpportunityPlans.module.css'

interface Candidate {
  result: ScanResult
  plan: OpportunityPlan | FuturesPlan
  verdict: CandidateVerdict
  distancePercent: number | null
  reassessConfirmed: boolean
}

/** Concrete observed thresholds, shared by spot and futures; no inferred trade permission. */
export function CandidateDecision({ candidate, language }: { candidate: Candidate; language: Language }) {
  const ko = language === 'ko', { result, plan, verdict } = candidate, { decision, instrument } = result
  const hour = decision.frames.find(f => f.frame === '1H' && !f.issue)!
  const higher = decision.frames.find(f => f.frame === '4H' && !f.issue) ?? decision.frames.find(f => f.frame === '1D' && !f.issue)
  const short = 'side' in plan && plan.side === 'short'
  const price = (v: number) => `${formatAnalysisPrice(v, language)} ${instrument.quoteCurrency}`
  const zone = plan.entry ? plan.entry.map(n => formatAnalysisPrice(n, language)).join('–') + ` ${instrument.quoteCurrency}` : '—'
  const num = (n: number | null | undefined) => n == null ? '—' : n.toFixed(2)
  const trend = higher?.direction === 'buy' ? ko ? '상승' : 'up' : higher?.direction === 'sell' ? ko ? '하락' : 'down' : ko ? '중립' : 'neutral'
  let reason = '', next = ''
  switch (verdict.action) {
    case 'ready':
      reason = ko ? `현재가 ${price(decision.price!)}가 진입 구간 안에 있고, 마감봉·거래량·비용 반영 손익비 조건을 모두 충족했습니다.` : `The current quote ${price(decision.price!)} is inside the entry zone; closed-bar, volume and cost-adjusted reward/risk checks all pass.`
      next = ko ? `목표 ${price(plan.target!)} · 손절 ${price(plan.stop!)}. 이 가격 조합에서 진입을 검토할 수 있습니다.` : `Target ${price(plan.target!)} · stop ${price(plan.stop!)}. This snapshot qualifies for entry review.`
      break
    case 'price': {
      const retrace = plan.entry && (short ? decision.price! < plan.entry[0] : decision.price! > plan.entry[1])
      reason = ko ? `가격 외의 필수 안전 기준은 통과했습니다. 현재가는 진입 구간에서 ${num(candidate.distancePercent)}% 떨어져 있습니다.` : `The required risk gates pass. The quote is ${num(candidate.distancePercent)}% from the entry zone.`
      next = ko ? `${retrace ? short ? '급락을 따라가지 말고 반등' : '상승을 따라가지 말고 눌림' : '가격 도달'}을 기다릴 구간: ${zone}. 도달 시 마감봉·거래량도 함께 통과해야 합니다.` : `Wait for ${retrace ? 'a retracement' : 'price'} into ${zone}. Closed-bar and volume checks must also pass at that time.`
      break
    }
    case 'close': {
      const last = hour.candles.at(-1)!, prev = hour.candles.at(-2)!
      const zoneClose = plan.kind === 'pullback' || plan.kind === 'rejection'
      reason = ko ? `가격 구간은 맞지만 마지막 1시간봉의 ${short ? '하락' : '상승'} 마감 조건이 미충족입니다. 최근 종가 ${price(last.close)} · 직전 종가 ${price(prev.close)}.` : `Price is inside the zone, but the latest ${short ? 'bearish' : 'bullish'} hourly close is not confirmed. Latest close ${price(last.close)} · previous ${price(prev.close)}.`
      next = ko ? zoneClose ? `다음 완료 봉이 ${zone} 안에서 ${short ? '시가와 직전 종가보다 낮게' : '시가와 직전 종가보다 높게'} 마감해야 합니다.` : `다음 완료 봉이 ${price(plan.trigger!)} ${short ? '아래' : '위'}에서 ${short ? '하락' : '상승'} 마감해야 합니다.`
        : zoneClose ? `Next closed hourly bar must finish inside ${zone}, ${short ? 'below' : 'above'} its open and previous close.` : `Next closed hourly bar must finish ${short ? 'below' : 'above'} ${price(plan.trigger!)} with a ${short ? 'bearish' : 'bullish'} close.`
      break
    }
    case 'volume':
      reason = hour.volumeRatio === null ? ko ? '가격과 마감봉은 통과했지만 거래량 비교 기준을 계산할 수 없어 진입을 보류합니다.' : 'Price and close checks pass, but the volume baseline is unavailable, so entry remains on hold.'
        : ko ? `가격과 마감봉은 통과했습니다. 마지막 완료 봉 거래량은 이전 20봉 평균의 ${num(hour.volumeRatio)}배로, 기준 ${plan.volumeRequired}배에 못 미칩니다.` : `Price and close checks pass. Last closed-bar volume is ${num(hour.volumeRatio)}× its prior 20-bar average; ${plan.volumeRequired}× is required.`
      next = ko ? `새로 완료되는 1시간봉의 거래량이 그 직전 20봉 평균의 ${plan.volumeRequired}배 이상이어야 합니다. 나머지 조건도 모두 유지되면 진입 검토로 바뀝니다.` : `A newly closed hourly bar needs volume ≥${plan.volumeRequired}× its preceding 20-bar average. All remaining conditions must also pass for entry review.`
      break
    case 'recovery':
      reason = ko ? `가격·마감·거래량은 통과했지만 반등 회복 기준이 부족합니다. 현재 1시간 RSI ${num(hour.rsi)}.` : `Price, close and volume pass, but recovery evidence is incomplete. Hourly RSI ${num(hour.rsi)}.`
      next = ko ? '직전 RSI 45 이하에서 2 이상 회복하고, 현재 RSI 35~65 및 종가 상승을 함께 충족해야 합니다.' : 'RSI must recover by ≥2 from a prior value ≤45, finish at 35–65, and the close must rise.'
      break
    case 'context':
      reason = ko ? '가격·마감·거래량은 통과했지만 반대 체결 흐름 경고가 남아 있어 진입을 보류합니다.' : 'Price, close and volume pass, but opposing trade-flow cautions block entry.'
      next = ko ? '최신 체결 표본에서 반대 흐름 경고가 해소되고 가격 조건이 유지되는지 다음 검사에서 평가합니다.' : 'The next scan must show the opposing-flow caution cleared with the price setup intact.'
      break
    case 'excluded': {
      const reasons = ko ? {
        data:'판단에 필요한 최신 자료가 부족합니다.', risk:`현재가가 손절 기준 ${plan.stop ? price(plan.stop) : '—'}을 벗어났습니다.`,
        heat:`추격 진입을 제외합니다. 1시간 RSI ${num(hour.rsi)}, 현재가 ${price(decision.price!)}입니다.`,
        distance:`기존 진입 구간이 현재가에서 ${num(candidate.distancePercent)}% 떨어져 있어 이번 진입 계획으로 쓰지 않습니다.`,
        structure:plan.target === null ? '실제로 확인한 목표 저항·지지가 없어 유효한 진입·손절·목표 조합을 만들 수 없습니다.' : '확인된 진입·손절·목표 가격이 부족하거나 순서가 맞지 않아 이번 진입을 제외합니다.',
        reward:`비용 반영 손익비 ${num(plan.netRewardRisk)}로 최소 기준 1.50에 못 미칩니다.`,
        regime:`큰 흐름은 ${trend}이며 선택한 ${short ? '숏' : '매수'} 전략의 추세 기준을 통과하지 못했습니다.`,
      } : {
        data:'Fresh evidence is insufficient.', risk:`The quote has crossed the stop reference ${plan.stop ? price(plan.stop) : '—'}.`,
        heat:`Chasing is excluded. Hourly RSI ${num(hour.rsi)}; quote ${price(decision.price!)}.`,
        distance:`The previous entry zone is ${num(candidate.distancePercent)}% away and is excluded from the current entry plan.`,
        structure:plan.target === null ? 'No observed target supports a viable entry / stop / target plan.' : 'Observed entry / stop / target levels are incomplete or incorrectly ordered.',
        reward:`Reward/risk after costs is ${num(plan.netRewardRisk)}, below the required 1.50.`,
        regime:`The higher timeframe is ${trend}; this ${short ? 'short' : 'buy'} strategy fails its trend rule.`,
      }
      reason = reasons[verdict.exclusion ?? 'data']
      next = verdict.exclusion === 'heat' && hour.sma20 && hour.atr
        ? ko ? `재평가 기준: RSI ${short ? '30 초과' : '70 미만'}, 가격 ${price(hour.sma20 + (short ? -2 : 2) * hour.atr)} ${short ? '이상' : '이하'}, 최근 종가에서 이탈 폭 1.5 ATR 이내. 모두 회복해도 나머지 진입 기준을 다시 계산합니다.` : `Reassess when RSI is ${short ? '>30' : '<70'}, price is ${short ? '≥' : '≤'} ${price(hour.sma20 + (short ? -2 : 2) * hour.atr)}, and displacement from the last close is ≤1.5 ATR. All other entry rules still need to pass.`
        : ko ? '이번 검사에서는 새 진입을 제외합니다. 다음 검사에서 새 가격 구조와 나머지 조건을 다시 계산합니다.' : 'Exclude a new entry on this scan. A subsequent scan must recalculate the price structure and all remaining conditions.'
      if (verdict.exclusion === 'reward' && plan.target && plan.stop) {
        // Solve net reward / risk = 1.5 with the same round-trip cost on both outcomes.
        // This is a cost boundary, never a replacement entry zone or an observed level.
        const boundary = (plan.target + 1.5 * plan.stop) / (2.5 * (1 + (short ? -1 : 1) * plan.costPercent / 100))
        next = ko ? `현재 손절·목표를 고정하면 진입가 ${price(boundary)} ${short ? '이상' : '이하'}에서 손익비 1.5가 됩니다. 이 값은 비용 계산 경계이며, 새 진입 구간이나 진입 신호가 아닙니다.` : `With this stop and target fixed, entry ${short ? '≥' : '≤'} ${price(boundary)} gives reward/risk 1.5. This is a cost boundary, not a new entry zone or entry signal.`
      }
      if (verdict.exclusion === 'regime' && higher?.sma20 && higher.sma50 && higher.atr) {
        const bearish = short || plan.kind === 'rebound', margin = higher.atr * .1
        const closeBoundary = higher.sma20 + (bearish ? -margin : margin)
        const averageBoundary = higher.sma50 + (bearish ? -margin : margin)
        next = ko ? `${higher.frame} 추세 기준: 종가 ${price(closeBoundary)} ${bearish ? '미만' : '초과'}, 20봉 평균 ${price(averageBoundary)} ${bearish ? '미만' : '초과'} 조건을 함께 충족해야 합니다. 현재 종가 ${price(higher.close!)} · 20봉 평균 ${price(higher.sma20)}. 다른 시간대와 나머지 전략 조건도 다시 평가합니다.` : `${higher.frame} trend rule: close ${bearish ? '<' : '>'} ${price(closeBoundary)} and SMA20 ${bearish ? '<' : '>'} ${price(averageBoundary)} are both needed. Current close ${price(higher.close!)} · SMA20 ${price(higher.sma20)}. Other timeframes and strategy checks must also be reassessed.`
        if (!short && plan.kind === 'breakout') {
          next = ko ? `${higher.frame} 하락 판정 해소 기준: 종가 ${price(higher.sma20 - margin)} 이상 또는 20봉 평균 ${price(higher.sma50 - margin)} 이상. 현재 종가 ${price(higher.close!)} · 20봉 평균 ${price(higher.sma20)}. 해소 후 나머지 진입 조건을 다시 계산합니다.` : `Clear the ${higher.frame} downtrend: close ≥${price(higher.sma20 - margin)} or SMA20 ≥${price(higher.sma50 - margin)}. Current close ${price(higher.close!)} · SMA20 ${price(higher.sma20)}. Reassess the other entry conditions afterwards.`
        }
        if (!short && plan.kind === 'pullback') {
          const weights = { '1H':1, '4H':2, '1D':3 }, frames = decision.frames.filter(f => !f.issue)
          const score = frames.reduce((s, f) => s + (f.direction === 'buy' ? 1 : f.direction === 'sell' ? -1 : 0) * weights[f.frame], 0)
          const total = frames.reduce((s, f) => s + weights[f.frame], 0)
          next = ko ? `상승 추세 가중점수 ${score}/${total}, 필요 기준 ${total / 2}점 이상입니다. 1시간·4시간·하루 추세를 각각 1·2·3점으로 반영하며, 하락은 차감합니다. 상승 우세로 바뀌어도 가격·마감봉 등 나머지 조건을 다시 평가합니다.` : `Weighted trend score ${score}/${total}; at least ${total / 2} is required. Hourly / 4-hour / daily trends carry 1 / 2 / 3 points, with downtrends subtracting. All other entry rules must still pass after the trend turns bullish.`
        }
      }
      break
    }
  }
  return <div className={styles.decision} data-decision={verdict.action}>
    <strong>{ko ? '판단 이유' : 'Decision reason'}</strong><p>{reason}</p>
    <p><strong>{ko ? verdict.action === 'excluded' ? '다시 살펴볼 기준' : '지금 할 일' : verdict.action === 'excluded' ? 'Reassessment' : 'Next action'}</strong> · {next}</p>
    {verdict.action === 'excluded' && candidate.reassessConfirmed && <small>{ko ? '단기 확인선은 이미 돌파했지만 위 제외 기준이 우선입니다. 돌파했다는 이유만으로 진입을 허용하지 않습니다.' : 'The short-term reference was already crossed, but the exclusion above takes precedence over that breakout.'}</small>}
  </div>
}

export function CandidateScanSummary({ rows, language }: { rows: readonly { verdict: CandidateVerdict }[]; language: Language }) {
  const ko = language === 'ko', counts = actionCounts(rows)
  if (!counts.total) return null
  return <div className={styles.scanDecision} role="status">
    <strong>{ko ? counts.ready ? `지금 진입을 검토할 수 있는 종목 ${counts.ready}개` : counts.waiting ? '지금 신규 진입은 보류 · 기다릴 조건은 아래에 있습니다' : '이번 검사에서는 신규 진입을 제외합니다' : counts.ready ? `${counts.ready} assets qualify for entry review now` : counts.waiting ? 'Hold new entries now; review the concrete waiting conditions below' : 'No new entry qualifies on this scan'}</strong>
    <p>{ko ? `평가 ${counts.total}개 · 진입 검토 ${counts.ready}개 · 조건 대기 ${counts.waiting}개 · 진입 제외 ${counts.excluded}개` : `${counts.total} assessed · ${counts.ready} entry-ready · ${counts.waiting} waiting · ${counts.excluded} excluded`}</p>
    {!counts.ready && <small>{ko ? '현재 수신한 자료로 계산한 판단입니다. 대기와 제외를 구분하며, 제외 종목은 진입 추천 순위에 넣지 않습니다.' : 'Assessed using the received data. Waiting setups and exclusions are distinct; excluded assets are not entry recommendations.'}</small>}
  </div>
}
