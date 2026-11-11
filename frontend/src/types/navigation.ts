export type NavigationIcon =
  | 'dashboard'
  | 'markets'
  | 'portfolio'
  | 'trading'
  | 'ai'
  | 'analyze'
  | 'strategies'
  | 'news'
  | 'discover'
  | 'briefing'
  | 'demo'
  | 'settings'
  | 'alerts'

export interface NavigationItem {
  label: string
  labelKo?: string
  path: string
  icon: NavigationIcon
}
