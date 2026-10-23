import type { NavigationItem } from '@/types/navigation'

export const primaryNavigation: readonly NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'My Analysis', path: '/my-analysis', icon: 'analyze' },
  { label: 'My Investments', path: '/portfolio', icon: 'portfolio' },
  { label: 'AI Explore', path: '/ai-analysis', icon: 'ai' },
]

export const secondaryNavigation: readonly NavigationItem[] = [
  { label: 'Market & Risk Lab', path: '/research', icon: 'strategies' },
  { label: 'Market', path: '/market', icon: 'markets' },
  { label: 'News', path: '/news', icon: 'news' },
  { label: 'Demo', path: '/demo', icon: 'demo' },
]

export const utilityNavigation: readonly NavigationItem[] = [
  { label: 'Settings', path: '/settings', icon: 'settings' },
]
