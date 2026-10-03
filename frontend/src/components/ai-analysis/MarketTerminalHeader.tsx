import type { Language } from '@/i18n/translations'
import type { BitcoinMarketAnchorStatus } from '@/services/marketAnchor/bitcoinMarketAnchor'
import styles from './MarketTerminalHeader.module.css'

interface MarketTerminalHeaderProps {
  bucketLabel: string
  displayedCount: number
  heldCount: number
  excludedCount: number
  dataState: 'live' | 'mock' | 'unavailable'
  snapshotStatus: 'today' | 'previous' | 'pending'
  bitcoinAnchorStatus: BitcoinMarketAnchorStatus | null
  language: Language
}

const copy = {
  en: { eyebrow: 'AI ANALYSIS TERMINAL', title: 'Today’s interest candidates', basis: 'Today 08:00 basis', bucket: 'Market bucket', displayed: 'Displayed', held: 'Held', excluded: 'Excluded', data: 'Data state', anchor: 'BTC anchor', snapshot: { today: 'Today’s snapshot', previous: 'Previous snapshot', pending: 'Preparing snapshot' }, states: { live: 'Live', mock: 'Mock / limited', unavailable: 'Unavailable' }, anchors: { ready: 'Ready', limited: 'Limited', unavailable: 'Unavailable' }, safety: 'Decision-support information, not a trade instruction or profit guarantee.' },
  ko: { eyebrow: 'AI 분석 터미널', title: '오늘의 관심 후보', basis: '오늘 08:00 기준', bucket: '시장군', displayed: '표시 후보', held: '보류 후보', excluded: '제외 후보', data: '데이터 상태', anchor: 'BTC 기준', snapshot: { today: '오늘 기준 기록', previous: '이전 기준 기록', pending: '기준 기록 준비 중' }, states: { live: '실시간', mock: '모의 / 제한', unavailable: '사용 불가' }, anchors: { ready: '사용 가능', limited: '제한', unavailable: '확인 불가' }, safety: '판단 보조 정보이며, 거래 지시나 수익 보장이 아닙니다.' },
} as const

export function MarketTerminalHeader({ bucketLabel, displayedCount, heldCount, excludedCount, dataState, snapshotStatus, bitcoinAnchorStatus, language }: MarketTerminalHeaderProps) {
  const t = copy[language]
  return <header className={styles.header} aria-label={language === 'ko' ? 'AI 분석 터미널 헤더' : 'AI analysis terminal header'}>
    <div className={styles.identity}><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.basis} · {t.snapshot[snapshotStatus]}</p></div>
    <dl><div><dt>{t.bucket}</dt><dd>{bucketLabel}</dd></div><div><dt>{t.displayed}</dt><dd>{displayedCount}</dd></div><div><dt>{t.held}</dt><dd>{heldCount}</dd></div><div><dt>{t.excluded}</dt><dd>{excludedCount}</dd></div>{bitcoinAnchorStatus && <div><dt>{t.anchor}</dt><dd data-state={bitcoinAnchorStatus}>{t.anchors[bitcoinAnchorStatus]}</dd></div>}<div><dt>{t.data}</dt><dd data-state={dataState}>{t.states[dataState]}</dd></div></dl>
    <small>{t.safety}</small>
  </header>
}
