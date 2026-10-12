import { useId, useState } from 'react'
import type { Language } from '@/i18n/translations'
import { compareAnalysisChanges } from '@/services/watchlist/analysisChangeComparison'
import type { ReviewSnapshot } from '@/services/watchlist/watchlistStorage'
import styles from './AnalysisChanges.module.css'

const copy = {
  ko: {
    title: '분석 변화', previous: '이전 상태', current: '현재 상태', time: '비교 시각', baseline: '이전 확인 시각',
    missing: '비교할 근거가 부족합니다', incompatible: '종목·시장·거래소·통화·시간봉 또는 데이터 출처가 달라 비교할 수 없습니다.',
    limited: '오래되었거나 모의·제한 데이터가 포함되어 방향 비교가 제한됩니다.',
    neutral: '가격 변화와 거래량 급증은 투자 품질의 개선을 뜻하지 않습니다. 맥락에 따라 방향 판정이 불가능할 수 있습니다.',
    status: { improved: '근거 개선', weakened: '근거 약화', unchanged: '변화 없음', unavailable: '판정 불가' },
    dimension: { finalRead: 'Final Read', trend: '기술 추세', momentum: '모멘텀', volume: '거래량', price: '가격', quality: '데이터 품질' },
    values: { upward: '상방', downward: '하방', neutral: '중립', positive: '양호', negative: '약화', strongPositive: '강한 양의 흐름', strongNegative: '강한 음의 흐름', elevated: '증가', normal: '보통', low: '낮음', live: '실시간', mock: '모의', limited: '제한', unavailable: '확인 불가' },
  },
  en: {
    title: 'Analysis changes', previous: 'Previous state', current: 'Current state', time: 'Comparison time', baseline: 'Previous review time',
    missing: 'Insufficient evidence to compare', incompatible: 'Instrument, market, exchange, currency, timeframe or data source differs.',
    limited: 'Stale, mock or limited data restricts directional comparison.',
    neutral: 'Price changes and elevated volume do not imply better investment quality. Context may prevent a directional classification.',
    status: { improved: 'Evidence improved', weakened: 'Evidence weakened', unchanged: 'Unchanged', unavailable: 'Unavailable' },
    dimension: { finalRead: 'Final Read', trend: 'Technical trend', momentum: 'Momentum', volume: 'Volume', price: 'Price', quality: 'Data quality' },
    values: { upward: 'Upward', downward: 'Downward', neutral: 'Neutral', positive: 'Positive', negative: 'Negative', strongPositive: 'Strong positive', strongNegative: 'Strong negative', elevated: 'Elevated', normal: 'Normal', low: 'Low', live: 'Live', mock: 'Mock', limited: 'Limited', unavailable: 'Unavailable' },
  },
} as const

export function AnalysisChanges({ previous, current, language }: { previous?: ReviewSnapshot; current: ReviewSnapshot | null; language: Language }) {
  const [expanded, setExpanded] = useState(false)
  const detailsId = useId()
  const text = copy[language]
  const comparison = compareAnalysisChanges(previous, current)
  const summary = !previous?.analysisEvidence || !current?.analysisEvidence
    ? (language === 'ko' ? '비교 가능한 이전 근거가 부족합니다.' : 'Previous comparable evidence is limited.')
    : !comparison.compatible
      ? (language === 'ko' ? '종목 또는 시장 기준이 달라 비교가 제한됩니다.' : 'Comparison is limited because the instrument or market context changed.')
      : comparison.limited
        ? (language === 'ko' ? '데이터 상태로 비교가 제한됩니다.' : 'Data availability limits comparison.')
        : comparison.differences.some(value => value.status === 'weakened')
          ? (language === 'ko' ? '이전 확인 이후 일부 근거가 약해졌습니다.' : 'Some evidence weakened since last review.')
          : comparison.differences.some(value => value.status === 'improved')
            ? (language === 'ko' ? '이전 확인 이후 주요 근거가 개선되었습니다.' : 'Key evidence improved since last review.')
            : comparison.differences.some(value => value.status === 'unavailable' && value.previous !== value.current)
              ? (language === 'ko' ? '일부 변화는 방향 판정이 어렵습니다.' : 'Some changes have no directional classification.')
              : (language === 'ko' ? '비교 가능한 근거의 변화가 없습니다.' : 'Comparable evidence is unchanged.')
  const format = (value: string | number | undefined) => value === undefined ? text.values.unavailable
    : typeof value === 'number' ? String(value) : text.values[value as keyof typeof text.values] ?? value
  return <div className={styles.changes}>
    <button type="button" className={styles.toggle} aria-label={text.title} aria-expanded={expanded} aria-controls={expanded ? detailsId : undefined} onClick={() => {
      setExpanded(currentExpanded => !currentExpanded)
    }}><span aria-hidden="true">{expanded ? '▾' : '▸'}</span> {text.title}</button>
    <small className={styles.summary}>{summary}</small>
    {expanded && <section id={detailsId} role="region" aria-label={text.title}>
      <dl>
        <div><dt>{text.previous}</dt><dd>{previous?.finalReadTitle || previous?.finalReadState || text.values.unavailable}</dd></div>
        <div><dt>{text.current}</dt><dd>{current?.finalReadTitle || current?.finalReadState || text.values.unavailable}</dd></div>
        <div><dt>{text.baseline}</dt><dd>{comparison.previousAt ? <time dateTime={comparison.previousAt}>{comparison.previousAt}</time> : text.values.unavailable}</dd></div>
        <div><dt>{text.time}</dt><dd>{comparison.comparedAt ? <time dateTime={comparison.comparedAt}>{comparison.comparedAt}</time> : text.values.unavailable}</dd></div>
      </dl>
      {!previous?.analysisEvidence || !current?.analysisEvidence ? <p>{text.missing}</p>
        : !comparison.compatible ? <p>{text.incompatible}</p> : null}
      {comparison.limited && <p>{text.limited}</p>}
      <ul>{comparison.differences.map(difference => <li key={difference.dimension}>
        <strong>{text.dimension[difference.dimension]}</strong>{' '}
        <span>{difference.dimension === 'finalRead' ? previous?.finalReadTitle || format(difference.previous) : format(difference.previous)} → {difference.dimension === 'finalRead' ? current?.finalReadTitle || format(difference.current) : format(difference.current)}</span>{' · '}
        <span>{text.status[difference.status]}</span>
      </li>)}</ul>
      <small>{text.neutral}</small>
    </section>}
  </div>
}
