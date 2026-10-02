import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MarketTerminalHeader } from './MarketTerminalHeader'

describe('MarketTerminalHeader', () => {
  it('renders the English terminal identity, active context, and safety boundary', () => {
    render(<MarketTerminalHeader bucketLabel="Upbit" displayedCount={4} excludedCount={2} dataState="live" snapshotStatus="today" bitcoinAnchorStatus="ready" language="en" />)
    const header = screen.getByLabelText('AI analysis terminal header')
    expect(within(header).getByRole('heading', { level: 1, name: 'Today’s interest candidates' })).toBeTruthy()
    expect(header.textContent).toContain('Today 08:00 basis · Today’s snapshot')
    expect(header.textContent).toContain('Market bucketUpbit')
    expect(header.textContent).toContain('Displayed4')
    expect(header.textContent).toContain('Excluded2')
    expect(header.textContent).toContain('BTC anchorReady')
    expect(header.textContent).toContain('Data stateLive')
    expect(header.textContent).toContain('Decision-support information, not a trade instruction or profit guarantee.')
  })

  it('renders Korean mock and pending states without changing the terminal heading hierarchy', () => {
    render(<MarketTerminalHeader bucketLabel="코스피" displayedCount={0} excludedCount={5} dataState="mock" snapshotStatus="pending" bitcoinAnchorStatus={null} language="ko" />)
    const header = screen.getByLabelText('AI 분석 터미널 헤더')
    expect(within(header).getByRole('heading', { level: 1, name: '오늘의 관심 후보' })).toBeTruthy()
    expect(header.textContent).toContain('오늘 08:00 기준 · 기준 기록 준비 중')
    expect(header.textContent).toContain('시장군코스피')
    expect(header.textContent).toContain('데이터 상태모의 / 제한')
    expect(header.textContent).toContain('판단 보조 정보이며, 거래 지시나 수익 보장이 아닙니다.')
  })
})
