import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemberAccount } from './MemberAccount'
import { signIn } from '@/services/cloud/cloudClient'
vi.mock('@/services/cloud/useCloud', () => ({ useCloud: () => ({ enabled: true, signup: true, user: null, conflicts: [], recovery: '', error: '' }) }))
vi.mock('@/services/cloud/cloudClient', async original => ({ ...await original<typeof import('@/services/cloud/cloudClient')>(), signIn: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); vi.mocked(signIn).mockResolvedValue(undefined) })
it('shows new rules on signup and recovery, validates composition and accepts exactly eight characters', async () => {
  render(<MemberAccount />)
  fireEvent.click(screen.getByRole('button', { name: '로그인·가입' }))
  fireEvent.click(screen.getByRole('button', { name: '처음 가입하기' }))
  const password = screen.getByLabelText(/^비밀번호/, { selector: 'input' })
  expect(password.getAttribute('minlength')).toBe('8')
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'newuser' } })
  fireEvent.change(password, { target: { value: 'abcdef1!' } })
  fireEvent.submit(screen.getByRole('button', { name: '계정 만들기' }).closest('form')!)
  expect(signIn).not.toHaveBeenCalled(); expect(screen.getByRole('alert').textContent).toContain('대문자')
  fireEvent.change(password, { target: { value: 'Abcdef1!' } })
  expect(within(screen.getByRole('list', { name: '비밀번호 조건' })).getAllByText(/충족/)).toHaveLength(4)
  fireEvent.click(screen.getByRole('button', { name: '계정 만들기' }))
  await waitFor(() => expect(signIn).toHaveBeenCalledWith('register', { username: 'newuser', password: 'Abcdef1!' }))
  fireEvent.click(screen.getByRole('button', { name: '비밀번호를 잊었어요' }))
  expect(screen.getByLabelText(/^새 비밀번호/).getAttribute('minlength')).toBe('8')
  expect(screen.getByText(/인증메일 발송은 준비 중/)).toBeTruthy()
})
it('does not apply new composition rules to existing-member login', async () => {
  render(<MemberAccount />); fireEvent.click(screen.getByRole('button', { name: '로그인·가입' }))
  fireEvent.change(screen.getByLabelText('아이디'), { target: { value: 'olduser' } })
  fireEvent.change(screen.getByLabelText(/^비밀번호/), { target: { value: 'previous-long-passphrase' } })
  fireEvent.submit(screen.getAllByRole('button', { name: '로그인' })[0].closest('form')!)
  await waitFor(() => expect(signIn).toHaveBeenCalledWith('login', { username: 'olduser', password: 'previous-long-passphrase' }))
  expect(screen.queryByRole('list', { name: '비밀번호 조건' })).toBeNull()
})
