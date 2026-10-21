import type { Language } from '@/i18n/translations'
import styles from './MarketTerminalHeader.module.css'

interface MarketTerminalHeaderProps {
  bucketLabel: string
  dataState: 'live' | 'mock' | 'unavailable'
  snapshotStatus: 'today' | 'previous' | 'pending'
  language: Language
}

const copy = {
  en: { snapshot: { today: 'Today’s snapshot', previous: 'Previous snapshot', pending: 'Preparing snapshot' }, states: { live: 'Live', mock: 'Mock / limited', unavailable: 'Unavailable' } },
  ko: { snapshot: { today: '오늘 기준 기록', previous: '이전 기준 기록', pending: '기준 기록 준비 중' }, states: { live: '실시간', mock: '모의 / 제한', unavailable: '사용 불가' } },
} as const

export function MarketTerminalHeader({ bucketLabel, dataState, snapshotStatus, language }: MarketTerminalHeaderProps) {
  const t = copy[language]
  return <header className={styles.header} aria-label={language === 'ko' ? 'AI 분석 터미널 헤더' : 'AI analysis terminal header'}>
    <div className={styles.identity}><span>{language === 'ko' ? '시장 리서치' : 'MARKET RESEARCH'}</span><h1>{language === 'ko' ? '종목 찾기' : 'Find Assets'}</h1><p>{language === 'ko' ? '시장을 고르고, 오늘의 후보를 비교하세요.' : 'Choose a market and compare today’s candidates.'}</p></div>
    <div className={styles.status}><span>{bucketLabel}</span><span data-state={dataState}>{t.states[dataState]}</span><small>{t.snapshot[snapshotStatus]} · {language === 'ko' ? '오전 8시 이후 조회 시 저장' : 'Saved on opening after 08:00 KST'}</small></div>
  </header>
}
