import { fireEvent, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { buildEvidenceCandidateRecommendation as build } from '@/services/recommendation/evidenceCandidateRecommendation'
import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { MarketInstrument } from '@/types/market'
import { MyAnalysisReportSummary } from './MyAnalysisReportSummary'

const instrument: MarketInstrument = { id: 'test', marketId: 'upbit', symbol: 'TEST/KRW', name: 'Test', lastPrice: 100, change24hPercent: 1, volume24h: 1000, quoteCurrency: 'KRW' }
const analysis = buildMyInstrumentAnalysis({ instrument, language: 'ko', intent: 'watching', userNote: 'private', averagePrice: null, catalogSource: 'live', newsResult: null })
describe('My Analysis recommendation summary', () => {
  beforeEach(() => window.localStorage.clear())
  it.each([{ change: 1, title: '관심 유지' }, { change: 10, title: '이미 움직임 큼' }])('shows $title rather than a generic pending state', ({ change, title }) => {
    const recommendation = build({ instrument: { ...instrument, change24hPercent: change }, language: 'ko', dataQuality: 'live' })
    renderWithProviders(<MyAnalysisReportSummary analysis={analysis} recommendation={recommendation} language="ko" mode="simple" symbol={instrument.symbol} name={instrument.name} />)
    const report = screen.getByRole('region', { name: '분석 요약' })
    expect(within(report).getByText(title)).toBeTruthy()
    expect(report.textContent).not.toContain('판단 대기')
    expect(report.textContent).toContain(recommendation.nextCheck)
    expect(within(report).getByRole('list', { name: '판단 근거' })).toBeTruthy()
  })
  it('explains exactly which evidence is missing', () => {
    const recommendation = build({ instrument: { ...instrument, lastPrice: NaN, change24hPercent: NaN, volume24h: NaN }, language: 'ko', dataQuality: 'limited' })
    renderWithProviders(<MyAnalysisReportSummary analysis={analysis} recommendation={recommendation} language="ko" mode="simple" symbol={instrument.symbol} name={instrument.name} />)
    expect(screen.getByText('데이터 부족')).toBeTruthy()
    expect(screen.getByRole('region', { name: '분석 요약' }).textContent).toContain('현재 가격 확인 필요')
  })
  it('updates selected evidence and copies state and factors without private notes or forbidden wording', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    try {
      const props = { analysis, language: 'ko' as const, mode: 'simple' as const, symbol: instrument.symbol, name: instrument.name }
      const view = renderWithProviders(<MyAnalysisReportSummary {...props} recommendation={build({ instrument, language: 'ko', dataQuality: 'mock' })} />)
      view.rerender(<MyAnalysisReportSummary {...props} symbol="OTHER" recommendation={build({ instrument: { ...instrument, id: 'other', symbol: 'OTHER', change24hPercent: 10 }, language: 'ko', dataQuality: 'live' })} />)
      fireEvent.click(screen.getByRole('button', { name: '요약 복사' }))
      expect(await screen.findByText('요약을 복사했습니다')).toBeTruthy()
      const text = writeText.mock.calls[0][0] as string
      expect(text).toContain('이미 움직임 큼')
      expect(text).toContain('OTHER')
      expect(text).toContain('데이터 품질')
      expect(text).not.toMatch(/private|매수|매도|진입가|손절가|익절가|목표가|buy signal|sell signal|entry price|stop loss|take profit|target price/i)
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original)
      else Reflect.deleteProperty(navigator, 'clipboard')
    }
  })
})
