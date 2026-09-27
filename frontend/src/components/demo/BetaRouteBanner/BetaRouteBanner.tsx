import { useLocation } from 'react-router-dom'

import { useLanguage } from '@/i18n/useLanguage'
import { BetaScopeBanner } from '../BetaScopeBanner/BetaScopeBanner'
import { betaBannerRoutes } from './betaRouteConfig'
import styles from './BetaRouteBanner.module.css'

export function BetaRouteBanner() {
  const { pathname } = useLocation()
  const { language } = useLanguage()
  if (!betaBannerRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return null
  return <div className={styles.slot}><BetaScopeBanner language={language} /></div>
}
