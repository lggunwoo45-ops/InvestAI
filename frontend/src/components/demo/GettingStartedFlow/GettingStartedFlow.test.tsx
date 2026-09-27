import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { GettingStartedFlow } from './GettingStartedFlow'

describe('GettingStartedFlow', () => {
  it('shows the complete beta path and both CTAs', () => {
    render(<MemoryRouter><GettingStartedFlow language="en" /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(screen.getByText('Choose a market bucket in AI Analysis.')).toBeTruthy()
    expect(screen.getByText('Review today’s 5 interest candidates.')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Go to AI Analysis/ }).getAttribute('href')).toBe('/ai-analysis')
    expect(screen.getByRole('link', { name: /My Analysis/ }).getAttribute('href')).toBe('/my-analysis')
  })
})
