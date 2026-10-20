import type { Language } from '@/i18n/translations'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'

export type EvidenceQuestion = 'summary' | 'prices' | 'risk' | 'news' | 'unsupported'
export function classifyQuestion(question: string): EvidenceQuestion {
  if (/뉴스|기사|news|headline/i.test(question)) return 'news'
  if (/손절|위험|리스크|risk|stop/i.test(question)) return 'risk'
  if (/가격|얼마|목표|구간|price|target|zone/i.test(question)) return 'prices'
  if (/요약|분석|방향|매수|매도|왜|summary|trend|buy|sell|why|analysis/i.test(question)) return 'summary'
  return 'unsupported'
}

/** Deterministic answers from inspected evidence only. No LLM, invented forecasts or account data. */
export function evidenceAnswer(kind: EvidenceQuestion, instrument: MarketInstrument, result: ScanResult | null, news: NewsLoadResult | null, language: Language, now: number): string {
  const ko = language === 'ko'
  if (kind === 'unsupported') return ko ? '현재는 선택 종목의 방향 요약, 가격 구간, 위험 기준, 관련 뉴스를 설명할 수 있습니다. 아래 질문을 선택해주세요. 자유 대화형 AI는 아직 연결되지 않았습니다.' : 'Choose direction, price zones, risk or related news for the selected asset. Free-form AI is not connected.'
  if (kind === 'news') {
    const readySources = new Set(news?.sources?.filter(source => source.state === 'ready').map(source => source.label))
    const fresh = news?.requestedMode !== 'live' || (news.checkedAt && now - Date.parse(news.checkedAt) <= 300000 && now - Date.parse(news.checkedAt) >= -300000)
    const articles = fresh ? newsForInstrument(news?.articles ?? [], instrument).filter(article => !article.isMock && (news?.requestedMode !== 'live' || readySources.has(article.source))).slice(0, 3) : []
    return articles.length ? articles.map(article => `${article.source} · ${new Date(article.publishedAt).toLocaleDateString(ko ? 'ko-KR' : 'en-US')}\n${article.title}`).join('\n\n') + (ko ? '\n\n기사 제목의 종목 연결입니다. 뉴스 센터에서 원문을 확인하세요.' : '\n\nExplicit headline matches. Open News Center for originals.')
      : ko ? '현재 수신한 실제 뉴스 중 이 종목과 명시적으로 연결된 기사를 확인하지 못했습니다. 이것이 관련 사건이 없다는 뜻은 아닙니다. 뉴스 센터의 연결 상태도 확인하세요.' : 'No current real headline explicitly matches this asset. This does not mean no relevant events exist. Check News Center connection status.'
  }
  if (!result || result.instrument.id !== instrument.id || now < result.analyzedAt || now > result.expiresAt || result.decision.direction === 'unavailable') {
    const issues = result?.decision.frames.filter(frame => frame.issue).map(frame => frame.frame).join(', ')
    return ko ? `현재 방향을 설명할 유효한 시세가 부족합니다.${issues ? ` 미확인 시간대: ${issues}.` : ''} 실제 시세와 완료 봉이 확보된 뒤 다시 질문해주세요. 데이터 부족은 매도 신호가 아닙니다.`
      : `Insufficient current evidence.${issues ? ` Unavailable frames: ${issues}.` : ''} Retry after quotes and closed bars arrive. Missing data is not a sell signal.`
  }
  const { decision } = result, plan = decision.plan
  const money = (value: number) => `${formatAnalysisPrice(value, language)} ${instrument.quoteCurrency}`
  const zone = (values: readonly number[]) => values.map(money).join(' – ')
  const direction = ko ? { buy: '매수 우세', sell: '매도 우세', neutral: '중립' } : { buy: 'Buy-side strength', sell: 'Sell-side strength', neutral: 'Neutral' }
  const summary = `${instrument.displaySymbol ?? instrument.symbol}: ${direction[decision.direction as keyof typeof direction]} (${decision.coverage}/3)\n${decision.frames.filter(frame => !frame.issue).map(frame => `${frame.frame}: ${direction[frame.direction]}`).join(' · ')}`
  if (kind === 'prices') return plan ? (ko ? `${plan.frame} 완료 봉 기준\n매수 관심 구간: ${zone(plan.entry)}\n반등 저항 구간: ${zone(plan.resistance)}\n매수 가정 해제: ${money(plan.stop)}\n관심 구간 중간값 손익비: ${plan.rewardRisk.toFixed(2)}\n${decision.direction === 'sell' ? '매도 우세입니다. 지지 가격에 닿았다는 이유만으로 매수하지 않고 반등과 회복을 확인하는 기준입니다.' : '관심 구간 진입만으로 매수를 뜻하지 않습니다. 지지 유지와 거래량을 함께 확인하는 기준입니다.'}`
    : `${plan.frame} closed-bar basis\nBuy watch zone: ${zone(plan.entry)}\nRebound resistance: ${zone(plan.resistance)}\nLong thesis invalidation: ${money(plan.stop)}\nMidpoint reward/risk: ${plan.rewardRisk.toFixed(2)}\nA zone touch alone is not an entry signal; verify support and participation.`)
    : ko ? '방향은 계산됐지만 가격 구간을 정할 지지·저항 구조가 부족합니다. 임의 목표가는 만들지 않습니다.' : 'Direction is available, but support/resistance is insufficient for a price plan.'
  const risks = [
    decision.mixed ? (ko ? '시간대별 방향이 충돌합니다.' : 'Timeframes disagree.') : '',
    decision.extended ? (ko ? '과열 또는 이격이 커 추격 매수에 주의할 구간입니다.' : 'Extended RSI or moving-average distance makes chasing risky.') : '',
    plan && plan.rewardRisk < 1.5 ? (ko ? '손익비가 1.5 미만입니다.' : 'Reward/risk is below 1.5.') : '',
    plan ? (ko ? `${plan.frame} 종가가 ${money(plan.stop)} 아래로 내려가면 매수 가정을 재검토하는 기준입니다.` : `A ${plan.frame} close below ${money(plan.stop)} invalidates the long thesis.`) : '',
  ].filter(Boolean)
  return `${summary}\n\n${risks.join('\n') || (ko ? '지지 유지와 거래량 변화를 계속 확인할 필요가 있습니다.' : 'Keep checking support and participation.')}\n\n${ko ? '규칙 기반 설명이며 수익 확률이나 주문 지시가 아닙니다. 수수료·세금·슬리피지는 제외했습니다.' : 'Rule-based explanation, not a profit probability or order. Fees, taxes and slippage are excluded.'}`
}
