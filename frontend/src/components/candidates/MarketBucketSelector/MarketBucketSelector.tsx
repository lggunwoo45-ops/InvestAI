import type { Language } from '@/i18n/translations'
import { getMarketBuckets, type MarketBucketId } from '@/types/marketBucket'
import styles from './MarketBucketSelector.module.css'

interface MarketBucketSelectorProps {
  selected: MarketBucketId
  language: Language
  onChange: (bucketId: MarketBucketId) => void
}

export function MarketBucketSelector({ selected, language, onChange }: MarketBucketSelectorProps) {
  const buckets = getMarketBuckets(language)
  return <nav className={styles.tabs} role="tablist" aria-label={language === 'ko' ? '시장군 선택' : 'Market bucket selection'}>
    {buckets.map((bucket) => <button key={bucket.id} type="button" role="tab" aria-selected={selected === bucket.id} title={bucket.description} onClick={() => onChange(bucket.id)}>{bucket.label}</button>)}
  </nav>
}
