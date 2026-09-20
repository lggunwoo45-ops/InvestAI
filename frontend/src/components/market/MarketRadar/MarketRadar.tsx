import type { Language } from '@/i18n/translations'
import type { MarketRadarSignal, MarketRadarSnapshot } from '@/types/marketRadar'
import styles from './MarketRadar.module.css'

interface MarketRadarProps {
  snapshot: MarketRadarSnapshot
  language: Language
  onOpenInstrument: (instrumentId: string) => void
}

const copy = {
  en: { eyebrow: 'RULE-BASED MARKET OVERVIEW', title: 'Market Radar', ai: 'Real AI not connected', advice: 'Not investment advice', sectors: 'Hot sectors', volume: 'Unusual volume', volatility: 'Volatility radar', candidates: 'Watch candidates', themes: 'News themes', top: 'Top radar signals', risk: 'Risk notes', marketLevel: 'Market-level signal', noInstrument: 'No direct instrument', open: 'Open in Market', statuses: { active: 'Active', watch: 'Watch', caution: 'Caution', incomplete: 'Incomplete' }, sources: { 'rule-based': 'Rule-based', 'local-proxy': 'Local Proxy RSS', mock: 'Demo data', none: 'No source' }, final: 'Rule-based research context only. Not investment advice. The user makes the final decision.' },
  ko: { eyebrow: '규칙 기반 시장 개요', title: '마켓 레이더', ai: '실제 AI 미연결', advice: '투자 조언 아님', sectors: '주목 섹터', volume: '이상 거래량', volatility: '변동성 레이더', candidates: '관찰 후보', themes: '뉴스 테마', top: '주요 레이더 신호', risk: '위험 참고', marketLevel: '시장 수준 신호', noInstrument: '직접 연결 종목 없음', open: '마켓에서 열기', statuses: { active: '활성', watch: '관찰', caution: '주의', incomplete: '불완전' }, sources: { 'rule-based': '규칙 기반', 'local-proxy': 'Local Proxy RSS', mock: '데모 데이터', none: '출처 없음' }, final: '규칙 기반 참고용이며 추천이 아닙니다. 최종 판단은 사용자가 직접 내립니다.' },
} as const

const typeLabels = {
  en: { hotSector: 'Hot sector', unusualVolume: 'Unusual volume', volatility: 'Volatility', watchCandidate: 'Watch candidate', newsTheme: 'News theme', risk: 'Risk' },
  ko: { hotSector: '주목 섹터', unusualVolume: '이상 거래량', volatility: '변동성', watchCandidate: '관찰 후보', newsTheme: '뉴스 테마', risk: '위험' },
} as const

function signalPriority(signal: MarketRadarSignal) {
  if (signal.status === 'caution') return 0
  if (signal.type === 'watchCandidate') return 1
  if (signal.type === 'unusualVolume' || signal.type === 'volatility') return 2
  if (signal.type === 'newsTheme') return 3
  return 4
}

export function MarketRadar({ snapshot, language, onOpenInstrument }: MarketRadarProps) {
  const t = copy[language]
  const summaries = [{ label: t.sectors, value: snapshot.hotSectors.length }, { label: t.volume, value: snapshot.unusualVolume.length }, { label: t.volatility, value: snapshot.volatilityRadar.length }, { label: t.candidates, value: snapshot.watchCandidates.length }, { label: t.themes, value: snapshot.newsThemes.length }]
  const topSignals = [...snapshot.signals].filter((signal) => signal.type !== 'risk').sort((a, b) => signalPriority(a) - signalPriority(b) || b.score - a.score).slice(0, 8)
  return <section className={styles.radar} aria-labelledby="market-radar-title">
    <header className={styles.heading}><div><span>{t.eyebrow}</span><h1 id="market-radar-title">{t.title}</h1><p>{t.ai} · {t.advice}</p></div><div className={styles.mode}><span>{snapshot.mode.toUpperCase()}</span><strong>{t.sources[snapshot.newsSource]}</strong></div></header>
    <div className={styles.summary} aria-label={language === 'ko' ? '레이더 요약' : 'Radar summary'}>{summaries.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.value}</strong></article>)}</div>
    <div className={styles.workspace}><section className={styles.signals} aria-labelledby="radar-signals-title"><h2 id="radar-signals-title">{t.top}</h2>{topSignals.length ? <ol>{topSignals.map((signal) => <li key={signal.id} data-status={signal.status}><header><span>{typeLabels[language][signal.type]} · {signal.scope}</span><em>{t.statuses[signal.status]}</em></header><strong>{signal.title}</strong><p>{signal.summary}</p><div className={styles.evidence}><span>{signal.evidenceLabel}</span><span>{t.sources[signal.source]}</span></div><div className={styles.symbols}>{signal.relatedSymbols.map((symbol) => <b key={symbol}>{symbol}</b>)}</div><footer>{signal.relatedInstrumentIds[0] ? <button type="button" onClick={() => onOpenInstrument(signal.relatedInstrumentIds[0])}>{t.open} →</button> : <span>{signal.scope === 'macro' || signal.relatedMarkets.length ? t.marketLevel : t.noInstrument}</span>}</footer></li>)}</ol> : <div className={styles.empty}>{t.statuses.incomplete}</div>}</section>
      <aside className={styles.risks} aria-labelledby="radar-risks-title"><h2 id="radar-risks-title">{t.risk}</h2><ul>{snapshot.riskNotes.map((note) => <li key={note}>{note}</li>)}</ul><strong>{t.final}</strong></aside></div>
  </section>
}
