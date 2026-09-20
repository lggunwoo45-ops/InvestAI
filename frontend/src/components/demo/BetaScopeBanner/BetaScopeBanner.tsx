import type { Language } from '@/i18n/translations'
import styles from './BetaScopeBanner.module.css'

interface BetaScopeBannerProps { language: Language }

export function BetaScopeBanner({ language }: BetaScopeBannerProps) {
  return <aside className={styles.banner} aria-label={language === 'ko' ? '1.5 베타 범위' : '1.5 Beta scope'}>
    <strong>Market Copilot 1.5 Beta</strong><span aria-hidden="true">—</span><p>{language === 'ko' ? '코인 분석 흐름은 사용 가능하며, 주식 후보는 초기 베타입니다. 실제 AI와 거래 기능은 연결되지 않았습니다.' : 'Crypto workflow is available. Stock candidates are early beta. Real AI and trading are not connected.'}</p>
  </aside>
}

