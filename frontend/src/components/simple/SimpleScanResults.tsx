import { Link } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { decisionGuide } from '@/services/cryptoAnalysis/decisionGuide'
import { simpleScanSelection } from '@/services/simple/simpleScanSelection'
import type { ScanResult } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { MarketVenue } from '@/types/market'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import styles from './SimpleWorkspace.module.css'

interface Props {
  results: readonly ScanResult[]; now: number; venue: MarketVenue; onVenue: (venue: MarketVenue) => void;
  status: 'idle' | 'loading' | 'scanning' | 'done' | 'cancelled' | 'error'; progress: { completed: number; total: number };
  disabled: boolean; onStart: () => void; onCancel: () => void;
}
export function SimpleScanResults({ results, now, venue, onVenue, status, progress, disabled, onStart, onCancel }: Props) {
  const { language } = useLanguage(), ko = language === 'ko'
  const selected = simpleScanSelection(results, now)
  const running = status === 'loading' || status === 'scanning'
  const pendingData = results.filter(item => item.decision.direction === 'unavailable' || now > item.expiresAt).length
  return <section className={styles.tasks} aria-label={ko ? '추천 후보' : 'Review candidates'}>
    <div className={styles.controls}>
      <label>{ko ? '어디서 거래하시나요?' : 'Where do you trade?'}<select value={venue} disabled={running} onChange={event => onVenue(event.target.value as MarketVenue)}>
        <option value="upbit-krw">Upbit · KRW</option><option value="upbit-btc">Upbit · BTC</option><option value="upbit-usdt">Upbit · USDT</option><option value="binance-spot">Binance · Spot · USDT</option><option value="binance-futures">Binance · Futures · USDT</option>
      </select></label>
      <button type="button" className={styles.primary} disabled={!running && disabled} onClick={running ? onCancel : onStart}>{ko ? running ? '찾기 중지' : status === 'idle' ? '지금 살펴볼 코인 찾기' : '최신 가격으로 다시 찾기' : running ? 'Stop' : status === 'idle' ? 'Find coins to review' : 'Scan fresh prices'}</button>
    </div>
    <p className={styles.note}>{ko ? '활발히 거래되는 12개 중 조건을 확인한 최대 3개예요. 추천 순위나 수익 확률이 아닌, 거래대금 순서의 관심 후보입니다.' : 'Up to three qualifying candidates from 12 actively traded coins, ordered by turnover. This is a review list, not a return forecast.'}</p>
    {venue === 'binance-futures' && <p className={styles.risk}>{ko ? '선물 가격의 흐름만 확인해요. 실제 포지션의 레버리지·청산 위험은 내 포지션에서 따로 확인하세요.' : 'These are futures price trends. Review leverage and liquidation risk separately.'}</p>}
    <div role="status" aria-live="polite">
      {disabled ? (ko ? '실제 시세 연결이 필요해요. 설정에서 데이터 연결을 확인해주세요.' : 'Live data is required. Check the connection in settings.')
        : running ? <>{ko ? '가격 기록을 확인하고 있어요' : 'Checking price history'} · {progress.completed}/{progress.total || 12}<br /><progress max={progress.total || 12} value={progress.completed} /></>
          : status === 'error' ? (ko ? '시세 목록을 가져오지 못했어요. 다시 찾기를 눌러주세요.' : 'Quotes could not be loaded. Try again.')
            : status === 'cancelled' ? (ko ? `찾기를 멈췄어요. ${progress.completed}개만 확인한 부분 결과입니다.` : `Stopped after ${progress.completed} assets. These are partial results.`)
              : status === 'done' ? (ko ? `${progress.completed}개 확인 · 후보 ${selected.length}개` : `${progress.completed} reviewed · ${selected.length} candidates`) : null}
    </div>
    {selected.length === 0 && <div className={styles.empty}>
      <h2>{ko ? status === 'idle' ? '무엇을 살지 막막하다면' : running ? '조건이 맞는 종목부터 보여드릴게요' : status === 'error' || disabled ? '지금은 후보를 확인할 수 없어요' : '지금은 새 후보를 제시하지 않을게요' : status === 'idle' ? 'Start with a small shortlist' : running ? 'Qualifying assets will appear here' : status === 'error' || disabled ? 'Candidates are unavailable' : 'No new candidates to suggest right now'}</h2>
      <p>{ko ? status === 'idle' ? '한 번 눌러 가격 흐름, 거래량, 주의할 가격을 함께 확인하세요. 마음에 드는 종목은 현재 분석에서 다시 살펴볼 수 있어요.' : pendingData > 0 ? `${pendingData}개는 자료가 부족하거나 오래됐어요. 나머지에서도 모든 조건을 충족한 후보가 없어요. 후보가 없다는 것이 시장 전체의 하락 신호는 아니에요.` : '상승 흐름·거래량·가격 구간·위험 조건을 함께 확인해요. 조건을 충족하지 않으면 억지로 종목을 채우지 않아요.' : 'Candidates need a fresh upward trend, sufficient trading activity and a suitable price plan. An empty list is not a market-wide sell signal.'}</p>
    </div>}
    <div className={styles.cards}>{selected.map(result => {
      const { instrument, decision, analyzedAt } = result
      const guide = decisionGuide(decision, language)
      const plan = decision.plan!
      const price = (value: number) => formatAnalysisPrice(value, language)
      return <article className={styles.card} key={instrument.id}>
        <header><div><h2>{instrument.displaySymbol ?? instrument.symbol}</h2><small>{ko ? instrument.koreanName ?? instrument.name : instrument.name}</small></div><span>{ko ? '관심 후보' : 'For review'}</span></header>
        <h3>{guide.title}</h3><p>{guide.reason}</p>
        <div className={styles.answer}><small>{ko ? '이 구간에서 하락이 멈추는지 확인' : 'Check whether this area holds'}</small><strong>{plan.entry.map(price).join(' – ')} {instrument.quoteCurrency}</strong></div>
        <div className={styles.risk}>{ko ? '이 가격 아래로 마감하면 다시 판단해요' : 'Reassess on a close below'}<br /><b>{price(plan.stop)} {instrument.quoteCurrency}</b> · {plan.frame}</div>
        <footer><time dateTime={new Date(analyzedAt).toISOString()}>{new Date(analyzedAt).toLocaleTimeString(language)}</time><Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '지금 분석 확인' : 'Review now'} →</Link></footer>
      </article>
    })}</div>
    <details className={styles.note}><summary>{ko ? '어떤 기준으로 고르나요?' : 'How are candidates selected?'}</summary><p>{ko ? '완료된 가격 기록에서 상승 흐름, 평소 이상의 거래량, 관심 구간 안의 가격, 1.5 이상의 손익비를 함께 확인합니다. 과열과 확인된 반대 근거가 있으면 제외합니다. 시세 수신 후 90초가 지나면 후보에서 빠집니다. 매수 확정 신호가 아니며 가격에 닿은 뒤 지지 여부를 다시 확인해야 해요. 주식 자동 후보는 아직 제공하지 않으며 마켓에서 종목별로 살펴볼 수 있어요.' : 'Requires an upward trend, at least average volume, an entry-area price and reward/risk of at least 1.5. Extended moves and opposing context are excluded. Results expire 90 seconds after receipt and require a new review. Automatic stock candidates are not available; use Markets to review stocks individually.'}</p></details>
  </section>
}
