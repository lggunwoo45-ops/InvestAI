import { useLanguage } from '@/i18n/useLanguage'
import { OpportunityBoard, ScanPoolControl } from '@/components/crypto-analysis/OpportunityPlans'
import type { ScanResult, ScanPoolMode } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { MarketVenue } from '@/types/market'
import styles from './SimpleWorkspace.module.css'

interface Props {
  results: readonly ScanResult[]; now: number; venue: MarketVenue; onVenue: (venue: MarketVenue) => void;
  status: 'idle' | 'loading' | 'scanning' | 'done' | 'cancelled' | 'error'; progress: { completed: number; total: number };
  poolMode: ScanPoolMode; onPoolMode: (mode: ScanPoolMode) => void;
  disabled: boolean; onStart: () => void; onCancel: () => void;
}
export function SimpleScanResults({ results, now, venue, onVenue, poolMode, onPoolMode, status, progress, disabled, onStart, onCancel }: Props) {
  const { language } = useLanguage(), ko = language === 'ko'
  const running = status === 'loading' || status === 'scanning'
  return <section className={styles.tasks} aria-label={ko ? '추천 후보' : 'Review candidates'}>
    <div className={styles.controls}>
      <label>{ko ? '어디서 거래하시나요?' : 'Where do you trade?'}<select value={venue} disabled={running} onChange={event => onVenue(event.target.value as MarketVenue)}>
        <option value="upbit-krw">Upbit · KRW</option><option value="upbit-btc">Upbit · BTC</option><option value="upbit-usdt">Upbit · USDT</option><option value="binance-spot">Binance · Spot · USDT</option><option value="binance-futures">Binance · Futures · USDT</option>
      </select></label>
      <ScanPoolControl value={poolMode} onChange={onPoolMode} disabled={running} language={language} />
      <button type="button" className={styles.primary} disabled={!running && disabled} onClick={running ? onCancel : onStart}>{ko ? running ? '찾기 중지' : status === 'idle' ? '지금 살펴볼 코인 찾기' : '최신 가격으로 다시 찾기' : running ? 'Stop' : status === 'idle' ? 'Find coins to review' : 'Scan fresh prices'}</button>
    </div>
    <p className={styles.note}>{ko ? '최대 12개를 검사해 상승 눌림·돌파·하락 속 반등 후보를 구분합니다. 각 그룹에서 최대 3개를 먼저 보여드려요.' : 'Scan up to 12 assets for pullbacks, breakouts and countertrend rebounds. Each group starts with up to three results.'}</p>
    {venue === 'binance-futures' && <p className={styles.risk}>{ko ? '선물 가격의 흐름만 확인해요. 실제 포지션의 레버리지·청산 위험은 내 포지션에서 따로 확인하세요.' : 'These are futures price trends. Review leverage and liquidation risk separately.'}</p>}
    <div role="status" aria-live="polite">
      {disabled ? (ko ? '실제 시세 연결이 필요해요. 설정에서 데이터 연결을 확인해주세요.' : 'Live data is required. Check the connection in settings.')
        : running ? <>{ko ? '가격 기록을 확인하고 있어요' : 'Checking price history'} · {progress.completed}/{progress.total || 12}<br /><progress max={progress.total || 12} value={progress.completed} /></>
          : status === 'error' ? (ko ? '시세 목록을 가져오지 못했어요. 다시 찾기를 눌러주세요.' : 'Quotes could not be loaded. Try again.')
            : status === 'cancelled' ? (ko ? `찾기를 멈췄어요. ${progress.completed}개만 확인한 부분 결과입니다.` : `Stopped after ${progress.completed} assets. These are partial results.`)
              : status === 'done' ? (ko ? `${progress.completed}개 검사 완료 · 아래에서 조건을 확인하세요` : `${progress.completed} reviewed · check conditions below`) : null}
    </div>
    {results.length > 0 ? <OpportunityBoard results={results} now={now} language={language} simple /> : status === 'idle' ? <div className={styles.empty}><h2>{ko ? '장세에 맞는 기회부터 찾아보세요' : 'Find opportunities for the current market'}</h2><p>{ko ? '거래량이 붙는 반등과 돌파를 따로 검사하고, 진입·손절·목표 가격과 아직 부족한 조건을 보여드려요. 상대 강세 우선은 거래대금 상위 48개 중 24시간 등락률이 높은 종목부터 검사해요. BTC 비교 표본을 포함하며 스테이블코인은 제외해요.' : 'Review rebounds and breakouts with volume confirmation, price levels and unmet conditions. Relative strength checks the top 24h movers among the 48 most liquid assets, including a BTC benchmark where available and excluding stablecoins.'}</p></div> : status === 'done' && <p>{ko ? '선택한 시장에서 유효한 거래 종목을 찾지 못했어요. 다른 마켓을 선택하거나 다시 검색하세요.' : 'No eligible assets were returned for this venue. Try another venue or rescan.'}</p>}
  </section>
}
