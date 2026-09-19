import { beforeEach, describe, expect, it } from 'vitest'

import { CANDIDATE_FEEDBACK_STORAGE_KEY, clearCandidateFeedback, loadCandidateFeedback, saveCandidateFeedback } from './candidateFeedbackStorage'

describe('candidate feedback storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves and restores statuses and notes', () => {
    saveCandidateFeedback({ btc: { instrumentId: 'btc', status: 'watching', note: 'Review volume', updatedAt: '2026-01-01T00:00:00.000Z' } })
    expect(loadCandidateFeedback()).toEqual({ btc: { instrumentId: 'btc', status: 'watching', note: 'Review volume', updatedAt: '2026-01-01T00:00:00.000Z' } })
  })

  it.each(['{"corrupted":true}', '"hello"', '42', '[{"instrumentId":"btc"}]', '{bad json'])('safely resets invalid storage: %s', (value) => {
    window.localStorage.setItem(CANDIDATE_FEEDBACK_STORAGE_KEY, value)
    expect(loadCandidateFeedback()).toEqual({})
    expect(window.localStorage.getItem(CANDIDATE_FEEDBACK_STORAGE_KEY)).toBeNull()
  })

  it('clears all stored feedback', () => {
    saveCandidateFeedback({ btc: { instrumentId: 'btc', status: 'reviewed', note: 'Done', updatedAt: '2026-01-01T00:00:00.000Z' } })
    clearCandidateFeedback()
    expect(loadCandidateFeedback()).toEqual({})
  })
})
