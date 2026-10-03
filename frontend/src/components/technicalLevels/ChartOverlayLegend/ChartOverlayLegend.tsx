import type { Language } from '@/i18n/translations'
import type { DisplayMode } from '@/types/displayMode'
import type { ChartOverlayLine, TechnicalLevelKind, TechnicalLevelSet } from '@/types/technicalLevels'
import styles from './ChartOverlayLegend.module.css'

interface ChartOverlayLegendProps { status: TechnicalLevelSet['status']; lines: readonly ChartOverlayLine[]; displayMode: DisplayMode; language: Language; isLoading?: boolean }
const copy = {
  en: { title: 'Chart overlays', eyebrow: 'OVERLAY FOUNDATION', compact: 'Compact legend', full: 'Full legend', planned: 'Planned overlay', loading: 'Preparing overlay references…', unavailable: 'Not enough data to calculate chart structure.', safety: 'Chart review references, not trade instructions.', strength: { weak: 'Weak', moderate: 'Moderate', strong: 'Strong' }, kinds: { support: 'Support', resistance: 'Resistance', reboundWatch: 'Rebound watch', breakdownCheck: 'Breakdown check', movingAverage: 'Moving average', fibonacci: 'Fibonacci', currentPrice: 'Current price', unavailable: 'Unavailable' } },
  ko: { title: '차트 표시선', eyebrow: '오버레이 기반', compact: '간편 범례', full: '전체 범례', planned: '표시 예정', loading: '표시선 참고 정보를 준비하는 중입니다…', unavailable: '차트 구조를 계산할 데이터가 부족합니다.', safety: '차트 검토 참고 정보이며, 거래 지시가 아닙니다.', strength: { weak: '약함', moderate: '보통', strong: '강함' }, kinds: { support: '지지 참고', resistance: '저항 참고', reboundWatch: '반등 확인', breakdownCheck: '하단 이탈 확인', movingAverage: '이동평균', fibonacci: '피보나치', currentPrice: '현재가', unavailable: '사용 불가' } },
} as const
const number = (value: number, language: Language) => {
  const absolute = Math.abs(value)
  if (absolute > 0 && absolute < 1e-12) return value.toExponential(2)
  const digits = absolute > 0 && absolute < 1 ? Math.min(12, Math.max(4, Math.ceil(-Math.log10(absolute)) + 2)) : 4
  return new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: digits }).format(value)
}
function simpleLines(lines: readonly ChartOverlayLine[]) { const kinds: readonly TechnicalLevelKind[] = ['support', 'resistance', 'movingAverage', 'currentPrice']; return kinds.flatMap((kind) => lines.find((line) => line.kind === kind && line.visibleByDefault) ?? []).slice(0, 4) }

export function ChartOverlayLegend({ status, lines, displayMode, language, isLoading = false }: ChartOverlayLegendProps) {
  const t = copy[language]
  const visibleLines = displayMode === 'simple' ? simpleLines(lines) : lines
  const unavailable = !isLoading && (status === 'unavailable' || lines.length === 0)
  return <section className={styles.legend} data-status={isLoading ? 'loading' : unavailable ? 'unavailable' : 'planned'} data-display-mode={displayMode} aria-label={t.title}>
    <header><div><span>{t.eyebrow}</span><h2>{t.title}</h2><p>{displayMode === 'simple' ? t.compact : t.full}</p></div><strong>{isLoading ? t.loading : unavailable ? t.unavailable : t.planned}</strong></header>
    {isLoading ? <p className={styles.empty} role="status">{t.loading}</p> : unavailable ? <p className={styles.empty} role="status">{t.unavailable}</p> : <ul>{visibleLines.map((line) => <li key={line.id} data-kind={line.kind} data-style={line.style} data-strength={line.strength}><i aria-hidden="true" /><span><strong>{line.label}</strong><small>{t.kinds[line.kind]} · {t.strength[line.strength]}</small></span><b>{number(line.price, language)}</b></li>)}</ul>}
    <footer><span>{visibleLines.length}/{lines.length}</span><small>{t.safety}</small></footer>
  </section>
}
