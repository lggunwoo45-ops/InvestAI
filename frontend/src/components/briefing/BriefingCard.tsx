import { Link } from 'react-router-dom'

import type { MarketBriefing, BriefingReference } from '@/types/briefing'
import type { NewsArticle } from '@/types/dashboard'
import type { Language } from '@/i18n/translations'
import { uiText } from '@/i18n/translations'
import styles from './BriefingCard.module.css'

interface BriefingCardProps {
  briefing: MarketBriefing
  language: Language
  news: readonly NewsArticle[]
  onOpenInstrument: (id: string) => void
  availableIds: ReadonlySet<string>
}

export function BriefingCard({ briefing, language, news, onOpenInstrument, availableIds }: BriefingCardProps) {
  const text = uiText[language].briefing
  const title = text[briefing.id]
  const groups: readonly { label: string; entries: readonly BriefingReference[] }[] = [
    { label: text.movers, entries: briefing.majorMovers },
    { label: text.gainers, entries: briefing.topGainers },
    { label: text.losers, entries: briefing.topLosers },
    { label: text.highVolume, entries: briefing.highVolume },
  ]

  return <section className={styles.card} aria-label={title}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>{briefing.id.toUpperCase()} / {text.simulated}</span><h2>{title}</h2></div>
      <span className={styles.demo}>{text.demo}</span>
    </header>
    <div className={styles.intro}>
      <div><span>{text.mood}</span><strong>{briefing.mood[language]}</strong></div>
      <div><span>{text.whyMatters}</span><p>{briefing.whyMatters[language]}</p></div>
    </div>
    <div className={styles.groups}>
      {groups.map((group) => <div key={group.label} className={styles.group}>
        <h3>{group.label}</h3>
        <div className={styles.references}>{group.entries.map((entry) => entry.instrumentId && availableIds.has(entry.instrumentId!)
          ? <button key={entry.label} type="button" onClick={() => onOpenInstrument(entry.instrumentId!)} title={text.openSymbol}>{entry.label} <span>↗</span></button>
          : <span key={entry.label} className={styles.disabled} title={text.noSymbol}>{entry.label}</span>)}</div>
      </div>)}
    </div>
    <div className={styles.bottom}>
      <section><h3>{text.watch}</h3><ul>{briefing.whatToWatch.map((item) => <li key={item.en}>{item[language]}</li>)}</ul></section>
      <section><h3>{text.relatedNews}</h3><ul>{news.map((item) => <li key={item.id}><Link to="/news" state={{ query: item.title }}>{item.title}</Link></li>)}</ul></section>
    </div>
  </section>
}
