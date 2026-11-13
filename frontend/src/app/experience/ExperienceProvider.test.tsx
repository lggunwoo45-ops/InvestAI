import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Link, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ExperienceProvider } from './ExperienceProvider'
import { parsePreviewTier, useExperience } from './experienceContext'
function Probe() {
  const value = useExperience(), location = useLocation()
  return <><output>{`${value.tier}:${value.preview}:${value.chartTools}`}</output><pre>{location.pathname + location.search + location.hash}</pre><button onClick={() => value.setTier('premium')}>Premium</button><button onClick={() => value.setTier('adfree')}>Adfree</button><button onClick={() => value.setTier(null)}>Exit</button><Link to="/my-analysis?instrumentId=upbit-btc">Analysis</Link></>
}
describe('explicit plan previews', () => {
  it('preserves instrument parameters, hash and tier while navigating, with an explicit exit', () => {
    render(<MemoryRouter initialEntries={['/market?instrumentId=upbit-btc#chart']}><ExperienceProvider><Probe/></ExperienceProvider></MemoryRouter>)
    expect(screen.getByRole('status').textContent).toBe('free:false:false')
    fireEvent.click(screen.getByText('Premium'))
    expect(screen.getByText('/market?instrumentId=upbit-btc&planPreview=premium#chart')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('premium:true:true')
    fireEvent.click(screen.getByText('Analysis'))
    expect(screen.getByRole('status').textContent).toBe('premium:true:true')
    fireEvent.click(screen.getByText('Adfree'))
    expect(screen.getByRole('status').textContent).toBe('adfree:true:false')
    fireEvent.click(screen.getByText('Exit'))
    expect(screen.getByRole('status').textContent).toBe('free:false:false')
    expect(screen.getByText('/my-analysis?instrumentId=upbit-btc')).toBeTruthy()
  })
  it('only accepts known preview values', () => {
    expect(parsePreviewTier('premium')).toBe('premium')
    expect(parsePreviewTier('admin')).toBeNull()
  })
})
