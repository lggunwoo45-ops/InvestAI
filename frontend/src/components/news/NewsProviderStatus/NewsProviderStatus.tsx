import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import type { NewsLoadResult, NewsProviderMode } from '@/services/news/newsService'
import styles from './NewsProviderStatus.module.css'

interface NewsProviderStatusProps {
  mode: NewsProviderMode
  result: NewsLoadResult | null
  onModeChange: (mode: NewsProviderMode) => void
}

/** Requested provider and displayed data source are separate so fallback cannot look live. */
export function NewsProviderStatus({ mode, result, onModeChange }: NewsProviderStatusProps) {
  const { language } = useLanguage()
  const text = uiText[language].news.provider
  const stateLabel = result?.state === 'rss-unavailable' ? text.rssUnavailable
    : result?.state === 'provider-not-configured' ? text.notConfigured
      : result?.state === 'rss-ready' ? text.realRss : text.mock
  const reason = result?.error === 'network' ? text.networkError
    : result?.error === 'timeout' ? text.timeoutError
      : result?.error === 'http' ? text.httpError
        : result?.error === 'invalid-feed' ? text.invalidFeedError
          : result?.error === 'not-configured' || result?.error === 'provider-not-configured' ? text.notConfiguredError : text.unableToLoad

  return <section className={styles.panel} aria-label={text.title}>
    <div className={styles.top}>
      <span>{text.mode}</span>
      <div className={styles.modes} role="group" aria-label={text.title}>
        <button type="button" aria-pressed={mode === 'mock'} onClick={() => onModeChange('mock')}>{text.mock}</button>
        <button type="button" aria-pressed={mode === 'rss-ready'} onClick={() => onModeChange('rss-ready')}>{text.rssReady}</button>
      </div>
      <strong role="status">{result ? stateLabel : uiText[language].news.loading}</strong>
    </div>
    <div className={styles.meta}><span>{text.status}: {!result ? text.loading : result.fallback ? text.fallbackStatus : result.error ? text.rssUnavailable : text.ready}</span>{mode === 'rss-ready' && <span>{text.experimental}</span>}</div>
    {result && <div className={styles.meta}>
      <span>{text.source}: {result.providerLabel}</span>
      {result.lastUpdatedAt && <span>{text.lastUpdated}: <time dateTime={result.lastUpdatedAt}>{new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.lastUpdatedAt))}</time></span>}
    </div>}
    {result?.error && <p className={styles.warning} role="alert">{text.unableToLoad} {reason} {result.fallback && text.fallback}</p>}
  </section>
}
