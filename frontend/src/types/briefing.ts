import type { Language } from '@/i18n/translations'
import type { NewsMarket } from '@/types/dashboard'

export type LocalizedText = Record<Language, string>

export interface BriefingReference {
  label: string
  /** Optional stable internal ID; unresolvable references are deliberately non-interactive. */
  instrumentId?: string
}

export interface MarketBriefing {
  id: NewsMarket
  mood: LocalizedText
  whyMatters: LocalizedText
  majorMovers: readonly BriefingReference[]
  topGainers: readonly BriefingReference[]
  topLosers: readonly BriefingReference[]
  highVolume: readonly BriefingReference[]
  whatToWatch: readonly LocalizedText[]
  newsIds: readonly string[]
  source: 'mock'
}
