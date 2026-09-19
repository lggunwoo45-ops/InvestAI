import type { Language } from '@/i18n/translations'
import { getWatchScoreLabel } from '@/services/ai/cryptoWatchCandidateEngine'
import type { MarketDataMode } from '@/types/market'
import type { WatchCandidate } from '@/types/watchCandidate'
import styles from './CryptoWatchCandidates.module.css'

interface CryptoWatchCandidatesProps {
  candidates: readonly WatchCandidate[]
  language: Language
  mode: MarketDataMode
  loading?: boolean
  error?: string | null
  onOpenInstrument: (instrumentId: string) => void
  onOpenMarket: () => void
  onModeChange: (mode: MarketDataMode) => void
  onRetry: () => void
}

const text = {
  en: { title: 'Crypto Watch Candidates', eyebrow: 'USABLE ANALYSIS PILOT', subtitle: 'Deterministic research shortlist from Upbit KRW market evidence.', trust: 'Transparent rule-based screen · no AI model · no prediction · no investment recommendation', live: 'LIVE CATALOG', mock: 'MOCK CATALOG', loading: 'Preparing the evidence-ranked watchlist…', empty: 'No complete crypto market catalog is available.', error: 'The crypto catalog could not be loaded.', openMarket: 'Open Market', useMock: 'Use mock catalog', retry: 'Retry', open: 'Open in Market', why: 'Why it is on watch', evidence: 'Evidence breakdown', risk: 'Risk / invalidation', next: 'Next watch points', news: 'News provenance', source: 'Source', scope: 'Scope', headlines: 'headlines', details: 'Inspect evidence', score: 'Watch Score' },
  ko: { title: '가상자산 관찰 후보', eyebrow: '사용 가능한 분석 파일럿', subtitle: '업비트 KRW 시장 근거를 규칙 기반으로 계산한 리서치 후보 목록입니다.', trust: '투명한 규칙 기반 화면 · AI 모델 없음 · 예측 없음 · 투자 추천 아님', live: '실시간 카탈로그', mock: '모의 카탈로그', loading: '근거 기반 관찰 목록을 준비하고 있습니다…', empty: '사용 가능한 가상자산 시장 카탈로그가 없습니다.', error: '가상자산 카탈로그를 불러오지 못했습니다.', openMarket: '마켓 열기', useMock: '모의 카탈로그 사용', retry: '다시 시도', open: '마켓에서 열기', why: '관찰 이유', evidence: '근거 점수 상세', risk: '위험 / 무효화 조건', next: '다음 확인 항목', news: '뉴스 출처', source: '출처', scope: '범위', headlines: '개 헤드라인', details: '근거 펼쳐보기', score: '관찰 점수' },
} as const

export function CryptoWatchCandidates({ candidates, language, mode, loading = false, error = null, onOpenInstrument, onOpenMarket, onModeChange, onRetry }: CryptoWatchCandidatesProps) {
  const t = text[language]
  return <main className={styles.page}>
    <header className={styles.heading}>
      <div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.subtitle}</p></div>
      <div className={styles.mode} aria-label={language === 'ko' ? '시장 데이터 모드' : 'Market data mode'}>
        <button className={mode === 'live' ? styles.active : ''} onClick={() => onModeChange('live')}>{t.live}</button>
        <button className={mode === 'mock' ? styles.active : ''} onClick={() => onModeChange('mock')}>{t.mock}</button>
      </div>
    </header>
    <p className={styles.trust}>{t.trust}</p>
    {loading && <section className={styles.state} role="status">{t.loading}</section>}
    {!loading && (error || candidates.length === 0) && <section className={styles.state} role="status">
      <strong>{error ? t.error : t.empty}</strong>{error && <small>{error}</small>}
      <div><button onClick={onOpenMarket}>{t.openMarket}</button>{error && <button onClick={onRetry}>{t.retry}</button>}{mode === 'live' && <button onClick={() => onModeChange('mock')}>{t.useMock}</button>}</div>
    </section>}
    {!loading && !error && candidates.length > 0 && <ol className={styles.list} aria-label={t.title}>
      {candidates.map((candidate) => <li key={candidate.id} className={styles.card}>
        <div className={styles.rank} aria-label={`Rank ${candidate.rank}`}>{String(candidate.rank).padStart(2, '0')}</div>
        <div className={styles.body}>
          <header className={styles.cardHeader}>
            <div><strong>{candidate.symbol}</strong><span>{candidate.name}</span></div>
            <div className={styles.score}><span>{t.score}</span><b>{candidate.watchScore}</b><em data-level={candidate.scoreLabel}>{getWatchScoreLabel(candidate.scoreLabel, language)}</em></div>
          </header>
          <p className={styles.reason}><b>{t.why}</b>{candidate.watchReason}</p>
          <div className={styles.chips}>{candidate.evidence.map((item) => <span key={item.type} data-status={item.status}>{item.label} {item.score > 0 ? `+${item.score}` : item.score}</span>)}</div>
          <details className={styles.details}>
            <summary>{t.details}</summary>
            <section><h2>{t.evidence}</h2><dl>{candidate.evidence.map((item) => <div key={item.type} data-status={item.status}><dt>{item.label}</dt><dd><b>{item.score}/{item.maxScore}</b>{item.summary}</dd></div>)}</dl></section>
            <section><h2>{t.risk}</h2><p>{candidate.riskSummary}</p><p>{candidate.invalidationSummary}</p></section>
            <section><h2>{t.next}</h2><ul>{candidate.nextWatchPoints.map((point) => <li key={point}>{point}</li>)}</ul></section>
            <section><h2>{t.news}</h2><p>{t.source}: {candidate.newsEvidence.source} · {t.scope}: {candidate.newsEvidence.scope} · {candidate.newsEvidence.count} {t.headlines}</p>{candidate.newsEvidence.headlines.map((headline) => <p key={headline}>— {headline}</p>)}<small>{candidate.newsEvidence.disclaimer}</small></section>
          </details>
          <footer><small>{candidate.disclaimer}</small><button onClick={() => onOpenInstrument(candidate.instrumentId)}>{t.open}</button></footer>
        </div>
      </li>)}
    </ol>}
  </main>
}
