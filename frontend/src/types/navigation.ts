export type NavigationIcon =
  | 'dashboard'
  | 'markets'
  | 'portfolio'
  | 'trading'
  | 'ai'
  | 'strategies'
  | 'news'
  | 'settings'

export interface NavigationItem {
  label: string
  path: string
  icon: NavigationIcon
}
