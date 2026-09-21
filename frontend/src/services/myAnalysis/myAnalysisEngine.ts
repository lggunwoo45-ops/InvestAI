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
    current: 'What is visible now', good: 'Points worth checking', caution: 'Risks and limits', next: 'Next review', evidence: 'Evidence board', missing: 'Missing evidence', checklist: 'Review checklist',
    price: 'Current market price is available.', change: 'Recent percentage movement is available for context.', volume: 'Reported market volume is available.', candidate: 'A deterministic watch-candidate record is available.', directNews: 'Explicitly related news is available.', marketNews: 'Only market-level news context is available.', noNews: 'No explicitly related news is available.', note: 'A user-provided note is included as personal context only.', average: 'The user supplied an average price as reference only; no gain/loss conclusion is calculated.',
    stockMock: 'Stock movement is simulated demo context and is not investment evidence.', filing: 'Regulatory filings are not connected.', earnings: 'Verified earnings data is not connected.', fundamentals: 'Verified financial fundamentals are not connected.', ratings: 'Analyst ratings and consensus are not connected.',
    verify: 'Verify primary-source market and company information before deciding.', revisit: 'Revisit this analysis when new evidence becomes available.', risk: 'Check downside risk and your own decision criteria.', disclaimer: 'Decision-support structure only. No real AI model is connected. Not investment advice; the user makes the final decision.',
  },
  ko: {
    qualities: { live: '실제 공개 시장 데이터', mock: '모의 / 데모 데이터', limited: '제한된 근거', unavailable: '데이터 이용 불가' },
    summary: '확보된 근거와 중요한 공백을 구조적으로 정리합니다. 예측이나 추천이 아닙니다.',
    current: '현재 확인되는 내용', good: '추가로 볼 항목', caution: '위험과 한계', next: '다음 확인', evidence: '근거 보드', missing: '부족한 근거', checklist: '검토 체크리스트',
    price: '현재 시장 가격을 확인할 수 있습니다.', change: '최근 등락률을 맥락 정보로 확인할 수 있습니다.', volume: '표시된 시장 거래량을 확인할 수 있습니다.', candidate: '결정론적 관찰 후보 기록이 있습니다.', directNews: '명시적으로 연결된 관련 뉴스가 있습니다.', marketNews: '시장 수준 뉴스 맥락만 있습니다.', noNews: '명시적으로 연결된 관련 뉴스가 없습니다.', note: '사용자가 작성한 메모를 개인 참고 맥락으로만 포함했습니다.', average: '사용자가 입력한 평균 가격은 참고값이며 손익 결론은 계산하지 않습니다.',
    stockMock: '주식 가격 움직임은 데모용 모의 맥락이며 투자 근거가 아닙니다.', filing: '공시 데이터가 연결되지 않았습니다.', earnings: '검증된 실적 데이터가 연결되지 않았습니다.', fundamentals: '검증된 재무·펀더멘털 데이터가 연결되지 않았습니다.', ratings: '애널리스트 평가와 컨센서스가 연결되지 않았습니다.',
    verify: '판단 전에 시장·기업의 1차 출처를 직접 확인하세요.', revisit: '새 근거가 생기면 이 분석을 다시 검토하세요.', risk: '하방 위험과 본인의 판단 기준을 확인하세요.', disclaimer: '의사결정 보조 구조일 뿐입니다. 실제 AI 모델은 연결되지 않았으며 투자 조언이 아닙니다. 최종 판단은 사용자가 합니다.',
  },
} as const

function item(id: string, type: MyAnalysisEvidence['type'], label: string, detail: string, level: MyAnalysisEvidence['level'], source: string): MyAnalysisEvidence {
  return { id, type, label, detail, level, source }
}

