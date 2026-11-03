import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AiUsagePlans } from './AiUsagePlans'
const account = vi.hoisted(() => ({ user: null as null | { id: string } }))
vi.mock('@/services/cloud/useCloud', () => ({ useCloud: () => account }))
describe('Available plans', () => {
  beforeEach(() => { account.user = null })
  it('offers guest analysis without advertising purchasable credits or checkout', () => {
    render(<MemoryRouter><AiUsagePlans language="en" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Review without signing up →' }).getAttribute('href')).toBe('/my-analysis?instrumentId=upbit-btc')
    expect(screen.getByText('Not on sale')).toBeTruthy()
    expect(screen.getByText(/No paid entitlement or usable AI credits are currently sold/)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByRole('link', { name: 'Account and storage settings →' }).getAttribute('href')).toBe('/settings')
  })
  it('takes signed-in members directly to their records', () => {
    account.user = { id: 'member' }
    render(<MemoryRouter><AiUsagePlans language="ko" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: '내 검증 기록 보기 →' }).getAttribute('href')).toBe('/ai-analysis#opportunity-records')
    expect(screen.getByText(/추천 검증 기록 계정별 100건/)).toBeTruthy()
    expect(screen.getByText(/무료 베타가 자동으로 유료 전환되지 않습니다/)).toBeTruthy()
  })
})
