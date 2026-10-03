import type { Language } from '@/i18n/translations'
import type { DisplayMode } from '@/types/displayMode'
import type { MovingAverageContext, TechnicalLevel, TechnicalLevelSet } from '@/types/technicalLevels'
import styles from './TechnicalLevelsPanel.module.css'

interface TechnicalLevelsPanelProps {
  levelSet: TechnicalLevelSet
  movingAverageContext: MovingAverageContext
  displayMode: DisplayMode
  language: Language
  isLoading?: boolean
}

const copy = {
  en: {
    eyebrow: 'RULE-BASED TECHNICAL CONTEXT', title: 'Chart structure analysis', compact: 'Compact review', full: 'Full review', available: 'Available', loading: 'Calculating chart structure…', unavailable: 'Not enough data to calculate chart structure.', support: 'First support', resistance: 'First resistance', movingAverage: 'Moving-average context', additional: 'Additional structure references', fibonacci: 'Fibonacci references', source: 'Source', strength: 'Strength', distance: 'Distance from current', dataQuality: 'Data quality', empty: 'Reference unavailable', safety: 'Chart review references, not trade instructions.', qualities: { live: 'Live', mock: 'Mock/demo', limited: 'Limited', unavailable: 'Unavailable' }, strengths: { weak: 'Weak', moderate: 'Moderate', strong: 'Strong' }, sources: { candlePivot: 'Candle pivot', candleRange: 'Candle range', movingAverage: 'Moving average', fibonacciRange: 'Fibonacci range', currentPrice: 'Current price', unavailable: 'Unavailable' },
  },
  ko: {
    eyebrow: '규칙 기반 기술 맥락', title: '차트 구조 분석', compact: '간편 검토', full: '전체 검토', available: '확인 가능', loading: '차트 구조를 계산하는 중입니다…', unavailable: '차트 구조를 계산할 데이터가 부족합니다.', support: '1차 지지 참고', resistance: '1차 저항 참고', movingAverage: '이동평균 맥락', additional: '추가 구조 참고', fibonacci: '피보나치 참고', source: '출처', strength: '강도', distance: '현재가 대비 거리', dataQuality: '데이터 품질', empty: '참고 정보 없음', safety: '차트 검토 참고 정보이며, 거래 지시가 아닙니다.', qualities: { live: '실제 데이터', mock: '모의/데모', limited: '제한 데이터', unavailable: '사용 불가' }, strengths: { weak: '약함', moderate: '보통', strong: '강함' }, sources: { candlePivot: '캔들 전환점', candleRange: '캔들 범위', movingAverage: '이동평균', fibonacciRange: '피보나치 범위', currentPrice: '현재가', unavailable: '사용 불가' },
  },
} as const

function distance(value: number | null, language: Language) {
  if (value === null || !Number.isFinite(value)) return '—'
  return `${new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(value)}%`
}

function SimpleLevel({ title, level, empty }: { title: string; level: TechnicalLevel | null; empty: string }) {
  return <article className={styles.simpleLevel}><span>{title}</span><strong>{level?.priceLabel ?? '—'}</strong><small>{level?.label ?? empty}</small></article>
}

export function TechnicalLevelsPanel({ levelSet, movingAverageContext, displayMode, language, isLoading = false }: TechnicalLevelsPanelProps) {
  const t = copy[language]
  const expertLevels = [levelSet.firstSupport, levelSet.secondSupport, levelSet.firstResistance, levelSet.secondResistance, levelSet.reboundWatchZone, levelSet.breakdownCheckZone, ...levelSet.movingAverages].filter((level): level is TechnicalLevel => level !== null)
  const [safety = t.safety, ...cautions] = isLoading ? [t.safety] : levelSet.cautions
  return <section className={styles.panel} data-status={isLoading ? 'loading' : levelSet.status} data-display-mode={displayMode} aria-label={t.title}>
    <header><div><span>{t.eyebrow}</span><h2>{t.title}</h2><p>{levelSet.symbol} · {displayMode === 'simple' ? t.compact : t.full}</p></div><strong>{isLoading ? t.loading : levelSet.status === 'ready' ? t.available : t.empty}</strong></header>
    {isLoading ? <p className={styles.unavailable} role="status">{t.loading}</p> : levelSet.status === 'unavailable' ? <p className={styles.unavailable} role="status">{t.unavailable}</p> : displayMode === 'simple' ? <div className={styles.simpleGrid}>
      <SimpleLevel title={t.support} level={levelSet.firstSupport} empty={t.empty} />
      <SimpleLevel title={t.resistance} level={levelSet.firstResistance} empty={t.empty} />
      <article className={styles.simpleLevel}><span>{t.movingAverage}</span><strong>{movingAverageContext.nearestAverage?.priceLabel ?? '—'}</strong><small>{movingAverageContext.summary}</small></article>
    </div> : <div className={styles.expert}>
      <div className={styles.summary}><p>{levelSet.summary}</p><dl><div><dt>{t.dataQuality}</dt><dd>{t.qualities[levelSet.dataQuality]}</dd></div><div><dt>{t.movingAverage}</dt><dd>{movingAverageContext.summary}</dd></div></dl></div>
      <section className={styles.levelGroup} aria-label={t.additional}><header><h3>{t.additional}</h3><span>{expertLevels.length}</span></header><ul>{expertLevels.map((level) => <li key={level.id} data-strength={level.strength}>
        <div><strong>{level.label}</strong><b>{level.priceLabel}</b></div><p>{level.reason}</p><dl><div><dt>{t.source}</dt><dd>{t.sources[level.source]}</dd></div><div><dt>{t.strength}</dt><dd>{t.strengths[level.strength]}</dd></div><div><dt>{t.distance}</dt><dd>{distance(level.distanceFromCurrentPercent, language)}</dd></div></dl>
      </li>)}</ul></section>
      <section className={styles.levelGroup} aria-label={t.fibonacci}><header><h3>{t.fibonacci}</h3><span>{levelSet.fibonacciLevels.length}</span></header><ul>{levelSet.fibonacciLevels.map((level) => <li key={level.id} data-strength={level.strength}>
        <div><strong>{level.label}</strong><b>{level.priceLabel}</b></div><p>{level.reason}</p><dl><div><dt>{t.source}</dt><dd>{t.sources[level.source]}</dd></div><div><dt>{t.strength}</dt><dd>{t.strengths[level.strength]}</dd></div><div><dt>{t.distance}</dt><dd>{distance(level.distanceFromCurrentPercent, language)}</dd></div></dl>
      </li>)}</ul></section>
    </div>}
    <footer><span>{safety}</span>{cautions.map((caution) => <small key={caution}>{caution}</small>)}</footer>
  </section>
}
