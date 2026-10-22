import { useEffect, useState, type ReactNode } from 'react'
import type { Language } from '@/i18n/translations'
import type { AnalysisFrame, AnalysisSeries, CryptoDecision } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import styles from './AnalysisPreparation.module.css'

interface Props {
  decision: CryptoDecision
  series: Record<AnalysisFrame, AnalysisSeries>
  language: Language
  onDetails: () => void
  compactReady?: boolean
}

// Mount for each waiting episode; stop the clock on completion or navigation.
function PreparationWait({ children }: { children: (elapsed: number) => ReactNode }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const startedAt = Date.now()
    const timer = setInterval(() => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000))), 1000)
    return () => clearInterval(timer)
  }, [])
  return children(elapsed)
}

/** Counts usable timeframes, not elapsed time, download bytes, or prediction confidence. */
export function AnalysisPreparation({ decision, series, language, onDetails, compactReady = false }: Props) {
  const ko = language === 'ko'
  const rows = decision.frames.map(frame => {
    const data = series[frame.frame]
    const quoteMissing = !frame.issue && !(data.currentPrice !== null && Number.isFinite(data.currentPrice) && data.currentPrice > 0)
    const ready = !frame.issue && !quoteMissing
    const pending = frame.issue === 'loading' || quoteMissing
      || (frame.issue === 'disconnected' && data.connectionStatus === 'reconnecting')
      || (frame.issue === 'stale' && data.connectionStatus === 'live')
    const label = ready ? (ko ? '준비 완료' : 'Ready')
      : frame.issue === 'mock' ? (ko ? '예시 데이터' : 'Example data')
      : frame.issue === 'history' ? (ko ? '가격 기록 부족' : 'Too little history')
      : frame.issue === 'gaps' ? (ko ? '가격 기록 일부 누락' : 'Gaps in price history')
      : frame.issue === 'range' ? (ko ? '가격 변동 폭 확인 불가' : 'Price range unavailable')
      : frame.issue === 'stale' ? (ko ? '최신 시세 대기' : 'Waiting for fresh quotes')
      : frame.issue === 'disconnected' ? (ko ? pending ? '연결 복구 중' : '연결 안 됨' : pending ? 'Reconnecting' : 'Disconnected')
      : data.candles.length > 0 ? (ko ? '실시간 시세 연결 중' : 'Connecting live quotes')
      : (ko ? '가격 기록 불러오는 중' : 'Loading price history')
    return { frame: frame.frame, ready, pending, label }
  })
  const ready = rows.filter(row => row.ready).length
  const pending = rows.some(row => row.pending)
  const mock = rows.some(row => series[row.frame].dataQuality === 'mock')
  const complete = ready === 3 && decision.direction !== 'unavailable'
  const percent = complete ? 100 : Math.min(99, Math.round(ready / 3 * 100))
  const renderStatus = (elapsed: number) => {
    const slow = pending && elapsed >= 15
    const delayed = pending && elapsed >= 45
    const available = decision.direction !== 'unavailable'
    const title = mock ? (ko ? '예시 화면을 보고 있어요' : 'You are viewing example data')
      : complete ? (ko ? '분석 준비 완료' : 'Analysis ready')
      : delayed ? (ko ? '시세 응답이 지연되고 있어요' : 'Market data is delayed')
      : slow ? (ko ? '분석 준비가 늦어지고 있어요' : 'Analysis preparation is taking longer')
      : pending ? (ko ? available ? '분석 가능 · 나머지 자료 확인 중' : '분석 준비 중' : available ? 'Analysis available · checking remaining data' : 'Preparing analysis')
      : (ko ? available ? '일부 자료로 분석했어요' : '지금은 분석할 자료가 부족해요' : available ? 'Analysis uses partial data' : 'Analysis data is unavailable')
    const frameNames = ko ? { '1H': '1시간', '4H': '4시간', '1D': '하루' } : { '1H': '1 hour', '4H': '4 hours', '1D': 'Daily' }

    return <section className={styles.preparation} data-compact={complete && compactReady || undefined} data-state={complete ? 'ready' : mock ? 'mock' : delayed || !pending ? 'limited' : 'loading'} aria-label={ko ? '분석 준비 상태' : 'Analysis preparation'}>
      <div className={styles.heading}>
        <strong role="status">{pending && !delayed && <span className={styles.spinner} aria-hidden="true" />}{title}</strong>
        {!mock && <b>{percent}%</b>}
      </div>
      {!mock && <>
        <progress aria-label={ko ? '분석 자료 준비율' : 'Analysis data readiness'} max={100} value={percent} />
        <div className={styles.caption}><span>{ko ? `3개 시간대 중 ${ready}개 준비` : `${ready} of 3 timeframes ready`}</span>
          {pending && <span>{ko ? `${elapsed}초 경과` : `${elapsed}s elapsed`}</span>}</div>
        {!complete && <>
          <ul>{rows.map(row => <li key={row.frame} data-ready={row.ready}><span>{frameNames[row.frame]}</span><strong>{row.label}</strong></li>)}</ul>
          <p>{ko ? '준비율은 분석에 쓸 수 있는 시간대 수예요. 남은 시간이나 수익 확률을 뜻하지 않아요.' : 'Readiness counts usable timeframes. It is not an estimated time or return probability.'}</p>
          {pending && <p>{ko ? delayed ? '연결 시도는 계속되지만 아직 필요한 응답을 받지 못했어요. 계속 같다면 페이지를 새로고침해주세요.' : available ? '준비된 자료로 아래 결과를 먼저 볼 수 있어요.' : '가격 기록과 최신 시세를 확인하고 있어요. 준비되는 즉시 결과가 나타나요.' : delayed ? 'Connection attempts continue, but required data has not arrived. Reload the page if this persists.' : available ? 'You can read the result below using the available data.' : 'Checking price history and live quotes. Results appear as soon as enough data is ready.'}</p>}
          {!available && <p>{ko ? '아직 분석할 자료가 부족해요. 매수나 매도를 기다리라는 뜻은 아니에요.' : 'This is a data issue, not a signal to wait, buy or sell.'}</p>}
          <div className={styles.actions}><button type="button" onClick={onDetails}>{ko ? '연결·자료 상태 자세히 보기' : 'View connection and data details'}</button>
            {delayed && <button type="button" onClick={() => window.location.reload()}>{ko ? '페이지 새로고침' : 'Reload page'}</button>}</div>
        </>}
      </>}
    </section>
  }
  return pending ? <PreparationWait>{renderStatus}</PreparationWait> : renderStatus(0)
}
