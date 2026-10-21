import { contextExplanation } from '@/services/cryptoAnalysis/marketContext'
import type { Language } from '@/i18n/translations'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MarketInstrument } from '@/types/market'
import { decisionGuide, easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'

export type EvidenceQuestion = 'summary' | 'prices' | 'risk' | 'news' | 'unsupported'
export function classifyQuestion(question: string): EvidenceQuestion {
  if (/뉴스|기사|news|headline/i.test(question)) return 'news'
  if (/손절|위험|리스크|risk|stop/i.test(question)) return 'risk'
  if (/가격|얼마|목표|구간|price|target|zone/i.test(question)) return 'prices'
  if (/요약|분석|방향|매수|매도|왜|어떻게|뭘|summary|trend|buy|sell|why|analysis/i.test(question)) return 'summary'
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
    return ko ? `지금은 분석할 가격 자료가 부족해요.${issues ? ` 미확인 시간대: ${issues}.` : ''} 가격 기록을 받은 뒤 다시 질문해주세요. 자료가 없는 것이 기다리거나 팔라는 뜻은 아니에요.`
      : `Insufficient current evidence.${issues ? ` Unavailable frames: ${issues}.` : ''} Retry after quotes and closed bars arrive. Missing data is not a sell signal.`
  }
  const { decision } = result, plan = decision.plan
  const money = (value: number) => `${formatAnalysisPrice(value, language)} ${instrument.quoteCurrency}`
  const zone = (values: readonly number[]) => values.map(money).join(' – ')
  const direction = ko ? easyDirection.ko : { buy: 'Buy-side strength', sell: 'Sell-side strength', neutral: 'Neutral' }
  const guide = decisionGuide(decision, language)
  const summary = ko ? `${instrument.displaySymbol ?? instrument.symbol}: ${easyDirection.ko[decision.direction]}\n${guide.title}\n${guide.reason}` : `${instrument.displaySymbol ?? instrument.symbol}: ${direction[decision.direction as keyof typeof direction]} (${decision.coverage}/3)\n${guide.title}\n${guide.reason}\n${decision.frames.filter(frame => !frame.issue).map(frame => `${frame.frame}: ${direction[frame.direction]}`).join(' · ')}`
  if (kind === 'prices') return plan ? `${contextExplanation(decision.context, ko)}\n` + (ko ? `${plan.frame} 완료 봉 기준\n다시 살펴볼 가격: ${zone(plan.entry)}\n오르다가 막힐 수 있는 가격: ${zone(plan.resistance)}\n더 내려가면 주의할 가격: ${money(plan.stop)}\n살펴볼 구간의 중간 가격에서 상승 여지 / 하락 위험 비율: ${plan.rewardRisk.toFixed(2)}\n${decision.direction === 'sell' ? '하락 쪽이 강해요. 이 가격에 닿았다는 이유만으로 사기보다 하락이 멈추는지 먼저 봐야 해요.' : '이 구간에 왔다고 바로 사라는 뜻은 아니에요. 가격이 더 떨어지지 않고 거래가 늘어나는지 함께 봐야 해요.'}`
    : `${plan.frame} closed-bar basis\nBuy watch zone: ${zone(plan.entry)}\nRebound resistance: ${zone(plan.resistance)}\nLong thesis invalidation: ${money(plan.stop)}\nMidpoint reward/risk: ${plan.rewardRisk.toFixed(2)}\nA zone touch alone is not an entry signal; verify support and participation.`)
    : ko ? '방향은 계산됐지만 가격 구간을 정할 지지·저항 구조가 부족합니다. 임의 목표가는 만들지 않습니다.' : 'Direction is available, but support/resistance is insufficient for a price plan.'
  const risks = [
    contextExplanation(decision.context, ko),
    decision.mixed ? (ko ? '짧게 볼 때와 길게 볼 때 가격 방향이 달라요.' : 'Timeframes disagree.') : '',
    decision.extended ? (ko ? '가격이 빠르게 올라 지금 따라 사는 것은 주의해야 해요.' : 'Extended RSI or moving-average distance makes chasing risky.') : '',
    plan && plan.rewardRisk < 1.5 ? (ko ? '계산한 상승 여지가 하락 위험의 1.5배보다 작아요.' : 'Reward/risk is below 1.5.') : '',
    plan ? (ko ? `${plan.frame} 단위의 마감 가격이 ${money(plan.stop)} 아래면 더 사도 될지 다시 판단해야 해요.` : `A ${plan.frame} close below ${money(plan.stop)} invalidates the long thesis.`) : '',
  ].filter(Boolean)
  return `${summary}\n\n${risks.join('\n') || (ko ? '가격이 더 떨어지지 않는지, 거래가 늘거나 줄었는지 함께 살펴보세요.' : 'Keep checking support and participation.')}\n\n${ko ? '가격 기록으로 계산한 참고 정보예요. 수익을 보장하지 않으며 거래 비용은 포함하지 않아요.' : 'Rule-based explanation, not a profit probability or order. Fees, taxes and slippage are excluded.'}`
}
