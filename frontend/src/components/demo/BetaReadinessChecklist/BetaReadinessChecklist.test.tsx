import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BetaReadinessChecklist } from './BetaReadinessChecklist'

describe('BetaReadinessChecklist', () => {
  it('shows delivered, optional, and deliberately disabled boundaries', () => {
    render(<BetaReadinessChecklist language="en" />)
    expect(screen.getByRole('heading', { name: 'Beta readiness' })).toBeTruthy()
    expect(screen.getByText('Candidate snapshots fixed')).toBeTruthy()
    expect(screen.getByText('DART evidence available for Korean stocks when configured')).toBeTruthy()
    expect(screen.getByText('Real AI disabled')).toBeTruthy()
  })
})
