import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarketTerminalHeader } from './MarketTerminalHeader'

describe('MarketTerminalHeader', () => {
  it('renders the exploration identity and concise data provenance', () => {
    render(<MarketTerminalHeader bucketLabel="Upbit" dataState="live" snapshotStatus="today" language="en" />)
    const header = screen.getByLabelText('AI analysis terminal header')
    expect(within(header).getByRole('heading', { level: 1, name: 'AI Explore' })).toBeTruthy()
    expect(header.textContent).toContain('Today’s snapshot · Daily 08:00 basis')
    expect(header.textContent).toContain('Upbit')
    expect(header.textContent).toContain('Live')
  })

  it('renders Korean mock and pending states without changing the terminal heading hierarchy', () => {
    render(<MarketTerminalHeader bucketLabel="코스피" dataState="mock" snapshotStatus="pending" language="ko" />)
    const header = screen.getByLabelText('AI 분석 터미널 헤더')
    expect(within(header).getByRole('heading', { level: 1, name: 'AI 탐색' })).toBeTruthy()
    expect(header.textContent).toContain('기준 기록 준비 중 · 매일 08:00 기준')
    expect(header.textContent).toContain('코스피')
    expect(header.textContent).toContain('모의 / 제한')
  })
})
