import type { Language } from '@/i18n/translations'
import type { CryptoDecision } from './cryptoDecisionEngine'

/** Presentation only: keep the engine's direction, freshness and price rules unchanged. */
export function decisionGuide(decision: CryptoDecision, language: Language, holding = false) {
  const ko = language === 'ko'
  const { direction, action, plan } = decision
  if (direction === 'unavailable') {
    const mock = decision.frames.some(frame => frame.issue === 'mock')
    const loading = decision.frames.some(frame => frame.issue === 'loading')
    return {
      title: ko ? mock ? '예시 화면을 보고 있어요' : loading ? '분석 자료를 불러오고 있어요' : '지금은 분석할 자료가 부족해요'
        : mock ? 'You are viewing example data' : loading ? 'Loading the analysis data' : 'Analysis data is unavailable',
      reason: ko ? '가격 기록을 충분히 확인하지 못해요. 매수나 매도를 기다리라는 뜻은 아니에요.'
        : 'There is not enough verified price history. This is a data issue, not a signal to wait, buy or sell.',
      next: ko ? '아래 ‘자세히 보기’에서 연결 상태를 확인해주세요.' : 'Open the details to check the data connection.',
    }
  }
  const title = direction === 'sell'
    ? ko ? holding ? '추가 매수보다 보유 위험을 먼저 살펴보세요' : '새로 사기보다 하락이 멈추는지 기다려보세요'
      : holding ? 'Review the risk before adding more' : 'Wait for the decline to settle before buying'
    : action === 'pullback'
      ? ko ? '지금 따라 사기보다 가격이 내려오길 기다려보세요' : 'Wait for a lower price before adding'
      : action === 'poorReward'
        ? ko ? '더 유리한 가격이 올 때까지 기다려보세요' : 'Wait for a better balance of upside and downside'
        : action === 'entry'
          ? ko ? '가격이 더 떨어지지 않는지 먼저 확인하세요' : 'Check that the price is holding before considering a buy'
          : ko ? holding ? '추가 매수는 잠시 미루고 가격을 지켜보세요' : '방향이 뚜렷해질 때까지 기다려보세요'
            : holding ? 'Pause additional buying and watch the price' : 'Wait for a clearer direction'
  const reason = direction === 'sell'
    ? ko ? '확인한 가격 흐름에서 하락 쪽 힘이 더 강해요.' : 'The verified price trends lean downward.'
    : action === 'pullback'
      ? ko ? '상승 흐름이지만 가격이 많이 올랐거나, 살펴볼 가격 구간보다 높아요.' : 'The trend leans upward, but the price is extended or above the watch area.'
      : action === 'poorReward'
        ? ko ? '지금 계산한 오를 여지가 손실 위험에 비해 충분히 크지 않아요.' : 'The potential upside is small compared with the downside in this price plan.'
        : action === 'entry'
          ? ko ? '상승 흐름과 살펴볼 가격 구간이 겹쳐요. 이 가격에 닿았다는 이유만으로 사는 건 아니에요.' : 'The upward trend overlaps the watch area. A price touch alone does not confirm a buy.'
          : ko ? '시간대별 흐름이 엇갈리거나 한쪽 방향이 뚜렷하지 않아요.' : 'The timeframes disagree or do not show a clear direction.'
  const next = !plan
    ? ko ? '확인할 가격을 정하기에는 기록이 부족해요. 가격 흐름이 더 쌓이면 다시 살펴보세요.' : 'There is not enough structure for price levels. Review again when more evidence is available.'
    : direction === 'sell'
      ? ko ? '가격이 회복되는지와 보유 위험을 표시된 기준으로 확인하세요.' : 'Use the shown levels to review recovery and holding risk.'
      : ko ? '표시된 구간에서 가격이 더 떨어지지 않고 거래가 늘어나는지 확인하세요.' : 'Watch whether the price holds in the shown area and trading activity increases.'
  return { title, reason, next }
}

export const easyDirection = {
  ko: { buy: '상승 쪽이 강해요', sell: '하락 쪽이 강해요', neutral: '방향이 엇갈려요', unavailable: '자료 확인 필요' },
  en: { buy: 'Leaning upward', sell: 'Leaning downward', neutral: 'No clear direction', unavailable: 'Data unavailable' },
} as const
