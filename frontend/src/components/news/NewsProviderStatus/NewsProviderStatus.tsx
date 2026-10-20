import { useLanguage } from '@/i18n/useLanguage'
import { uiText } from '@/i18n/translations'
import type { NewsLoadResult, NewsProviderMode } from '@/services/news/newsService'
import styles from './NewsProviderStatus.module.css'
import { runtimeConfig } from '@/config/runtimeConfig'
import { useNewsProviderMode } from '@/hooks/useNewsProviderMode'

interface NewsProviderStatusProps {
  mode: NewsProviderMode
  result: NewsLoadResult | null
  onModeChange: (mode: NewsProviderMode) => void
}

/** Requested provider and displayed data source are separate so fallback cannot look live. */
export function NewsProviderStatus({ mode, result, onModeChange }: NewsProviderStatusProps) {
  const { language } = useLanguage()
  const { refresh } = useNewsProviderMode()
  const text = uiText[language].news.provider
  const localProxyMode = mode === 'local-proxy'
  if (mode === 'live') {
    const ko = language === 'ko'
    const labels = ko ? { ready: '연결됨', stale: '이전 수신 자료 · 갱신 지연', unavailable: '연결 실패' } : { ready: 'Connected', stale: 'Earlier feed · delayed', unavailable: 'Unavailable' }
    return <section className={styles.panel} aria-label={text.title}>
      <div className={styles.top}>
        <strong>{ko ? '실제 뉴스' : 'Live news'}</strong>
        <div className={styles.modes}>
          <button type="button" onClick={refresh}>{ko ? '뉴스 새로고침' : 'Refresh news'}</button>
          <button type="button" onClick={() => onModeChange('mock')}>{ko ? '예시 데이터 보기' : 'View demo data'}</button>
        </div>
        <span role="status">{!result ? text.loading : result.articles.length ? `${result.articles.length} ${ko ? '개 기사' : 'articles'}` : ko ? '뉴스를 불러오지 못했습니다' : 'News unavailable'}</span>
      </div>
      <p>{ko ? '제목·출처·발행 시각을 확인하고 원문으로 이동합니다. 영문 기사는 원문 제목으로 표시되며, 관련 종목은 제목에 명시된 이름을 기준으로 연결합니다.' : 'Read attributed headlines and open the original. Related assets are matched from explicit names in the title; no generated summaries or sentiment.'}</p>
      <div className={styles.meta}>{result?.sources?.map(source => <span key={source.id}>
        {source.label}: {labels[source.state]}
        {source.fetchedAt && <> · <time dateTime={source.fetchedAt}>{new Date(source.fetchedAt).toLocaleTimeString(ko ? 'ko-KR' : 'en-US')}</time></>}
      </span>)}</div>
      {result?.error && <p className={styles.warning} role="alert">{ko ? '실제 뉴스 연결을 확인해주세요. 연결 실패를 예시 뉴스로 대체하지 않습니다.' : 'Check the news connection. Failed live feeds are not replaced with demo articles.'}</p>}
    </section>
  }
  const stateLabel = result?.state === 'local-proxy-ready' ? text.localProxyConnected
    : result?.state === 'local-proxy-unavailable' ? text.localProxyUnavailable
      : result?.state === 'rss-unavailable' ? text.rssUnavailable
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
        <button type="button" aria-pressed={false} onClick={() => onModeChange('live')}>{language === 'ko' ? '실제 뉴스' : 'Live news'}</button>
        <button type="button" aria-pressed={mode === 'mock'} onClick={() => onModeChange('mock')}>{text.mock}</button>
        {!runtimeConfig.isProductionLike && <><button type="button" aria-pressed={mode === 'rss-ready'} onClick={() => onModeChange('rss-ready')}>{text.rssReady}</button>
        <button type="button" aria-pressed={mode === 'local-proxy'} onClick={() => onModeChange('local-proxy')}>{text.localProxy}</button></>}
      </div>
      <strong role="status">{result ? stateLabel : uiText[language].news.loading}</strong>
    </div>
    <div className={styles.meta}><span>{localProxyMode ? text.proxyStatus : text.status}: {!result ? text.loading : result.fallback ? text.fallbackStatus : result.error ? (localProxyMode ? text.localProxyUnavailable : text.rssUnavailable) : text.ready}</span>{mode !== 'mock' && <span>{localProxyMode ? text.localProxyRequired : text.experimental}</span>}</div>
    {localProxyMode && <div className={styles.meta}><span>{text.sourceAllowlist}: fed-press</span><span>{text.serverSideRss}</span></div>}
    {result && <div className={styles.meta}>
      <span>{text.source}: {result.providerLabel}</span>
      {result.lastUpdatedAt && <span>{text.lastUpdated}: <time dateTime={result.lastUpdatedAt}>{new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(result.lastUpdatedAt))}</time></span>}
    </div>}
    {result?.state === 'local-proxy-ready' && <p className={styles.success} role="status">{text.localProxyRealRss}</p>}
    {result?.error && <p className={styles.warning} role="alert">{localProxyMode ? `${text.localProxyFallback} ${text.localProxyStart}` : `${text.unableToLoad} ${reason} ${result.fallback ? text.fallback : ''}`}</p>}
  </section>
}
