import { Link } from 'react-router-dom'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import type { MarketInstrument } from '@/types/market'

/** One instrument only; foreground charts always outrank this background work. */
export function AnalysisWarmup({ instrument, language }: { instrument: MarketInstrument; language: 'en' | 'ko' }) {
  const daily = useTechnicalLevelData(instrument, '1D', 0)
  const fourHourly = useTechnicalLevelData(instrument, '4H', 0)
  const hourly = useTechnicalLevelData(instrument, '1H', 0)
  const rows = [daily, fourHourly, hourly]
  const connected = rows.filter(row => row.connectionStatus === 'live').length
  const recovering = rows.some(row => ['reconnecting', 'disconnected'].includes(row.connectionStatus))
  const status = language === 'ko'
    ? connected === 3 ? '분석 데이터 연결됨' : recovering ? '데이터 연결 재시도 중' : `분석 데이터 미리 준비 중 (${connected}/3)`
    : connected === 3 ? 'Analysis data connected' : recovering ? 'Retrying data connection' : `Preparing analysis data (${connected}/3)`
  return <p role="status"><strong>{instrument.symbol}</strong> · {status} · <Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{language === 'ko' ? '분석 열기' : 'Open analysis'} →</Link></p>
}
