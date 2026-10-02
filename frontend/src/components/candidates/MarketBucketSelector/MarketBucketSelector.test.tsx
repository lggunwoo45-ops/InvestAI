import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { MarketBucketId } from '@/types/marketBucket'
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

  it('uses roving tab focus and supports standard horizontal tab keys', () => {
    const onChange = vi.fn()
    function Harness() {
      const [selected, setSelected] = useState<MarketBucketId>('upbit')
      return <MarketBucketSelector selected={selected} language="en" onChange={(bucketId) => { onChange(bucketId); setSelected(bucketId) }} />
    }

    render(<Harness />)
    const tab = (name: string) => screen.getByRole('tab', { name }) as HTMLButtonElement
    expect(screen.getAllByRole('tab').map((item) => item.tabIndex)).toEqual([0, -1, -1, -1, -1])

    tab('Upbit').focus()
    fireEvent.keyDown(tab('Upbit'), { key: 'ArrowRight' })
    expect(document.activeElement).toBe(tab('Binance'))
    expect(tab('Binance').tabIndex).toBe(0)
    expect(tab('Upbit').tabIndex).toBe(-1)

    fireEvent.keyDown(tab('Binance'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tab('Upbit'))
    fireEvent.keyDown(tab('Upbit'), { key: 'ArrowLeft' })
    expect(document.activeElement).toBe(tab('US stocks'))
    fireEvent.keyDown(tab('US stocks'), { key: 'Home' })
    expect(document.activeElement).toBe(tab('Upbit'))
    fireEvent.keyDown(tab('Upbit'), { key: 'End' })
    expect(document.activeElement).toBe(tab('US stocks'))
    expect(onChange.mock.calls.map(([bucketId]) => bucketId)).toEqual(['binance', 'upbit', 'usStocks', 'upbit', 'usStocks'])
  })
})
