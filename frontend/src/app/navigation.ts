import type { NavigationItem } from '@/types/navigation'

export const primaryNavigation: readonly NavigationItem[] = [
  { label: 'Market', path: '/market', icon: 'markets' },
  { label: 'Market Briefing', path: '/briefing', icon: 'briefing' },
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Discover', path: '/discover', icon: 'discover' },
  { label: 'Portfolio', path: '/portfolio', icon: 'portfolio' },
  { label: 'Trading', path: '/trading', icon: 'trading' },
  { label: 'AI Analysis', path: '/ai-analysis', icon: 'ai' },
  { label: 'Strategies', path: '/strategies', icon: 'strategies' },
  { label: 'News', path: '/news', icon: 'news' },
]

export const utilityNavigation: readonly NavigationItem[] = [
  { label: 'Settings', path: '/settings', icon: 'settings' },
]
