import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import { buildDartDisclosureReview } from '@/services/dart/dartDisclosureReview'
import { dartMockResult } from '@/services/dart/dartFixtures'
import type { MarketInstrument } from '@/types/market'
import { MyAnalysisReportSummary } from './MyAnalysisReportSummary'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 10_000 }
const reviewScore = { score: 82, level: 'strong' as const, label: 'Strong', summary: 'Multiple factors.', factors: [], cautions: [] }

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
})
