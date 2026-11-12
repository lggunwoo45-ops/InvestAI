import type { Language } from '@/i18n/translations'
import type { NavigationItem } from '@/types/navigation'

export const productPageNames = {
  home: { ko: '홈', en: 'Home' },
  tools: { ko: '분석 도구', en: 'Analysis tools' },
  results: { ko: '검증 기록', en: 'Validation records' },
} as const

// One product map for desktop, phone and both display modes.
export const primaryNavigation: readonly NavigationItem[] = [
  { label: productPageNames.home.en, labelKo: productPageNames.home.ko, path: '/dashboard', icon: 'dashboard' },
  { label: 'Discover', labelKo: '종목 찾기', path: '/ai-analysis', icon: 'discover' },
  { label: 'Holdings', labelKo: '내 종목', path: '/portfolio', icon: 'portfolio' },
  { label: 'Alerts', labelKo: '알림', path: '/review-alerts', icon: 'alerts' },
  { label: productPageNames.results.en, labelKo: productPageNames.results.ko, path: '/results', icon: 'briefing' },
]
export const secondaryNavigation: readonly NavigationItem[] = [
  { label: productPageNames.tools.en, labelKo: productPageNames.tools.ko, path: '/tools', icon: 'strategies' },
  { label: 'Market', labelKo: '마켓', path: '/market', icon: 'markets' },
  { label: 'News', labelKo: '뉴스', path: '/news', icon: 'news' },
  { label: 'Guide', labelKo: '사용 가이드', path: '/demo', icon: 'demo' },
]
export const utilityNavigation: readonly NavigationItem[] = [
  { label: 'Plans', labelKo: '이용 플랜', path: '/plans', icon: 'settings' },
  { label: 'Settings', labelKo: '설정', path: '/settings', icon: 'settings' },
]
export const navigationLabel = (item: NavigationItem, language: Language) => language === 'ko' ? item.labelKo ?? item.label : item.label

/** Classify old bookmarks and contextual tools without activating two destinations. */
export function navigationSection(location: { pathname: string; search?: string; hash?: string }): string {
  const path = location.pathname.replace(/\/+$/, '') || '/dashboard'
  if (path === '/ai-analysis' && location.hash === '#opportunity-records') return '/results'
  if (path === '/ai-analysis' && location.hash === '#ai-usage-plans-title') return '/plans'
  if (path === '/research') {
    const mode = new URLSearchParams(location.search).get('mode')
    return mode === 'alerts' ? '/review-alerts' : mode === 'journal' ? '/results' : '/tools'
  }
  if (['/my-analysis', '/trading', '/strategies'].includes(path)) return '/tools'
  return ({ '/discover': '/ai-analysis', '/simple': '/dashboard', '/markets': '/market', '/briefing': '/news', '/guide': '/demo' } as Record<string, string>)[path] ?? path
}
