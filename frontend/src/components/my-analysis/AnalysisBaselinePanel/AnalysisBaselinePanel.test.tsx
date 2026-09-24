import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AnalysisBaselinePanel } from './AnalysisBaselinePanel'

describe('AnalysisBaselinePanel', () => {
  it('keeps its price snapshot stable until refresh', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-24T00:00:00Z'))
    const { rerender } = render(<AnalysisBaselinePanel actionStatus="watchZone" currentPrice={100} instrumentId="btc" interestStage="first" language="en" quoteCurrency="USD" />)
    expect(screen.getAllByText('100 USD')).toHaveLength(2)
    rerender(<AnalysisBaselinePanel actionStatus="conditionalApproach" currentPrice={110} instrumentId="btc" interestStage="second" language="en" quoteCurrency="USD" />)
    expect(screen.getByText('+10 USD')).toBeTruthy()
    expect(screen.getByText('Watch zone')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh baseline' }))
    expect(screen.getAllByText('110 USD')).toHaveLength(2)
    expect(screen.getByText('Conditional approach possible')).toBeTruthy()
    vi.useRealTimers()
  })

  it('does not create a misleading baseline from an invalid price', () => {
    render(<AnalysisBaselinePanel actionStatus="waiting" currentPrice={Number.NaN} instrumentId="missing" interestStage="waiting" language="en" quoteCurrency="USD" />)
    expect(screen.getByRole('status').textContent).toContain('valid current price')
    expect((screen.getByRole('button', { name: 'Refresh baseline' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('initializes from a candidate snapshot and keeps it stable', () => {
    const initialSnapshot = { actionStatus: 'watchZone' as const, capturedAt: '2026-09-20T00:00:00Z', interestStage: 'first' as const, price: 90 }
    const { rerender } = render(<AnalysisBaselinePanel actionStatus="conditionalApproach" currentPrice={100} instrumentId="btc" interestStage="second" language="en" quoteCurrency="USD" initialSnapshot={initialSnapshot} />)
    expect(screen.getByText('90 USD')).toBeTruthy()
    expect(screen.getByText('+10 USD')).toBeTruthy()
    rerender(<AnalysisBaselinePanel actionStatus="conditionalApproach" currentPrice={110} instrumentId="btc" interestStage="second" language="en" quoteCurrency="USD" initialSnapshot={initialSnapshot} />)
    expect(screen.getByText('90 USD')).toBeTruthy()
    expect(screen.getByText('+20 USD')).toBeTruthy()
  })
})
