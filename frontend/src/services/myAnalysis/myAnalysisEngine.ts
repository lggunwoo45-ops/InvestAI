import type { Language } from '@/i18n/translations'
import { newsForInstrument } from '@/services/news/newsSelectors'
import type { NewsLoadResult } from '@/services/news/newsService'
import type { MyAnalysisEvidence, MyAnalysisInput, MyAnalysisResult } from '@/types/myAnalysis'
import type { WatchCandidate } from '@/types/watchCandidate'

export interface MyAnalysisEngineInput extends MyAnalysisInput {
  catalogSource: 'live' | 'mock' | null
  candidate?: WatchCandidate
  newsResult: NewsLoadResult | null
  language: Language
}

const finite = (value: number) => Number.isFinite(value)
const firstThree = (items: readonly string[]) => items.slice(0, 3)

const text = {
  en: {
    qualities: { live: 'Live public market data', mock: 'Mock / demo data', limited: 'Limited evidence', unavailable: 'Data unavailable' },
    summary: 'A structured review of available evidence and important gaps. It is not a prediction or recommendation.',
    current: 'What is visible now', good: 'Points worth checking', caution: 'Risks and limits', evidence: 'Evidence board', missing: 'Missing evidence', checklist: 'Review checklist',
    price: 'Current market value', change: '24H movement', volume: 'Reported volume', candidate: 'A deterministic watch-candidate record is available.', directNews: 'Related news is available from', marketNews: 'Only market-level news context is available from', noNews: 'No explicitly related news is available.',
    mockValue: 'Simulated market value is shown for workflow testing.', filing: 'Regulatory filings are not connected.', earnings: 'Verified earnings data is not connected.', fundamentals: 'Verified financial fundamentals are not connected.', ratings: 'Analyst ratings and consensus are not connected.',
    verify: 'Verify primary-source market and company information before deciding.', revisit: 'Revisit this analysis when new evidence becomes available.', risk: 'Check downside risk and your own decision criteria.', largeMove: 'Large recent move — review volatility before making any decision.', userNotice: 'User-provided context only. Not market evidence.', intentNotice: 'Review intent changes the checklist only. It does not produce personal advice.', disclaimer: 'Decision-support structure only. No real AI model is connected. Not investment advice; the user makes the final decision.',
    intents: { watching: 'Watching', holding: 'Holding', longTerm: 'Long-term review', swing: 'Swing review', shortTerm: 'Short-term review' },
    intentChecks: { watching: 'Check whether the asset remains relevant after new data.', holding: 'Review whether your original reason still holds.', longTerm: 'Recheck when filings, earnings, and fundamentals become available.', swing: 'Recheck movement and volume after large changes.', shortTerm: 'Recheck recent movement and news context before making any decision.' },
  },
  ko: {
    qualities: { live: '실제 공개 시장 데이터', mock: '모의 / 데모 데이터', limited: '제한된 근거', unavailable: '데이터 이용 불가' },
    summary: '확보된 근거와 중요한 공백을 구조적으로 정리합니다. 예측이나 추천이 아닙니다.',
    current: '현재 확인되는 내용', good: '추가로 볼 항목', caution: '위험과 한계', evidence: '근거 보드', missing: '부족한 근거', checklist: '검토 체크리스트',
    price: '현재 시장 값', change: '24시간 움직임', volume: '표시 거래량', candidate: '결정론적 관찰 후보 기록이 있습니다.', directNews: '관련 뉴스를 확인할 수 있는 출처', marketNews: '시장 수준 뉴스 맥락만 확인 가능한 출처', noNews: '명시적으로 연결된 관련 뉴스가 없습니다.',
    mockValue: '화면 흐름 확인을 위한 모의 시장 값입니다.', filing: '공시 데이터가 연결되지 않았습니다.', earnings: '검증된 실적 데이터가 연결되지 않았습니다.', fundamentals: '검증된 재무·펀더멘털 데이터가 연결되지 않았습니다.', ratings: '애널리스트 평가와 컨센서스가 연결되지 않았습니다.',
    verify: '판단 전에 시장·기업의 1차 출처를 직접 확인하세요.', revisit: '새 근거가 생기면 이 분석을 다시 검토하세요.', risk: '하방 위험과 본인의 판단 기준을 확인하세요.', largeMove: '최근 움직임이 큽니다. 판단 전 변동성을 확인하세요.', userNotice: '사용자 입력 참고값입니다. 시장 근거가 아닙니다.', intentNotice: '검토 목적은 체크리스트 문구만 바꾸며, 개인 투자 조언을 생성하지 않습니다.', disclaimer: '의사결정 보조 구조일 뿐입니다. 실제 AI 모델은 연결되지 않았으며 투자 조언이 아닙니다. 최종 판단은 사용자가 합니다.',
    intents: { watching: '관찰 중', holding: '보유 중', longTerm: '장기 검토', swing: '스윙 검토', shortTerm: '단기 검토' },
    intentChecks: { watching: '새 데이터가 나온 뒤에도 계속 살펴볼 이유가 있는지 확인하세요.', holding: '처음 검토한 이유가 여전히 유효한지 다시 확인하세요.', longTerm: '공시·실적·재무 데이터가 연결되면 다시 검토하세요.', swing: '큰 움직임 뒤 가격 변화와 거래량을 다시 확인하세요.', shortTerm: '판단 전에 최근 움직임과 뉴스 맥락을 다시 확인하세요.' },
  },
} as const

function item(id: string, type: MyAnalysisEvidence['type'], label: string, detail: string, level: MyAnalysisEvidence['level'], source: string): MyAnalysisEvidence {
  return { id, type, label, detail, level, source }
}

function number(value: number, language: Language, maximumFractionDigits = 2) {
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits }).format(value)
}

