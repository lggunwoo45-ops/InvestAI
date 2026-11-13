import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useExperience, type PreviewTier } from '@/app/experience/experienceContext'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { navigationSection, workspaceSections } from '@/app/navigation'
import { useLanguage } from '@/i18n/useLanguage'
import { useCompactLayout } from '@/hooks/useCompactLayout'
import styles from './WorkspaceExperience.module.css'

export function WorkspaceExperience() {
  const { tier, preview, setTier } = useExperience()
  const compact = useCompactLayout()
  const { language, setLanguage } = useLanguage(), ko = language === 'ko'
  const { setDisplayMode } = useDisplayMode()
  const location = useLocation(), query = new URLSearchParams(location.search)
  const requestedMode = query.get('display'), requestedLanguage = query.get('lang')
  useEffect(() => { if (requestedMode === 'simple' || requestedMode === 'expert') setDisplayMode(requestedMode) }, [requestedMode, setDisplayMode])
  useEffect(() => { if (requestedLanguage === 'ko' || requestedLanguage === 'en') setLanguage(requestedLanguage) }, [requestedLanguage, setLanguage])
  const labels: Record<PreviewTier, string> = ko ? { free: '무료', adfree: '광고 제거 · 4,900원', premium: '프리미엄 · 14,900원' } : { free: 'Free', adfree: 'Ad-free · KRW 4,900', premium: 'Premium · KRW 14,900' }
  const section = workspaceSections[navigationSection(location)] ?? []
  return <div className={styles.workspaceTools}>
    <details className={styles.planPicker} open={(!compact && preview) || undefined}>
      <summary><span className={styles.badge}>{preview ? 'PREVIEW' : 'BETA'}</span> {preview ? labels[tier] : ko ? '무료 베타' : 'Free beta'} <span>{ko ? '무료·프리미엄 비교' : 'Compare plans'} ▾</span></summary>
      <div className={styles.planBody}><div role="group" aria-label={ko ? '요금제 화면 체험' : 'Plan preview'}>{(['free', 'adfree', 'premium'] as const).map(value => <button type="button" key={value} aria-pressed={tier === value && preview} onClick={() => setTier(value)}>{labels[value]}</button>)}</div><p>{ko ? '출시 구성 체험 · 결제·회원권 변경 없음. AI는 아직 연결되지 않았으며 광고는 배치 예시입니다.' : 'Launch preview only. No purchase or entitlement changes. AI is not connected; ads are placement examples.'}</p>{preview && <button type="button" onClick={() => setTier(null)}>{ko ? '체험 종료' : 'Exit preview'}</button>}</div>
    </details>
    {section.length > 0 && <nav className={styles.sections} aria-label={ko ? '현재 메뉴의 기능' : 'Section navigation'}>{section.map(item => <Link key={item.path} to={item.path} aria-current={location.pathname.replace(/\/$/, '') === item.path.split('?')[0] && (!item.path.includes('?') || location.search.includes(item.path.split('?')[1])) ? 'page' : undefined}>{ko ? item.labelKo : item.label}</Link>)}</nav>}
  </div>
}

export function AdPlacement({ compact = false }: { compact?: boolean }) {
  const { tier, preview } = useExperience(), ko = useLanguage().language === 'ko'
  if (!preview || tier !== 'free') return null
  return <aside className={`${styles.ad} ${compact ? styles.compactAd : ''}`} aria-label={ko ? '광고 배치 예시' : 'Advertisement placement preview'}><span>AD · {ko ? '배치 예시' : 'PLACEMENT PREVIEW'}</span><strong>{ko ? '무료 이용을 지원하는 광고 공간' : 'An ad space supporting free access'}</strong><p>{ko ? '실제 광고는 연결 전입니다. 광고 제거·프리미엄에서는 이 영역이 사라집니다.' : 'No ad network is connected. This area disappears with Ad-free or Premium.'}</p></aside>
}
