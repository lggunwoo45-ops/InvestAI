import { fireEvent, screen } from '@testing-library/react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/renderWithProviders'
import { ResultsPage } from '@/pages/Results/ResultsPage'
import { AiAnalysisPage } from './AiAnalysisPage'

vi.mock('@/components/ai-analysis/LiveCandidateSearch', () => ({ LiveCandidateSearch: () => <h2>Search fixture</h2> }))
vi.mock('@/services/cryptoAnalysis/opportunityTrialRefresh', () => ({ refreshOpportunityTrials: vi.fn().mockResolvedValue(undefined) }))
function Location() { const location = useLocation(), navigate = useNavigate(); return <><output data-testid="location">{location.pathname + location.search + location.hash}</output><button onClick={() => navigate(-1)}>Back</button></> }
it('opens historical result bookmarks on the dedicated page, preserves query context and supports returning from discovery', () => {
  localStorage.clear()
  renderWithProviders(<><Routes><Route path="/" element={<Navigate to="/ai-analysis?source=saved#opportunity-records" replace />} /><Route path="/ai-analysis" element={<AiAnalysisPage />} /><Route path="/results" element={<ResultsPage />} /></Routes><Location /></>)
  expect(screen.getByTestId('location').textContent).toBe('/results?source=saved')
  expect(screen.getByRole('heading', { level: 1, name: 'Validation records' })).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'No candidates recorded yet' })).toBeTruthy()
  fireEvent.click(screen.getByRole('link', { name: 'Find new candidates →' }))
  expect(screen.getByTestId('location').textContent).toBe('/ai-analysis')
  expect(screen.getByRole('heading', { name: 'Search fixture' })).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Back' }))
  expect(screen.getByTestId('location').textContent).toBe('/results?source=saved')
  expect(screen.queryByRole('heading', { name: 'Search fixture' })).toBeNull()
})
