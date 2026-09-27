import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MarketBucketSelector } from './MarketBucketSelector'

describe('MarketBucketSelector', () => {
  it('renders all English market bucket labels', () => {
    render(<MarketBucketSelector selected="upbit" language="en" onChange={vi.fn()} />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['Upbit', 'Binance', 'KOSPI', 'KOSDAQ', 'US stocks'])
  })

  it('renders all Korean market bucket labels', () => {
    render(<MarketBucketSelector selected="kosdaq" language="ko" onChange={vi.fn()} />)
    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual(['업비트', '바이낸스', '코스피', '코스닥', '미국주식'])
    expect(screen.getByRole('tab', { name: '코스닥' }).getAttribute('aria-selected')).toBe('true')
  })
})
