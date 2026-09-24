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
})
