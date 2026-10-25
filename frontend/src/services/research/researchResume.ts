import { researchAssets } from './researchModel'
import { readEvents, readJournalDraft, readObservations, readRules, type LocalEvent, type LocalRule, type ResearchObservation } from './researchJournal'

export interface ResearchResumeItem {
  asset: string
  draft: string
  review?: ResearchObservation
  rule?: LocalRule
  event?: LocalEvent
}

/** Group existing browser records by asset without fetching prices or starting a monitor. */
export function buildResearchResume(observations: readonly ResearchObservation[], rules: readonly LocalRule[], events: readonly LocalEvent[], drafts: Readonly<Record<string, string>>): ResearchResumeItem[] {
  const validTime = (at: number) => at > 0 && Number.isFinite(new Date(at).getTime())
  return researchAssets.map(asset => ({
    asset,
    draft: (drafts[asset] ?? '').trim(),
    review: observations.filter(row => row.asset === asset && validTime(row.at)).sort((a, b) => b.at - a.at)[0],
    rule: rules.find(row => row.asset === asset),
    event: events.filter(row => row.asset === asset && validTime(row.at)).sort((a, b) => b.at - a.at)[0],
  })).filter(item => item.draft || item.review || item.rule || item.event)
    .sort((a, b) => Number(Boolean(b.draft)) - Number(Boolean(a.draft))
      || Math.max(b.review?.at ?? 0, b.event?.at ?? 0) - Math.max(a.review?.at ?? 0, a.event?.at ?? 0)
      || a.asset.localeCompare(b.asset))
}

export function readResearchResume(): ResearchResumeItem[] {
  return buildResearchResume(readObservations(), readRules(), readEvents(), Object.fromEntries(researchAssets.map(asset => [asset, readJournalDraft(asset)])))
}
