import type { AiAnalysisInput } from '@/types/aiAnalysis'

export interface LocalAiRequest { consent: true; symbol: string; language: 'ko' | 'en'; evidence: string; maxCostUsd?: number }
export interface LocalAiEstimate { reservedUsd: number; inputTokenCeiling: number; outputTokenCeiling: number }
export interface LocalAiResult { status: 'unverified-ai-explanation'; explanation: { summary: string; risks: string; missingEvidence: string }; confidence: null; disclaimer: string; reservedUsd: number }

export function buildLocalAiRequest(input: AiAnalysisInput, language: 'ko' | 'en'): LocalAiRequest {
  // Deliberate allowlist: no user notes, holdings, account data or mock forecasts.
  return { consent: true, symbol: input.instrument.symbol, language, evidence: JSON.stringify({
    symbol: input.instrument.symbol, market: input.instrument.marketId,
    requestedMode: input.marketContext.providerMode, liveContext: input.marketContext.isLive, contextPreparedAt: input.generatedAt,
    quoteStatus: input.quote.quoteStatus, quote: input.quote,
    news: { source: input.newsContext.evidenceLabel, scope: input.newsContext.evidenceScope,
      headlines: input.newsContext.relatedHeadlines.slice(0, 3).map(text => text.slice(0, 120)) },
    limitations: ['User supplied, not independently verified', 'May be stale', 'No portfolio context', 'No backtesting or probability model'],
  }) }
}

export class LocalAiError extends Error {
  constructor(readonly code: string) { super(code) }
}
const codes = new Set(['ai_disabled', 'local_ai_disabled', 'backend_unavailable', 'budget_exhausted', 'rate_limited', 'cost_limit_changed', 'invalid_input', 'provider_unavailable', 'analysis_unavailable', 'invalid_provider_response', 'budget_locked'])
export async function localAiCall(path: 'health' | 'estimate' | 'analyze', request?: LocalAiRequest, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(`/api/local-ai/${path}`, { method: path === 'health' ? 'GET' : 'POST',
    credentials: 'omit', cache: 'no-store', signal,
    ...(request ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) } : {}),
  })
  const raw = await response.text()
  if (raw.length > 32768) throw new LocalAiError('invalid_response')
  let data
  try { data = JSON.parse(raw) } catch { throw new LocalAiError('backend_unavailable') }
  if (!response.ok) throw new LocalAiError(codes.has(data?.error) ? data.error : 'backend_unavailable')
  return data
}
export function parseEstimate(data: unknown): LocalAiEstimate {
  const value = data as LocalAiEstimate | null
  if (!value || !Number.isFinite(value.reservedUsd) || value.reservedUsd <= 0 || value.reservedUsd > 10000 ||
    !Number.isSafeInteger(value.inputTokenCeiling) || value.inputTokenCeiling <= 0 || value.outputTokenCeiling !== 512) throw new LocalAiError('invalid_response')
  return value
}
export function parseLocalAiResult(data: unknown): LocalAiResult {
  const value = data as LocalAiResult | null
  if (!value || value.status !== 'unverified-ai-explanation' || value.confidence !== null ||
    typeof value.disclaimer !== 'string' || value.disclaimer.length > 1000 || !value.explanation ||
    !['summary', 'risks', 'missingEvidence'].every(key => {
      const text = value.explanation[key as keyof LocalAiResult['explanation']]
      return typeof text === 'string' && text.trim().length > 0 && text.length <= 2000
    }) || !Number.isFinite(value.reservedUsd) || value.reservedUsd <= 0) throw new LocalAiError('invalid_response')
  return value
}
