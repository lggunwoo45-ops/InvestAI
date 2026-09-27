import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BetaLimitationsPanel } from './BetaLimitationsPanel'

describe('BetaLimitationsPanel', () => {
  it('keeps the honest beta boundary collapsible', () => {
    render(<BetaLimitationsPanel language="en" />)
    expect(screen.getByText('Not included in this beta')).toBeTruthy()
    expect(screen.getByText('Automated trading')).toBeTruthy()
    expect(screen.getByText('Real AI summarization')).toBeTruthy()
  })
})
