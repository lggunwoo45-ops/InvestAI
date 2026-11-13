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
  { label: 'Market', labelKo: '마켓', path: '/market', icon: 'markets' },
  { label: 'Analysis', labelKo: '분석', path: '/my-analysis', icon: 'strategies' },
  { label: 'Holdings', labelKo: '내 종목', path: '/portfolio', icon: 'portfolio' },
  { label: 'Records & alerts', labelKo: '기록·알림', path: '/results', icon: 'briefing' },
]
export const secondaryNavigation: readonly NavigationItem[] = [
  { label: 'Discover', labelKo: '종목 찾기', path: '/ai-analysis', icon: 'discover' },
  { label: productPageNames.tools.en, labelKo: productPageNames.tools.ko, path: '/tools', icon: 'strategies' },
  { label: 'News', labelKo: '뉴스', path: '/news', icon: 'news' },
  { label: 'Guide', labelKo: '사용 가이드', path: '/demo', icon: 'demo' },
]
export const utilityNavigation: readonly NavigationItem[] = [
  { label: 'Plans', labelKo: '이용 플랜', path: '/plans', icon: 'settings' },
  { label: 'Settings', labelKo: '설정', path: '/settings', icon: 'settings' },
]
export const navigationLabel = (item: NavigationItem, language: Language) => language === 'ko' ? item.labelKo ?? item.label : item.label

export const workspaceSections: Record<string, readonly Pick<NavigationItem, 'path' | 'label' | 'labelKo'>[]> = {
  '/my-analysis': [
    { path: '/my-analysis', label: 'Asset analysis', labelKo: '종목 분석' },
    { path: '/research?mode=indicators', label: 'Market indicators', labelKo: '시장 지표' },
    { path: '/strategies', label: 'Strategy tests', labelKo: '과거 전략 시험' },
    { path: '/tools', label: 'All tools', labelKo: '전체 분석 도구' },
  ],
  '/results': [
    { path: '/results', label: 'Validation records', labelKo: '검증 기록' },
    { path: '/review-alerts', label: 'Price & condition alerts', labelKo: '가격·조건 알림' },
    { path: '/research?mode=journal', label: 'Review journal', labelKo: '검토 기록' },
  ],
  '/market': [{ path: '/market', label: 'Prices & charts', labelKo: '시세·차트' }, { path: '/ai-analysis', label: 'Discover', labelKo: '조건별 종목 찾기' }, { path: '/news', label: 'Market news', labelKo: '시장 뉴스' }],
}

/** Classify old bookmarks and contextual tools without activating two destinations. */
export function navigationSection(location: { pathname: string; search?: string; hash?: string }): string {
  const path = location.pathname.replace(/\/+$/, '') || '/dashboard'
  if (path === '/ai-analysis' && location.hash === '#opportunity-records') return '/results'
  if (path === '/ai-analysis' && location.hash === '#ai-usage-plans-title') return '/plans'
  if (path === '/research') {
    const mode = new URLSearchParams(location.search).get('mode')
    return mode === 'alerts' || mode === 'journal' ? '/results' : '/my-analysis'
  }
  if (path === '/review-alerts') return '/results'
  if (['/my-analysis', '/trading', '/strategies', '/tools'].includes(path)) return '/my-analysis'
  return ({ '/discover': '/ai-analysis', '/simple': '/dashboard', '/markets': '/market', '/briefing': '/news', '/guide': '/demo' } as Record<string, string>)[path] ?? path
}
