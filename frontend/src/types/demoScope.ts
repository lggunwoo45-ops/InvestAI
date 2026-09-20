export type DemoCapabilityStatus = 'available' | 'beta' | 'limited' | 'planned' | 'locked' | 'notAvailable'
export type DemoCapabilityArea = 'marketRadar' | 'cryptoCandidates' | 'stockCandidates' | 'newsInsight' | 'aiUsage' | 'localFeedback' | 'paidPlans' | 'realAi' | 'trading'

export interface DemoCapability {
  area: DemoCapabilityArea
  title: string
  status: DemoCapabilityStatus
  summary: string
  whatWorks: readonly string[]
  limitations: readonly string[]
  nextMilestone: string
}

export interface DemoFlowStep {
  id: string
  title: string
  route: string
  summary: string
  talkingPoints: readonly string[]
  status: DemoCapabilityStatus
}

export interface DemoScopeSummary {
  versionLabel: string
  positioning: string
  capabilities: readonly DemoCapability[]
  demoFlow: readonly DemoFlowStep[]
  trustBoundaries: readonly string[]
}

