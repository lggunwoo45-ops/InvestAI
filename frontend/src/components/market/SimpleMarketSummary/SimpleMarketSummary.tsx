import { uiText, type Language } from '@/i18n/translations'
import type { MarketRadarSnapshot } from '@/types/marketRadar'
import styles from './SimpleMarketSummary.module.css'

interface SimpleMarketSummaryProps {
  snapshot: MarketRadarSnapshot
  language: Language
}

export function SimpleMarketSummary({ snapshot, language }: SimpleMarketSummaryProps) {
  const text = uiText[language].displayMode
  const hasCaution = snapshot.volatilityRadar.some((signal) => signal.status === 'caution')
  const mood = hasCaution ? text.volatile : snapshot.unusualVolume.length || snapshot.watchCandidates.length ? text.active : snapshot.hotSectors.length ? text.calm : text.limitedData
  const watchArea = snapshot.watchCandidates[0]?.title ?? snapshot.hotSectors[0]?.title ?? text.needsReview
  const risk = snapshot.riskNotes[0] ?? text.needsReview
  const newsTheme = snapshot.newsThemes[0]?.title ?? text.limitedData
  const cards = [
    { label: text.marketMood, value: mood, state: hasCaution ? text.needsReview : snapshot.signals.length ? text.active : text.limitedData },
    { label: text.mainWatchArea, value: watchArea, state: snapshot.watchCandidates.length ? text.needsReview : text.earlyBeta },
    { label: text.riskToCheck, value: risk, state: text.needsReview },
    { label: text.newsTheme, value: newsTheme, state: snapshot.newsThemes.length ? text.needsReview : text.limitedData },
  ]

  return <section className={styles.summary} aria-labelledby="simple-market-summary-title">
    <header><span>{text.simpleFirst}</span><h2 id="simple-market-summary-title">{text.todaySummary}</h2></header>
    <div>{cards.map((card) => <article key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.state}</small></article>)}</div>
  </section>
}