/** Pure and deterministic: this function never fetches data, calls an AI model, or issues a trading instruction. */
export function buildMyInstrumentAnalysis(input: MyAnalysisEngineInput): MyAnalysisResult {
  const t = text[input.language]
  const { instrument } = input
  const stock = instrument.marketId === 'korea-stock' || instrument.marketId === 'us-stock'
  const completePrice = finite(instrument.lastPrice) && finite(instrument.change24hPercent) && finite(instrument.volume24h)
  const dataQuality = !completePrice ? 'unavailable' : stock && input.catalogSource === 'mock' ? 'mock' : input.catalogSource === 'live' ? 'live' : 'limited'
  const relatedNews = newsForInstrument(input.newsResult?.articles ?? [], instrument).filter((article) => !article.isMock)
  const realMarketNews = (input.newsResult?.articles ?? []).filter((article) => !article.isMock)
  const evidence: MyAnalysisEvidence[] = []
  const missing: MyAnalysisEvidence[] = []

  if (finite(instrument.lastPrice)) evidence.push(item('price', 'price', input.language === 'ko' ? '가격' : 'Price', t.price, stock && dataQuality === 'mock' ? 'demo' : 'available', stock && dataQuality === 'mock' ? t.stockMock : input.catalogSource ?? 'catalog'))
  if (finite(instrument.change24hPercent)) evidence.push(item('change', 'change', input.language === 'ko' ? '등락' : 'Movement', stock && dataQuality === 'mock' ? t.stockMock : t.change, stock && dataQuality === 'mock' ? 'demo' : 'context', input.catalogSource ?? 'catalog'))
  if (finite(instrument.volume24h)) evidence.push(item('volume', 'volume', input.language === 'ko' ? '거래량' : 'Volume', t.volume, stock && dataQuality === 'mock' ? 'demo' : 'context', input.catalogSource ?? 'catalog'))
  if (input.candidate) evidence.push(item('candidate', 'candidate', input.language === 'ko' ? '관찰 후보' : 'Watch candidate', t.candidate, 'context', 'deterministic candidate engine'))
  if (relatedNews.length) evidence.push(item('news', 'news', input.language === 'ko' ? '관련 뉴스' : 'Related news', t.directNews, 'available', input.newsResult?.providerLabel ?? 'news provider'))
  else if (realMarketNews.length) evidence.push(item('market-news', 'market', input.language === 'ko' ? '시장 뉴스' : 'Market news', t.marketNews, 'context', input.newsResult?.providerLabel ?? 'news provider'))
  else missing.push(item('news-missing', 'news', input.language === 'ko' ? '관련 뉴스' : 'Related news', t.noNews, 'missing', 'not connected or not matched'))
  if (input.userNote.trim()) evidence.push(item('user-note', 'user-note', input.language === 'ko' ? '내 메모' : 'My note', t.note, 'context', 'user provided'))
  if (input.averagePrice !== null && finite(input.averagePrice)) evidence.push(item('average-price', 'user-note', input.language === 'ko' ? '평균 가격' : 'Average price', t.average, 'context', 'user provided'))

  if (stock) {
    missing.push(
      item('filing', 'filing', input.language === 'ko' ? '공시' : 'Filings', t.filing, 'missing', 'future stock provider'),
      item('earnings', 'earnings', input.language === 'ko' ? '실적' : 'Earnings', t.earnings, 'missing', 'future stock provider'),
      item('fundamentals', 'fundamentals', input.language === 'ko' ? '재무' : 'Fundamentals', t.fundamentals, 'missing', 'future stock provider'),
      item('ratings', 'ratings', input.language === 'ko' ? '평가' : 'Ratings', t.ratings, 'missing', 'future stock provider'),
    )
  }

  const visible = evidence.map((entry) => entry.detail)
  const risks = [stock && dataQuality === 'mock' ? t.stockMock : null, missing[0]?.detail, t.risk].filter((value): value is string => Boolean(value))
  return {
    instrumentId: instrument.id,
    assetType: stock ? 'stock' : 'crypto',
    dataQuality,
    dataQualityLabel: t.qualities[dataQuality],
    summary: t.summary,
    evidence,
    missingEvidence: missing,
    simpleModeSections: [
      { title: t.current, items: firstThree(visible.length ? visible : [t.summary]) },
      { title: t.good, items: firstThree([input.candidate?.watchReason, relatedNews[0]?.title, t.verify].filter((value): value is string => Boolean(value))) },
      { title: t.caution, items: firstThree(risks) },
    ],
    expertModeSections: [
      { title: t.evidence, items: evidence.map((entry) => `${entry.label}: ${entry.detail}`) },
      { title: t.missing, items: missing.map((entry) => `${entry.label}: ${entry.detail}`) },
      { title: t.checklist, items: [t.verify, t.risk, t.revisit] },
    ],
    disclaimer: t.disclaimer,
  }
}
