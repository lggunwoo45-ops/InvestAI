export type NavigationIcon =
  | 'dashboard'
  | 'markets'
  | 'portfolio'
  | 'trading'
  | 'ai'
  | 'strategies'
  | 'news'
  | 'discover'
  | 'briefing'
  | 'settings'

export interface NavigationItem {
  label: string
  path: string
  icon: NavigationIcon
}