/** Pure and deterministic: this function never fetches, calls an AI model, or issues a trading instruction. */
export function buildMyInstrumentAnalysis(input: MyAnalysisEngineInput): MyAnalysisResult {
  const t = text[input.language]
  const { instrument } = input
  const stock = instrument.marketId === 'korea-stock' || instrument.marketId === 'us-stock'
  const completeMarketData = finite(instrument.lastPrice) && finite(instrument.change24hPercent) && finite(instrument.volume24h)
  const dataQuality = !completeMarketData ? 'unavailable' : input.catalogSource === 'mock' ? 'mock' : input.catalogSource === 'live' ? 'live' : 'limited'
  const mock = dataQuality === 'mock'
  const relatedNews = newsForInstrument(input.newsResult?.articles ?? [], instrument).filter((article) => !article.isMock)
  const realMarketNews = (input.newsResult?.articles ?? []).filter((article) => !article.isMock)
  const sourceLabel = input.newsResult?.providerLabel ?? (input.language === 'ko' ? '뉴스 제공자' : 'news provider')
  const evidence: MyAnalysisEvidence[] = []
  const missing: MyAnalysisEvidence[] = []
  const marketSource = mock ? (input.language === 'ko' ? '모의 카탈로그' : 'mock catalog') : input.catalogSource ?? 'catalog'
  const caveat = mock ? ` ${t.mockValue}` : ''

  if (finite(instrument.lastPrice)) evidence.push(item('price', 'price', input.language === 'ko' ? '가격' : 'Price', `${t.price}: ${number(instrument.lastPrice, input.language)} ${instrument.quoteCurrency}.${caveat}`, mock ? 'demo' : 'available', marketSource))
  if (finite(instrument.change24hPercent)) evidence.push(item('change', 'change', input.language === 'ko' ? '등락' : 'Movement', `${t.change}: ${instrument.change24hPercent >= 0 ? '+' : ''}${number(instrument.change24hPercent, input.language)}%.${caveat}`, mock ? 'demo' : 'context', marketSource))
  if (finite(instrument.volume24h)) evidence.push(item('volume', 'volume', input.language === 'ko' ? '거래량' : 'Volume', `${t.volume}: ${number(instrument.volume24h, input.language, 0)} ${instrument.quoteCurrency}.${caveat}`, mock ? 'demo' : 'context', marketSource))
  if (input.candidate) evidence.push(item('candidate', 'candidate', input.language === 'ko' ? '관찰 후보' : 'Watch candidate', t.candidate, 'context', input.language === 'ko' ? '결정론적 후보 엔진' : 'deterministic candidate engine'))
  if (relatedNews.length) evidence.push(item('news', 'news', input.language === 'ko' ? '관련 뉴스' : 'Related news', `${t.directNews} ${sourceLabel}.`, 'available', sourceLabel))
  else if (realMarketNews.length) evidence.push(item('market-news', 'market', input.language === 'ko' ? '시장 뉴스' : 'Market news', `${t.marketNews} ${sourceLabel}.`, 'context', sourceLabel))
  else missing.push(item('news-missing', 'news', input.language === 'ko' ? '관련 뉴스' : 'Related news', t.noNews, 'missing', input.language === 'ko' ? '연결 또는 일치 없음' : 'not connected or not matched'))

  if (stock) {
    missing.push(
      item('filing', 'filing', input.language === 'ko' ? '공시' : 'Filings', t.filing, 'missing', 'future stock provider'),
      item('earnings', 'earnings', input.language === 'ko' ? '실적' : 'Earnings', t.earnings, 'missing', 'future stock provider'),
      item('fundamentals', 'fundamentals', input.language === 'ko' ? '재무' : 'Fundamentals', t.fundamentals, 'missing', 'future stock provider'),
      item('ratings', 'ratings', input.language === 'ko' ? '평가' : 'Ratings', t.ratings, 'missing', 'future stock provider'),
    )
  }

  const movement = finite(instrument.change24hPercent) ? `${t.change}: ${instrument.change24hPercent >= 0 ? '+' : ''}${number(instrument.change24hPercent, input.language)}%` : null
  const risks = [mock ? t.mockValue : null, Math.abs(instrument.change24hPercent) >= 8 ? t.largeMove : null, input.candidate?.riskSummary, t.risk].filter((value): value is string => Boolean(value))
  const checklist = [t.intentChecks[input.intent], t.verify, t.revisit]
  return {
    instrumentId: instrument.id,
    assetType: stock ? 'stock' : 'crypto',
    dataQuality,
    dataQualityLabel: t.qualities[dataQuality],
    summary: t.summary,
    evidence,
    missingEvidence: missing,
    userContext: {
      intent: t.intents[input.intent],
      userNote: input.userNote.trim() || null,
      averagePrice: input.averagePrice !== null && finite(input.averagePrice) ? `${number(input.averagePrice, input.language)} ${instrument.quoteCurrency}` : null,
      notice: t.userNotice,
      intentNotice: t.intentNotice,
    },
    simpleModeSections: [
      { title: t.current, items: firstThree([movement, finite(instrument.lastPrice) ? `${t.price}: ${number(instrument.lastPrice, input.language)} ${instrument.quoteCurrency}` : null, mock ? t.mockValue : null].filter((value): value is string => Boolean(value))) },
      { title: t.good, items: firstThree([input.candidate?.watchReason, relatedNews.length ? `${t.directNews} ${sourceLabel}.` : null, t.verify].filter((value): value is string => Boolean(value))) },
      { title: t.caution, items: firstThree(risks) },
    ],
    expertModeSections: [
      { title: t.evidence, items: [] },
      { title: t.missing, items: [] },
      { title: t.checklist, items: checklist },
    ],
    disclaimer: t.disclaimer,
  }
}
