import type { NavigationItem } from '@/types/navigation'

export const primaryNavigation: readonly NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Market', path: '/market', icon: 'markets' },
  { label: 'AI Analysis', path: '/ai-analysis', icon: 'ai' },
  { label: 'My Analysis', path: '/my-analysis', icon: 'analyze' },
  { label: 'News', path: '/news', icon: 'news' },
  { label: 'Demo', path: '/demo', icon: 'demo' },
]

export const utilityNavigation: readonly NavigationItem[] = [
  { label: 'Settings', path: '/settings', icon: 'settings' },
]
