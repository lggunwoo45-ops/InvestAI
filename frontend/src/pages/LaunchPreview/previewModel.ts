import type { CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import { decisionGuide } from '@/services/cryptoAnalysis/decisionGuide'
import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'

// Presentation choices only. Never use these values as account entitlements.
export type PreviewPlan = 'free' | 'premium'
export type PreviewView = 'analysis' | 'watchlist' | 'report' | 'plans'
export const previewPlan = (value: string | null): PreviewPlan => value === 'premium' ? 'premium' : 'free'
export function previewView(value: string | null): PreviewView {
  return value === 'watchlist' || value === 'report' || value === 'plans' ? value : 'analysis'
}

export interface PreviewReport {
  instrumentId: string
  symbol: string
  venue: string
  currency: string
  openedAt: number
  basisAt: number | null
  title: string
  reason: string
  next: string
  reassess: number | null
  plan: CryptoDecision['plan']
}

/** Freeze verified evidence for a clearly labelled rule-based report preview; no AI call. */
export function buildPreviewReport(instrument: MarketInstrument, decision: CryptoDecision, language: Language, now: number): PreviewReport | null {
  if (decision.direction === 'unavailable' || decision.price === null) return null
  const guide = decisionGuide(decision, language)
  const basisTimes = decision.frames.filter(frame => !frame.issue && frame.asOf !== null).map(frame => frame.asOf!)
  return {
    instrumentId: instrument.id, symbol: instrument.displaySymbol ?? instrument.symbol,
    venue: instrument.marketId, currency: instrument.quoteCurrency, openedAt: now,
    basisAt: basisTimes.length ? Math.max(...basisTimes) : null,
    title: guide.title, reason: guide.reason, next: guide.next,
    reassess: decision.plan ? decision.direction === 'sell' ? decision.plan.sellInvalidation : decision.plan.stop : null,
    plan: decision.plan ? { ...decision.plan, entry: [...decision.plan.entry], resistance: [...decision.plan.resistance] } : null,
  }
}
