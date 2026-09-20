import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AiUsagePlans } from './AiUsagePlans'

describe('AiUsagePlans', () => {
  it('renders tier comparison, credit estimates, and planning safeguards', () => {
    render(<AiUsagePlans language="en" />)
    expect(screen.getByRole('heading', { name: 'AI Usage & Plans' })).toBeTruthy()
    expect(screen.getByText('Free', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('Basic', { selector: 'span' })).toBeTruthy()
    expect(screen.getByText('Pro', { selector: 'span' })).toBeTruthy()
    expect(screen.getAllByText(/No payment is processed/).length).toBeGreaterThan(0)
    expect(screen.getByText('Future usage estimates')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/guaranteed profit|AI will pick winners|unlimited AI is available/i)
  })

  it('renders Korean planning and cost-control labels', () => {
    render(<AiUsagePlans language="ko" />)
    expect(screen.getByRole('heading', { name: 'AI 사용량 및 플랜' })).toBeTruthy()
    expect(screen.getByText('계획 전용')).toBeTruthy()
    expect(screen.getByText(/결제는 처리되지 않습니다/)).toBeTruthy()
    expect(screen.getByText('향후 사용량 예상')).toBeTruthy()
  })
})
