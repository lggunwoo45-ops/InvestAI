import type { Language } from '@/i18n/translations'
import styles from './BetaScopeBanner.module.css'

interface BetaScopeBannerProps { language: Language }

export function BetaScopeBanner({ language }: BetaScopeBannerProps) {
  return <aside className={styles.banner} aria-label={language === 'ko' ? 'Market Copilot 베타 범위' : 'Market Copilot Beta scope'}>
    <strong>Market Copilot Beta</strong><span aria-hidden="true">—</span><p>{language === 'ko' ? '투자 판단을 돕는 검토 도구입니다. 거래 지시, 자동매매, 수익 보장을 제공하지 않습니다.' : 'A review tool for investment decision support. It does not provide trade instructions, automated trading, or profit guarantees.'}</p>
  </aside>
}

