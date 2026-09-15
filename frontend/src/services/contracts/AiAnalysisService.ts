import type { AiModelDescriptor } from '@/types/platform'

export interface AiAnalysisRequest {
  assetId: string
  modelId: string
  strategyId?: string
}

export interface AiAnalysisResult {
  summary: string
  confidence: number
  /** Every AI recommendation must explain the evidence behind its confidence. */
  why: readonly string[]
  generatedAt: string
}

export interface AiAnalysisService {
  /** Model adapters normalize provider-specific responses into explainable results. */
  listModels(): Promise<readonly AiModelDescriptor[]>
  analyze(request: AiAnalysisRequest): Promise<AiAnalysisResult>
}
