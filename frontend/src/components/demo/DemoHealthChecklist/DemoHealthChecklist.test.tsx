import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DemoHealthChecklist } from './DemoHealthChecklist'

describe('DemoHealthChecklist', () => {
  it('renders manual health checks without automatic claims', () => {
    render(<DemoHealthChecklist language="en" />)
    expect(screen.getByRole('heading', { name: 'Demo health checklist' })).toBeTruthy()
    expect(screen.getByText('News proxy running')).toBeTruthy()
    expect(screen.getByText(/no automatic terminal or service probing/)).toBeTruthy()
  })
  it('renders Korean checks', () => {
    render(<DemoHealthChecklist language="ko" />)
    expect(screen.getByRole('heading', { name: '데모 상태 체크리스트' })).toBeTruthy()
  })
})
