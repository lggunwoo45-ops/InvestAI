import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { betaBannerRoutes } from './betaRouteConfig'
import { BetaRouteBanner } from './BetaRouteBanner'

describe('BetaRouteBanner', () => {
  it.each(betaBannerRoutes)('renders on the key route %s', (route) => {
    render(<MemoryRouter initialEntries={[route]}><AppProviders><BetaRouteBanner /></AppProviders></MemoryRouter>)
    expect(screen.getByRole('complementary', { name: 'Market Copilot Beta scope' })).toBeTruthy()
  })

  it('stays out of secondary routes', () => {
    render(<MemoryRouter initialEntries={['/settings']}><AppProviders><BetaRouteBanner /></AppProviders></MemoryRouter>)
    expect(screen.queryByText('Market Copilot Beta')).toBeNull()
  })
})
