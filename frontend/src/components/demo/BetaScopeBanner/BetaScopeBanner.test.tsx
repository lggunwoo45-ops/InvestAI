import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BetaScopeBanner } from './BetaScopeBanner'

describe('BetaScopeBanner', () => {
  it('renders the English beta boundary', () => {
    render(<BetaScopeBanner language="en" />)
    expect(screen.getByRole('complementary', { name: 'Market Copilot Beta scope' }).textContent).toContain('does not provide trade instructions, automated trading, or profit guarantees')
  })
  it('renders the Korean beta boundary', () => {
    render(<BetaScopeBanner language="ko" />)
    expect(screen.getByRole('complementary', { name: 'Market Copilot 베타 범위' }).textContent).toContain('거래 지시, 자동매매, 수익 보장을 제공하지 않습니다')
  })
})

