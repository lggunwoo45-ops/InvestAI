import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { buildMyInstrumentAnalysis } from '@/services/myAnalysis/myAnalysisEngine'
import type { MarketInstrument } from '@/types/market'
import { MyAnalysisReportSummary } from './MyAnalysisReportSummary'

const instrument: MarketInstrument = { id: 'upbit-btc', marketId: 'upbit', marketType: 'upbit-krw', providerType: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 2, volume24h: 10_000 }

function analysis(language: 'en' | 'ko' = 'en') {
  return buildMyInstrumentAnalysis({ instrument, intent: 'watching', userNote: 'private note', averagePrice: 95, catalogSource: 'live', newsResult: null, language })
}

describe('MyAnalysisReportSummary', () => {
  it('renders the selected instrument, current state, data confidence, and copy control', () => {
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" />)
    const report = screen.getByRole('region', { name: 'Review summary' })
    expect(within(report).getByRole('heading', { name: 'Report summary' })).toBeTruthy()
    expect(report.textContent).toContain('BTC/KRW · Bitcoin')
    expect(report.textContent).toContain('Waiting / checking conditions')
    expect(report.textContent).toContain('Data confidence')
    expect(report.textContent).toContain('Live data')
    expect(within(report).getByRole('button', { name: 'Copy summary' })).toBeTruthy()
  })

  it('builds safe plain text without personal note, average price, or unsafe labels', () => {
    render(<MyAnalysisReportSummary analysis={analysis()} language="en" mode="simple" symbol="BTC/KRW" name="Bitcoin" />)
    const text = (screen.getByRole('textbox', { name: 'Plain-text summary' }) as HTMLTextAreaElement).value
    expect(text).toContain('Market Copilot review summary')
    expect(text).not.toContain('private note')
    expect(text).not.toContain('95')
    expect(text).not.toMatch(/buy signal|sell signal|entry price|stop loss|target price|take profit|guaranteed profit|profit expected/i)
  })

  it('copies when clipboard is available and renders Korean report labels', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(<MyAnalysisReportSummary analysis={analysis('ko')} language="ko" mode="simple" symbol="BTC/KRW" name="비트코인" />)
    const report = screen.getByRole('region', { name: '분석 요약' })
    expect(within(report).getByRole('heading', { name: '리포트 요약' })).toBeTruthy()
    expect(report.textContent).toContain('현재 상태')
    expect(report.textContent).toContain('데이터 신뢰 상태')
    fireEvent.click(within(report).getByRole('button', { name: '요약 복사' }))
    expect(await within(report).findByText('요약을 복사했습니다')).toBeTruthy()
    expect(writeText).toHaveBeenCalledOnce()
  })
})
