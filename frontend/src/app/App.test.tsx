import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { App } from './App'

describe('InvestAI application shell', () => {
  beforeEach(() => window.history.pushState({}, '', '/'))

  it('opens the market workspace as the home page', async () => {
    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Market' })).toBeTruthy()
    expect(screen.getByRole('navigation', { name: 'Primary navigation' })).toBeTruthy()
    expect(screen.getByRole('complementary', { name: 'AI Copilot' })).toBeTruthy()
    expect(screen.getByRole('searchbox', { name: 'Global search' })).toBeTruthy()
  })
})
