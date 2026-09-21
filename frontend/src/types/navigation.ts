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
  | 'demo'
  | 'simple'
  | 'settings'

export interface NavigationItem {
  label: string
  path: string
  icon: NavigationIcon
}
