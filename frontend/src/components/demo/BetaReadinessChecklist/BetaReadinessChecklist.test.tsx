import { render, screen } from '@testing-library/react'
import { describe, expect, it,vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { BetaReadinessChecklist } from './BetaReadinessChecklist'

const state=vi.hoisted(()=>({enabled:true,signup:true,opportunityTrialsAvailable:true,emailAvailable:false,telegramAvailable:false,expired:false,signupLimit:50}))
vi.mock('@/services/cloud/cloudClient',()=>({cloudSnapshot:()=>state,subscribeCloud:()=>()=>{}}))
describe('BetaReadinessChecklist', () => {
  it('shows delivered, optional, and deliberately disabled boundaries', () => {
    const view=render(<MemoryRouter><BetaReadinessChecklist language="en" /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Current availability' })).toBeTruthy()
    expect(screen.getByText('New account records continue with the app closed')).toBeTruthy()
    expect(screen.getByText('Not configured · retain your recovery code')).toBeTruthy()
    expect(screen.getByText('Notification service not configured')).toBeTruthy()
    expect(screen.queryByText('Auth disabled')).toBeNull()
    state.enabled=false
    view.rerender(<MemoryRouter><BetaReadinessChecklist language="en" /></MemoryRouter>)
    expect(screen.queryByText('New account records continue with the app closed')).toBeNull()
    expect(screen.getByText('Check server connection and login')).toBeTruthy()
  })
})
