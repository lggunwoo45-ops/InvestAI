import type { CandidateFeedback, CandidateFeedbackMap, CandidateReviewStatus } from '@/types/candidateFeedback'

export const CANDIDATE_FEEDBACK_STORAGE_KEY = 'market-copilot.cryptoCandidateFeedback.v1'
export const CANDIDATE_FEEDBACK_SCHEMA_VERSION = 1
export const CANDIDATE_NOTE_MAX_LENGTH = 300

interface CandidateFeedbackPayload {
  schemaVersion: typeof CANDIDATE_FEEDBACK_SCHEMA_VERSION
  feedback: readonly CandidateFeedback[]
}

const statuses = new Set<CandidateReviewStatus>(['unreviewed', 'watching', 'reviewed', 'dismissed'])
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)

function isFeedback(value: unknown): value is CandidateFeedback {
  if (!isRecord(value)) return false
  return typeof value.instrumentId === 'string' && value.instrumentId.length > 0
    && typeof value.status === 'string' && statuses.has(value.status as CandidateReviewStatus)
    && typeof value.note === 'string' && value.note.length <= CANDIDATE_NOTE_MAX_LENGTH
    && typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt))
}

function isPayload(value: unknown): value is CandidateFeedbackPayload {
  return isRecord(value) && value.schemaVersion === CANDIDATE_FEEDBACK_SCHEMA_VERSION
    && Array.isArray(value.feedback) && value.feedback.every(isFeedback)
}

export function loadCandidateFeedback(storage: Pick<Storage, 'getItem' | 'removeItem'> = window.localStorage): CandidateFeedbackMap {
  try {
    const raw = storage.getItem(CANDIDATE_FEEDBACK_STORAGE_KEY)
    if (!raw) return {}
    const payload: unknown = JSON.parse(raw)
    if (!isPayload(payload)) throw new Error('Invalid candidate feedback payload')
    return Object.fromEntries(payload.feedback.map((item) => [item.instrumentId, item]))
  } catch {
    try { storage.removeItem(CANDIDATE_FEEDBACK_STORAGE_KEY) } catch { /* Storage cleanup must not break rendering. */ }
    return {}
  }
}

export function saveCandidateFeedback(feedback: CandidateFeedbackMap, storage: Pick<Storage, 'setItem'> = window.localStorage): void {
  const payload: CandidateFeedbackPayload = { schemaVersion: CANDIDATE_FEEDBACK_SCHEMA_VERSION, feedback: Object.values(feedback) }
  try { storage.setItem(CANDIDATE_FEEDBACK_STORAGE_KEY, JSON.stringify(payload)) } catch { /* Keep in-memory feedback usable. */ }
}

export function clearCandidateFeedback(storage: Pick<Storage, 'removeItem'> = window.localStorage): void {
  try { storage.removeItem(CANDIDATE_FEEDBACK_STORAGE_KEY) } catch { /* Reset remains safe when storage is unavailable. */ }
}
