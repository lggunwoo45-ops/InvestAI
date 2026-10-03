import type { KeyboardEvent } from 'react'

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
  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buckets.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buckets.length) % buckets.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = buckets.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextBucket = buckets[nextIndex]
    onChange(nextBucket.id)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIndex]?.focus()
  }

  return <nav className={styles.tabs} role="tablist" aria-label={language === 'ko' ? '시장군 선택' : 'Market bucket selection'}>
    {buckets.map((bucket, index) => <button key={bucket.id} type="button" role="tab" aria-selected={selected === bucket.id} tabIndex={selected === bucket.id ? 0 : -1} title={bucket.description} onClick={() => onChange(bucket.id)} onKeyDown={(event) => moveSelection(event, index)}>{bucket.label}</button>)}
  </nav>
}
