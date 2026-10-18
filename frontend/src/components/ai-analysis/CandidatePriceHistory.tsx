import type { Language } from '@/i18n/translations'
import type { Candle } from '@/types/marketDetail'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import styles from './CandidateInspectorPanel.module.css'

interface Props {
  candles: readonly Candle[]
  dataQuality: AnalysisDataQuality
  language: Language
}

/** Uses only the selected instrument's existing daily closes; no extra requests. */
export function CandidatePriceHistory({ candles, dataQuality, language }: Props) {
  const series = candles.slice(-30)
  if (dataQuality === 'unavailable' || series.length < 2 || series.some(({ timestamp, close }) => !Number.isFinite(timestamp) || !Number.isFinite(close) || close <= 0)) return null
  const values = series.map(({ close }) => close)
  const low = Math.min(...values)
  const high = Math.max(...values)
  const points = values.map((value, index) => `${8 + index / (values.length - 1) * 304},${high === low ? 55 : 95 - (value - low) / (high - low) * 80}`).join(' ')
  const date = (timestamp: number) => new Intl.DateTimeFormat(language === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' }).format(new Date(timestamp))
  const title = language === 'ko' ? '최근 가격 흐름' : 'Recent price history'
  const quality = dataQuality === 'mock' ? language === 'ko' ? '모의 데이터' : 'Mock data' : dataQuality === 'limited' ? language === 'ko' ? '제한된 데이터' : 'Limited data' : language === 'ko' ? '시장 데이터' : 'Market data'
  return <figure className={styles.priceHistory}>
    <figcaption><strong>{title}</strong><span>{quality} · {language === 'ko' ? `일봉 ${series.length}개` : `${series.length} daily closes`}</span></figcaption>
    <svg viewBox="0 0 320 110" role="img" aria-label={`${title} · ${quality} · ${date(series[0].timestamp)} – ${date(series.at(-1)!.timestamp)}`}>
      <path d="M8 25H312 M8 55H312 M8 85H312" stroke="currentColor" opacity=".1" fill="none" />
      <polygon points={`8,110 ${points} 312,110`} fill="currentColor" opacity=".07" />
      <polyline points={points} stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
    <div><span>{date(series[0].timestamp)}</span><span>{date(series.at(-1)!.timestamp)}</span></div>
  </figure>
}
