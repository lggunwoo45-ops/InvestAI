import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProductStatus } from './ProductStatus'
const mock = vi.hoisted(() => ({ request: vi.fn(), state: { enabled: true, error: '', opportunityTrialsAvailable: true, emailAvailable: false, telegramAvailable: false } }))
vi.mock('@/services/cloud/cloudClient', () => ({ cloudRequest: mock.request }))
vi.mock('@/services/cloud/useCloud', () => ({ useCloud: () => mock.state }))
describe('Public connection checks', () => {
  beforeEach(() => { mock.request.mockReset(); mock.state.error = '' })
  it('shows actual capabilities and only probes when requested', async () => {
    mock.request.mockResolvedValue({ enabled: true, opportunityTrialsAvailable: true, emailAvailable: true, telegramAvailable: false })
    render(<ProductStatus language="ko" />)
    expect(screen.getByText('이메일 인증·복구 · 준비 중')).toBeTruthy()
    expect(screen.getByText('추천 이후 가격 관찰 · 설정 연결됨')).toBeTruthy()
    expect(mock.request).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: '연결 상태 다시 확인' }))
    expect(await screen.findByText('이메일 인증·복구 · 설정 연결됨')).toBeTruthy()
    expect(screen.getByText('텔레그램 전달 · 준비 중')).toBeTruthy()
    expect(mock.request).toHaveBeenCalledExactlyOnceWith('/status')
  })
  it('clears stale success labels on failure and recovers after retry', async () => {
    mock.request.mockRejectedValueOnce(new Error('private upstream detail')).mockResolvedValueOnce({ enabled: true })
    render(<ProductStatus language="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Check connections' }))
    await waitFor(() => expect(screen.getByText('Account storage · Check required')).toBeTruthy())
    expect(screen.queryByText(/Configured/)).toBeNull()
    expect(screen.queryByText(/private upstream detail/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Check connections' }))
    expect(await screen.findByText('Account storage · Configured')).toBeTruthy()
    expect(screen.getByText('Forward price observation · Pending')).toBeTruthy()
  })
  it('rejects malformed status responses instead of claiming availability', async () => {
    mock.request.mockResolvedValue({ enabled: 'true', emailAvailable: true })
    render(<ProductStatus language="ko" />)
    fireEvent.click(screen.getByRole('button', { name: '연결 상태 다시 확인' }))
    expect(await screen.findByText('회원 기록 저장 · 확인 필요')).toBeTruthy()
  })
})
