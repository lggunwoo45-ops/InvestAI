import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import { buildAiCopilotFinalRead, buildAiCopilotFinalReadEvidence } from '@/services/aiCopilot/aiCopilotFinalRead'
import { buildPracticalDecision } from '@/services/practicalDecision/practicalDecisionModel'
import { buildDartDisclosureReview } from '@/services/dart/dartDisclosureReview'
import { dartMockResult } from '@/services/dart/dartFixtures'
import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import { MyAnalysisReportSummary } from './MyAnalysisReportSummary'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 10_000 }
const reviewScore = { score: 82, level: 'strong' as const, label: 'Strong', summary: 'Multiple factors.', factors: [], cautions: [] }
const candles: Candle[] = Array.from({ length: 60 }, (_, index) => {
  const close = 96 + Math.sin(index / 3) * 2
  return { timestamp: 1_700_000_000_000 + index * 86_400_000, open: close - 0.2, high: close + 3, low: close - 3, close, volume: 100 + index }
})

function analysis(language: 'en' | 'ko' = 'en') {
  return buildMyInstrumentAnalysis({ instrument, intent: 'watching', userNote: 'private note', averagePrice: 95, catalogSource: 'live', newsResult: null, language })
}

describe('MyAnalysisReportSummary', () => {
  it('renders the selected instrument, current state, data confidence, and copy control', () => {
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" candidateReviewScore={reviewScore} />)
    const report = screen.getByRole('region', { name: 'Review summary' })
    expect(within(report).getByRole('heading', { name: 'Report summary' })).toBeTruthy()
    expect(report.textContent).toContain('BTC/KRW · Bitcoin')
    expect(report.textContent).toContain('Waiting / checking conditions')
    expect(report.textContent).toContain('Data confidence')
    expect(report.textContent).toContain('Live data')
    expect(report.textContent).toContain('Review score 82/100')
    expect(within(report).getByRole('button', { name: 'Copy summary' })).toBeTruthy()
  })

  it('builds safe plain text without personal note, average price, or unsafe labels', () => {
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" candidateReviewScore={reviewScore} />)
    const text = (screen.getByRole('textbox', { name: 'Plain-text summary' }) as HTMLTextAreaElement).value
    expect(text).toContain('Market Copilot review summary')
    expect(text).toContain('Current read:')
    expect(text).toContain('Next check:')
    expect(text).toContain('Review score: 82/100')
    expect(text).toContain('Caution: The score and ranges are decision-support information, not profit probability or trade instructions.')
    expect(text).not.toContain('private note')
    expect(text).not.toContain('95')
    expect(text).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit|guaranteed profit|profit expected/i)
  })

  it('copies when clipboard is available and renders Korean report labels', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<MyAnalysisReportSummary analysis={analysis('ko')} language="ko" mode="simple" symbol="BTC/KRW" name="비트코인" candidateReviewScore={{ ...reviewScore, label: '높음' }} />)
    const report = screen.getByRole('region', { name: '분석 요약' })
    expect(within(report).getByRole('heading', { name: '리포트 요약' })).toBeTruthy()
    expect(report.textContent).toContain('현재 상태')
    expect(report.textContent).toContain('데이터 신뢰 상태')
    fireEvent.click(within(report).getByRole('button', { name: '요약 복사' }))
    expect(await within(report).findByText('요약을 복사했습니다')).toBeTruthy()
    expect(writeText).toHaveBeenCalledOnce()
  })

  it('includes an available AI Copilot final review in the copied plain-text summary', () => {
    const practicalDecision = buildPracticalDecision({ language: 'en', horizon: 'short', dataQuality: 'live', actionStatus: 'watchZone', source: 'analysis' })
    const technicalAnalysis = buildTechnicalLevelAnalysis({ instrument, candles, language: 'en', dataQuality: 'live' })
    const finalRead = buildAiCopilotFinalRead({ language: 'en', practicalDecision, reviewScore, evidence: buildAiCopilotFinalReadEvidence({ instrument, candles, practicalDecision, reviewScore, technicalAnalysis, dataQuality: 'live' }) })
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" candidateReviewScore={reviewScore} aiCopilotFinalRead={finalRead} />)
    const text = (screen.getByRole('textbox', { name: 'Plain-text summary' }) as HTMLTextAreaElement).value
    expect(text).toContain('AI Copilot final review:')
    expect(text).toContain('Approach review possible')
    expect(text).toContain('Reason:')
    expect(text).toContain('Next check:')
    expect(text).toContain('Evidence:')
    expect(text).toContain('Decision-support information, not a trade instruction.')
  })

  it('switches the plain text to safe position context without including a personal note', () => {
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" reviewMode="position" basisPrice={95} currentPrice={100} quoteCurrency="KRW" candidateReviewScore={reviewScore} />)
    const text = (screen.getByRole('textbox', { name: 'Plain-text summary' }) as HTMLTextAreaElement).value
    expect(text).toContain('Current read: Re-check holding basis')
    expect(text).toContain('Approach review range:')
    expect(text).toContain('My basis price: 95 KRW')
    expect(text).toContain('Current price: 100 KRW')
    expect(text).not.toContain('private note')
    expect(text).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit/i)
  })

  it('adds a safe disclosure line without personal context or directional interpretation', () => {
    const disclosureReview = buildDartDisclosureReview(dartMockResult, 'en')
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="005930" name="Samsung Electronics" disclosureReview={disclosureReview} candidateReviewScore={reviewScore} />)
    const text = (screen.getByRole('textbox', { name: 'Plain-text summary' }) as HTMLTextAreaElement).value
    expect(text).toContain('Disclosure review: Correction or material disclosures are included, so the original disclosures should be checked.')
    expect(text).not.toContain('private note')
    expect(text).not.toMatch(/positive|negative|buy signal|sell signal|target price|stop loss|price impact/i)
  })

  it('adds available chart structure with first references and the exact technical safety note', () => {
    const technicalAnalysis = buildTechnicalLevelAnalysis({ instrument, candles, language: 'en', dataQuality: 'live' })
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" technicalAnalysis={technicalAnalysis} />)
    const text = (screen.getByRole('textbox', { name: 'Plain-text summary' }) as HTMLTextAreaElement).value
    expect(text).toContain('Chart structure: Rule-based technical references calculated from 60 recent valid candles.')
    expect(text).toContain(`First support: ${technicalAnalysis.levelSet.firstSupport?.priceLabel}`)
    expect(text).toContain(`First resistance: ${technicalAnalysis.levelSet.firstResistance?.priceLabel}`)
    expect(text).toContain('Technical levels are historical, rule-based reference areas. They are not order prices, trade instructions, or forecasts.')
    expect(text).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit|guaranteed profit/i)
  })

  it('does not invent technical prices when chart structure is unavailable', () => {
    const technicalAnalysis = buildTechnicalLevelAnalysis({ instrument, candles: [], language: 'ko', dataQuality: 'unavailable' })
    render(<MyAnalysisReportSummary analysis={analysis('ko')} language="ko" mode="simple" symbol="BTC/KRW" name="비트코인" technicalAnalysis={technicalAnalysis} />)
    const text = (screen.getByRole('textbox', { name: '일반 텍스트 요약' }) as HTMLTextAreaElement).value
    expect(text).toContain('차트 구조: 현재 데이터 소스를 사용할 수 없어 기술 참고 수준을 계산할 수 없습니다.')
    expect(text).toContain('기술적 수준은 과거 데이터 기반의 규칙형 참고 구간이며, 주문 가격이나 거래 지시 또는 예측이 아닙니다.')
    expect(text).not.toContain('1차 지지:')
    expect(text).not.toContain('1차 저항:')
  })
})
