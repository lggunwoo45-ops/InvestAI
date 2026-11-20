import { useLanguage } from '@/i18n/useLanguage'
import { OpportunityBoard, ScanPoolControl } from '@/components/crypto-analysis/OpportunityPlans'
import { FuturesOpportunityBoard, ScanMarketMode } from '@/components/crypto-analysis/FuturesOpportunityBoard'
import type { ScanResult, ScanPoolMode } from '@/services/cryptoAnalysis/liveCandidateScan'
import type { MarketVenue } from '@/types/market'
import styles from './SimpleWorkspace.module.css'

interface Props {
  refreshing?: boolean;
  results: readonly ScanResult[]; now: number; venue: MarketVenue; onVenue: (venue: MarketVenue) => void;
  status: 'idle' | 'loading' | 'scanning' | 'done' | 'cancelled' | 'error'; progress: { completed: number; total: number };
  poolMode: ScanPoolMode; onPoolMode: (mode: ScanPoolMode) => void;
  disabled: boolean; onStart: () => void; onCancel: () => void;
}
export function SimpleScanResults({ results, now, venue, onVenue, poolMode, onPoolMode, status, progress, disabled, onStart, onCancel, refreshing }: Props) {
  const { language } = useLanguage(), ko = language === 'ko'
  const running = status === 'loading' || status === 'scanning'
  const futures = venue === 'binance-futures'
  return <section className={styles.tasks} aria-label={ko ? '추천 후보' : 'Review candidates'}>
    <ScanMarketMode venue={venue} onChange={onVenue} disabled={running} language={language} />
    <div className={styles.controls}>
      <label>{ko ? '어디서 거래하시나요?' : 'Where do you trade?'}<select value={venue} disabled={running} onChange={event => onVenue(event.target.value as MarketVenue)}>
        <option value="upbit-krw">Upbit · KRW</option><option value="upbit-btc">Upbit · BTC</option><option value="upbit-usdt">Upbit · USDT</option><option value="binance-spot">Binance · Spot · USDT</option><option value="binance-futures">Binance · Futures · USDT</option>
      </select></label>
      <ScanPoolControl value={poolMode} onChange={onPoolMode} disabled={running} language={language} futures={futures} />
      <button type="button" className={styles.primary} disabled={!running && disabled} onClick={running ? onCancel : onStart}>{ko ? running ? '찾기 중지' : status === 'idle' ? '지금 살펴볼 코인 찾기' : '최신 가격으로 다시 찾기' : running ? 'Stop' : status === 'idle' ? 'Find coins to review' : 'Scan fresh prices'}</button>
    </div>
    <p className={styles.note}>{futures ? ko ? '바이낸스 선물 최대 12개를 비교해 롱·숏 우선 후보를 각각 골라요. 단기 흐름을 먼저 포착하고, 진입할지 기다릴지는 따로 표시해요.' : 'Compare up to 12 Binance futures for early long and short candidates, with entry readiness shown separately.' : ko ? '최대 12개에서 단기 상승·반등 움직임이 보이는 코인을 먼저 찾아요. 매수 조건 충족, 가격 대기, 추가 확인을 구분하고 기다리는 이유도 보여드려요.' : 'Compare up to 12 assets for early strength and rebounds. Show the first three review candidates, with entry readiness and waiting reasons separately.'}</p>
    {venue === 'binance-futures' && <p className={styles.risk}>{ko ? '선물은 현물과 다른 거래입니다. 실제 포지션의 레버리지·청산 위험은 내 포지션에서 따로 확인하세요.' : 'Futures differ from spot trading. Review leverage and liquidation risk separately.'}</p>}
    <div role="status" aria-live="polite">
      {disabled ? (ko ? '실제 시세 연결이 필요해요. 설정에서 데이터 연결을 확인해주세요.' : 'Live data is required. Check the connection in settings.')
        : running ? <>{ko ? refreshing ? '지연되거나 오래된 자료를 한 번 더 확인하고 있어요' : '가격 기록을 확인하고 있어요' : 'Checking price history'} · {progress.completed}/{progress.total || 12}<br /><progress max={progress.total || 12} value={progress.completed} /></>
          : status === 'error' ? (ko ? '시세 목록을 가져오지 못했어요. 다시 찾기를 눌러주세요.' : 'Quotes could not be loaded. Try again.')
            : status === 'cancelled' ? (ko ? `찾기를 멈췄어요. ${progress.completed}개만 확인한 부분 결과입니다.` : `Stopped after ${progress.completed} assets. These are partial results.`)
              : status === 'done' ? (ko ? `${progress.completed}개 검사 완료 · 아래에서 조건을 확인하세요` : `${progress.completed} reviewed · check conditions below`) : null}
    </div>
    {results.length > 0 ? futures ? <FuturesOpportunityBoard results={results} now={now} language={language} simple onRefresh={running ? undefined : onStart} /> : <OpportunityBoard results={results} now={now} language={language} active={poolMode === 'active'} simple canRecord={status === 'done'} onRefresh={running ? undefined : onStart} /> : status === 'idle' ? <div className={styles.empty}><h2>{futures ? ko ? '하락장에서도 숏 후보를 찾아보세요' : 'Explore short candidates in falling markets' : ko ? '장세에 맞는 기회부터 찾아보세요' : 'Find opportunities for the current market'}</h2><p>{futures ? ko ? '상승은 롱, 하락은 숏 관점으로 진입·손절·목표와 남은 조건을 확인해요.' : 'Review entries, stops, targets and pending conditions for both long and short setups.' : ko ? '강한 종목과 반등 가능성을 함께 살펴보고, 관심 가격과 손절 기준을 확인해요.' : 'Review strength and potential rebounds, then check the watch price and stop level.'}</p><details><summary>{ko ? '12개는 어떻게 고르나요?' : 'How are the 12 selected?'}</summary><p>{futures ? ko ? '적극 탐색은 거래대금 상위 48개에서 상대적으로 강한 종목과 약한 종목을 번갈아 최대 12개 고릅니다. 모두 상승한 날에도 상대 약세 종목을 포함해요. 이후 완료된 봉으로 롱·숏 우선 후보를 각각 고르고, 진입 조건 충족과 대기를 나눠 표시합니다. BTC 비교 표본을 포함하며 스테이블코인은 제외합니다.' : 'Active futures discovery alternates relative strength and weakness among the 48 most liquid assets, up to 12, even when every asset rose. Closed bars then rank long and short review candidates separately from entry readiness. Includes a BTC benchmark when available; stablecoins are excluded.' : ko ? '적극 탐색은 거래대금 상위 48개에서 강한 종목과 하락한 종목을 함께 골라요. 하락했다는 이유만으로 추천하지 않고 거래량이 붙는 반등과 돌파를 따로 검사하고, 진입·손절·목표 가격과 아직 부족한 조건을 보여드려요. 상대 강세 우선은 거래대금 상위 48개 중 24시간 등락률이 높은 종목부터 검사해요. BTC 비교 표본을 포함하며 스테이블코인은 제외해요.' : 'Active discovery samples stronger and falling assets among the 48 most liquid. A decline alone is not a recommendation. Review rebounds and breakouts with volume confirmation, price levels and unmet conditions. Relative strength checks the top 24h movers among the 48 most liquid assets, including a BTC benchmark where available and excluding stablecoins.'}</p></details></div> : status === 'done' && <p>{ko ? '선택한 시장에서 유효한 거래 종목을 찾지 못했어요. 다른 마켓을 선택하거나 다시 검색하세요.' : 'No eligible assets were returned for this venue. Try another venue or rescan.'}</p>}
  </section>
}
