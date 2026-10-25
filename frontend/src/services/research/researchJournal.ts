import { numeric, object } from './researchModel'
import { researchStorage } from '@/services/cloud/cloudClient'

const KEY = 'investai.research.observations.v1'
export interface ResearchObservation { id: string; asset: string; at: number; price: number; funding: number | null; interest: number | null; volatility: number | null; signals: string[]; note: string }
export function readObservations(storage: Pick<Storage, 'getItem'> = researchStorage): ResearchObservation[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(KEY) ?? '[]')
    if (!Array.isArray(value)) return []
    return value.slice(0, 100).flatMap(entry => {
      const o = object(entry)
      if (typeof o.id !== 'string' || typeof o.asset !== 'string' || !/^[A-Z0-9]{2,12}$/.test(o.asset) || typeof o.at !== 'number' || !Number.isFinite(o.at) || o.at <= 0 || typeof o.price !== 'number' || !Number.isFinite(o.price) || o.price <= 0) return []
      return [{ id: o.id.slice(0, 100), asset: o.asset, at: o.at, price: o.price, funding: numeric(o.funding), interest: numeric(o.interest), volatility: numeric(o.volatility), signals: Array.isArray(o.signals) ? o.signals.filter((s): s is string => typeof s === 'string').slice(0, 10) : [], note: typeof o.note === 'string' ? o.note.slice(0, 1000) : '' }]
    }).sort((a, b) => b.at - a.at)
  } catch { return [] }
}
export function saveObservation(entry: ResearchObservation, storage: Pick<Storage, 'getItem' | 'setItem'> = researchStorage) {
  const entries = [entry, ...readObservations(storage)].slice(0, 100)
  storage.setItem(KEY, JSON.stringify(entries))
  return entries
}
const DRAFT_KEY = 'investai.research.draft.v1.'
export function readJournalDraft(asset: string): string {
  try { return (researchStorage.getItem(DRAFT_KEY + asset) ?? '').slice(0, 1000) } catch { return '' }
}
export function saveJournalDraft(asset: string, note: string) {
  if (note) researchStorage.setItem(DRAFT_KEY + asset, note.slice(0, 1000))
  else researchStorage.removeItem(DRAFT_KEY + asset)
}
export type ReviewContext = Pick<ResearchObservation, 'id' | 'at' | 'price' | 'note'>
function readReview(value: unknown): ReviewContext | undefined {
  const r = object(value)
  if (typeof r.id !== 'string' || typeof r.at !== 'number' || !Number.isFinite(r.at) || r.at <= 0 || typeof r.price !== 'number' || !Number.isFinite(r.price) || r.price <= 0) return undefined
  return { id: r.id.slice(0, 100), at: r.at, price: r.price, note: typeof r.note === 'string' ? r.note.slice(0, 1000) : '' }
}
export interface LocalRule { asset: string; above: number | null; below: number | null; review?: ReviewContext }
export interface LocalEvent { id: string; asset: string; at: number; price: number; kind: 'above' | 'below'; threshold?: number; review?: ReviewContext }
const RULE_KEY = 'investai.research.rules.v1', EVENT_KEY = 'investai.research.events.v1'
export function readRules(): LocalRule[] {
  try {
    const value: unknown = JSON.parse(researchStorage.getItem(RULE_KEY) ?? '[]')
    return Array.isArray(value) ? value.slice(0, 30).flatMap(v => { const o = object(v); const above = numeric(o.above), below = numeric(o.below); return typeof o.asset === 'string' && /^[A-Z0-9]{2,12}$/.test(o.asset) && (above === null || above > 0) && (below === null || below > 0) && (above !== null || below !== null) && (above === null || below === null || above > below) ? [{ asset: o.asset, above, below, review: readReview(o.review) }] : [] }) : []
  } catch { return [] }
}
export function saveRule(rule: LocalRule) { researchStorage.setItem(RULE_KEY, JSON.stringify([rule, ...readRules().filter(r => r.asset !== rule.asset)].slice(0, 30))) }
export function removeRule(asset: string) { researchStorage.setItem(RULE_KEY, JSON.stringify(readRules().filter(r => r.asset !== asset))) }
export function readEvents(): LocalEvent[] {
  try {
    const value: unknown = JSON.parse(researchStorage.getItem(EVENT_KEY) ?? '[]')
    return Array.isArray(value) ? value.slice(0, 100).flatMap(v => { const o = object(v); return typeof o.id === 'string' && typeof o.asset === 'string' && typeof o.at === 'number' && Number.isFinite(o.at) && typeof o.price === 'number' && Number.isFinite(o.price) && o.price > 0 && (o.kind === 'above' || o.kind === 'below') ? [{ id: o.id, asset: o.asset, at: o.at, price: o.price, kind: o.kind, threshold: (numeric(o.threshold) ?? 0) > 0 ? numeric(o.threshold)! : undefined, review: readReview(o.review) } as LocalEvent] : [] }) : []
  } catch { return [] }
}
/** Crossing only, not repeated alerts while the same condition remains true. */
export function checkRules(rules: readonly LocalRule[], asset: string, before: number | undefined, price: number, at: number): LocalEvent[] {
  if (!before || !Number.isFinite(before) || !Number.isFinite(price) || price <= 0) return []
  return rules.filter(rule => rule.asset === asset).flatMap(rule => {
    const kind = rule.above !== null && before < rule.above && price >= rule.above ? 'above' : rule.below !== null && before > rule.below && price <= rule.below ? 'below' : null
    return kind ? [{ id: `${asset}-${at}-${kind}`, asset, at, price, kind, threshold: rule[kind]!, review: rule.review }] : []
  })
}
export function saveEvents(events: readonly LocalEvent[]) {
  const merged = [...new Map([...readEvents(), ...events].map(event => [event.id, event])).values()].sort((a, b) => b.at - a.at).slice(0, 100)
  researchStorage.setItem(EVENT_KEY, JSON.stringify(merged))
  return merged
}
