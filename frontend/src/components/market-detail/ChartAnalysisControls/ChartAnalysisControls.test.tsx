import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildTechnicalLevelAnalysis } from '@/services/technicalLevels/technicalLevelEngine'
import type { ChartOverlayVisibility, UserChartLine } from '@/types/chartOverlays'
import type { Language } from '@/i18n/translations'
import { ChartAnalysisControls } from './ChartAnalysisControls'

const baseVisibility: ChartOverlayVisibility = { supportResistance: true, movingAverage: true, fibonacci: false, user: true }
const analysis = (language: Language) => buildTechnicalLevelAnalysis({
  instrument: { id: 'btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 1, volume24h: 1_000 },
  candles: Array.from({ length: 60 }, (_, index) => ({ timestamp: Date.UTC(2026, 0, index + 1), open: 100, high: 108 + Math.sin(index), low: 92 + Math.sin(index), close: 100 + Math.sin(index), volume: 100 })),
  language,
  dataQuality: 'mock',
})

function Harness({ language = 'en' }: { language?: 'en' | 'ko' }) {
  const [active, setActive] = useState(false)
  const [visibility, setVisibility] = useState(baseVisibility)
  const [lines, setLines] = useState<readonly UserChartLine[]>([])
  return <ChartAnalysisControls
    language={language}
    analysisMode={active}
    visibility={visibility}
    availableCounts={{ supportResistance: 4, movingAverage: 3, fibonacci: 3, user: lines.length }}
    userLines={lines}
    technicalAnalysis={analysis(language)}
    currentPrice={101.25}
    onToggleAnalysisMode={() => setActive((value) => !value)}
    onToggleGroup={(group) => setVisibility((current) => ({ ...current, [group]: !current[group] }))}
    onAddLine={(input) => {
      const line: UserChartLine = { id: 'line-1', instrumentId: 'btc', ...input, createdAt: '2026-10-03T00:00:00.000Z', updatedAt: '2026-10-03T00:00:00.000Z', visible: true }
      setLines([line]); return line
    }}
    onUpdateLine={(id, input) => { setLines((current) => current.map((line) => line.id === id ? { ...line, ...input } : line)); return true }}
    onDeleteLine={(id) => setLines((current) => current.filter((line) => line.id !== id))}
    onSetLineVisible={(id, visible) => setLines((current) => current.map((line) => line.id === id ? { ...line, visible } : line))}
  />
}

describe('ChartAnalysisControls', () => {
  it('keeps chart review controls behind an explicit analysis mode', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Analysis mode' }))
    expect(screen.getByRole('button', { name: 'Exit analysis mode' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Support \/ resistance/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Fibonacci/ }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByText('Chart reference lines are review references, not trade instructions.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add horizontal line' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exit analysis mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Analysis mode' }))
    expect(screen.queryByLabelText('Line name')).toBeNull()
  })

  it('adds, edits, hides, and deletes a user reference line', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Analysis mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add horizontal line' }))
    fireEvent.change(screen.getByLabelText('Line name'), { target: { value: 'Range review' } })
    fireEvent.change(screen.getByLabelText('Line price'), { target: { value: '99.5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save line' }))
    expect(screen.getByText('Range review')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Edit selected line' }))
    fireEvent.change(screen.getByLabelText('Line name'), { target: { value: 'Updated review' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save line' }))
    expect(screen.getByText('Updated review')).toBeTruthy()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Show line: Updated review' }))
    expect((screen.getByRole('checkbox', { name: 'Show line: Updated review' }) as HTMLInputElement).checked).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Delete selected line' }))
    expect(screen.getByText('No user reference lines.')).toBeTruthy()
  })

  it('provides the required Korean actions and safety wording', () => {
    render(<Harness language="ko" />)
    fireEvent.click(screen.getByRole('button', { name: '분석 모드' }))
    expect(screen.getByRole('button', { name: '분석 모드 종료' })).toBeTruthy()
    expect(screen.getByRole('button', { name: '수평선 추가' })).toBeTruthy()
    expect(screen.getByText('차트 기준선은 거래 지시가 아니라 차트 검토 기준입니다.')).toBeTruthy()
  })

  it('does not invoke a disabled group with no calculated lines', () => {
    const onToggle = vi.fn()
    render(<ChartAnalysisControls language="en" analysisMode visibility={baseVisibility} availableCounts={{ supportResistance: 0, movingAverage: 0, fibonacci: 0, user: 0 }} userLines={[]} technicalAnalysis={analysis('en')} currentPrice={1} onToggleAnalysisMode={vi.fn()} onToggleGroup={onToggle} onAddLine={() => null} onUpdateLine={() => false} onDeleteLine={vi.fn()} onSetLineVisible={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Support \/ resistance/ }))
    expect(onToggle).not.toHaveBeenCalled()
  })

  it('uses the exact safe unavailable copy without fabricating price references', () => {
    const unavailable = buildTechnicalLevelAnalysis({
      instrument: { id: 'btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 0 },
      candles: [], language: 'en', dataQuality: 'unavailable',
    })
    render(<ChartAnalysisControls language="en" analysisMode={false} visibility={baseVisibility} availableCounts={{ supportResistance: 0, movingAverage: 0, fibonacci: 0, user: 0 }} userLines={[]} technicalAnalysis={unavailable} currentPrice={100} onToggleAnalysisMode={vi.fn()} onToggleGroup={vi.fn()} onAddLine={() => null} onUpdateLine={() => false} onDeleteLine={vi.fn()} onSetLineVisible={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toBe('Not enough data to calculate chart reference lines.')
  })

  it('uses the exact Korean unavailable copy', () => {
    const unavailable = buildTechnicalLevelAnalysis({
      instrument: { id: 'btc', marketId: 'upbit', symbol: 'BTC/KRW', name: 'Bitcoin', quoteCurrency: 'KRW', lastPrice: 100, change24hPercent: 0, volume24h: 0 },
      candles: [], language: 'ko', dataQuality: 'unavailable',
    })
    render(<ChartAnalysisControls language="ko" analysisMode={false} visibility={baseVisibility} availableCounts={{ supportResistance: 0, movingAverage: 0, fibonacci: 0, user: 0 }} userLines={[]} technicalAnalysis={unavailable} currentPrice={100} onToggleAnalysisMode={vi.fn()} onToggleGroup={vi.fn()} onAddLine={() => null} onUpdateLine={() => false} onDeleteLine={vi.fn()} onSetLineVisible={vi.fn()} />)
    expect(screen.getByRole('status').textContent).toBe('차트 기준선을 계산할 데이터가 부족합니다.')
  })
})
