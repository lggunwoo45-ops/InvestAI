import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BetaScopeBanner } from './BetaScopeBanner'

describe('BetaScopeBanner', () => {
  it('renders the English beta boundary', () => {
    render(<BetaScopeBanner language="en" />)
    expect(screen.getByRole('complementary', { name: '1.5 Beta scope' }).textContent).toContain('Real AI and trading are not connected')
  })
  it('renders the Korean beta boundary', () => {
    render(<BetaScopeBanner language="ko" />)
    expect(screen.getByRole('complementary', { name: '1.5 베타 범위' }).textContent).toContain('주식 후보는 초기 베타')
  })
})

