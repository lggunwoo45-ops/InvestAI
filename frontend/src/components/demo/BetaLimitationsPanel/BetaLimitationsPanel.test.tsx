import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BetaLimitationsPanel } from './BetaLimitationsPanel'

describe('BetaLimitationsPanel', () => {
  it('keeps the honest beta boundary collapsible', () => {
    render(<BetaLimitationsPanel language="en" />)
    expect(screen.getByText('Limits of this free beta')).toBeTruthy()
    expect(screen.getByText('No automated trading or order execution')).toBeTruthy()
    expect(screen.getByText('No hosted conversational AI; current explanations use rules')).toBeTruthy()
    expect(screen.queryByText('Portfolio storage')).toBeNull()
  })
})
