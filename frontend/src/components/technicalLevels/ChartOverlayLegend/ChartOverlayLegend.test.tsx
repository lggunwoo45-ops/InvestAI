import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ChartOverlayLine } from '@/types/technicalLevels'
import { ChartOverlayLegend } from './ChartOverlayLegend'

const line = (id: string, kind: ChartOverlayLine['kind'], label: string, price: number, visibleByDefault = true): ChartOverlayLine => ({ id, kind, label, price, strength: 'moderate', style: kind === 'movingAverage' ? 'dashed' : 'solid', visibleByDefault })
const lines: readonly ChartOverlayLine[] = [line('s1', 'support', 'Support reference 1', 100), line('s2', 'support', 'Support reference 2', 95), line('r1', 'resistance', 'Resistance reference 1', 120), line('ma5', 'movingAverage', 'MA 5', 110, false), line('ma20', 'movingAverage', 'MA 20', 108), line('current', 'currentPrice', 'Current price', 112), line('f1', 'fibonacci', 'Fibonacci 38.2%', 105, false)]

describe('ChartOverlayLegend', () => {
  it('shows a compact set of default planned references in Simple Mode without drawing a chart', () => {
    render(<ChartOverlayLegend status="ready" lines={lines} displayMode="simple" language="en" />)
    const legend = screen.getByRole('region', { name: 'Chart overlays' })
    expect(within(legend).getAllByRole('listitem')).toHaveLength(4)
    expect(legend.textContent).toContain('Planned overlay')
    expect(legend.textContent).not.toContain('Support reference 2')
    expect(legend.textContent).not.toContain('Fibonacci 38.2%')
    expect(legend.textContent).not.toContain('MA 5')
    expect(legend.textContent).toContain('MA 20')
    expect(legend.textContent).toContain('Chart review references, not trade instructions.')
    expect(document.querySelector('canvas')).toBeNull()
  })
  it('shows every planned line with strength context in Expert Mode', () => {
    render(<ChartOverlayLegend status="ready" lines={lines} displayMode="expert" language="en" />)
    const legend = screen.getByRole('region', { name: 'Chart overlays' })
    expect(within(legend).getAllByRole('listitem')).toHaveLength(7)
    expect(legend.textContent).toContain('Support reference 2')
    expect(legend.textContent).toContain('Fibonacci 38.2%')
    expect(legend.textContent).toContain('Moderate')
  })
  it('renders the exact Korean unavailable state and no prohibited wording', () => {
    render(<ChartOverlayLegend status="unavailable" lines={[]} displayMode="simple" language="ko" />)
    expect(screen.getByRole('status').textContent).toContain('차트 구조를 계산할 데이터가 부족합니다.')
    expect(document.body.textContent).not.toMatch(/매수|매도|손절가|익절가|목표가/)
  })
  it('does not present a loading overlay as unavailable', () => {
    render(<ChartOverlayLegend status="unavailable" lines={[]} displayMode="expert" language="en" isLoading />)
    const legend = screen.getByRole('region', { name: 'Chart overlays' })
    expect(legend.getAttribute('data-status')).toBe('loading')
    expect(screen.getByRole('status').textContent).toContain('Preparing overlay references')
  })
  it('does not round a micro-priced overlay to zero', () => {
    render(<ChartOverlayLegend status="ready" lines={[line('micro', 'support', 'Micro support', 0.00001234)]} displayMode="simple" language="en" />)
    expect(screen.getByText(/^0\.0+[1-9]/)).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
  })
})
