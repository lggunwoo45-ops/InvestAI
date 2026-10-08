import { useLanguage } from '@/i18n/useLanguage'
import { marketExplorerText } from '@/pages/Market/marketExplorerConfig'
import type { MarketAssetMode } from '@/pages/Market/marketAssetMode'
import styles from './MarketAssetSwitcher.module.css'

interface MarketAssetSwitcherProps {
  activeMode: MarketAssetMode
  onChange: (mode: MarketAssetMode) => void
}

const modes: readonly MarketAssetMode[] = ['crypto', 'korea', 'us']

export function MarketAssetSwitcher({ activeMode, onChange }: MarketAssetSwitcherProps) {
  const { language } = useLanguage()
  const text = marketExplorerText[language]
  return <nav className={styles.switcher} aria-label={text.marketGroup} data-market-workspace-switcher>
    <span>{text.marketGroup}</span>
    <div role="tablist" aria-label={text.marketGroup}>
      {modes.map((mode) => <button key={mode} type="button" role="tab" aria-selected={activeMode === mode} onClick={() => onChange(mode)}>{text.group[mode]}</button>)}
    </div>
  </nav>
}
