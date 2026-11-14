import { useEffect, useState, type ReactNode } from 'react'
import { MarketPanels } from '@/components/workspace/MarketPanels'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useCompactLayout } from '@/hooks/useCompactLayout'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { CryptoDecisionPanel } from '@/components/crypto-analysis/CryptoDecisionPanel'
import type { MarketCatalog, MarketInstrument, MarketVenue } from '@/types/market'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { ModeGuide } from './ModeGuide'
import { SimpleWorkspace } from './SimpleWorkspace'
import { coreCoinName, coreMarketCoins } from './coreMarketCoins'
import styles from './SimpleWorkspace.module.css'

interface Props {
  chart?: ReactNode; activity?: ReactNode;
  catalog: MarketCatalog | null; loading: boolean; error: string | null; venue: MarketVenue; onVenue: (venue: MarketVenue) => void;
  selected: MarketInstrument | null; onSelect: (instrument: MarketInstrument) => void; search: string; onSearch: (value: string) => void;
  favorites: ReadonlySet<string>; favoritesOnly: boolean; onFavoritesOnly: (value: boolean) => void; onFavorite: (id: string) => void; onRetry: () => void;
}
const venues: readonly [MarketVenue, string][] = [['upbit-krw', 'Upbit · KRW'], ['upbit-btc', 'Upbit · BTC'], ['upbit-usdt', 'Upbit · USDT'], ['binance-spot', 'Binance · Spot'], ['binance-futures', 'Binance · Futures'], ['kospi', 'KOSPI'], ['kosdaq', 'KOSDAQ'], ['nasdaq', 'NASDAQ'], ['nyse', 'NYSE']]

export function SimpleMarket(props: Props) {
  const { catalog, loading, error, venue, onVenue, selected, onSelect, search, onSearch, favorites, favoritesOnly, onFavoritesOnly, onFavorite, onRetry } = props
  const { language } = useLanguage(), ko = language === 'ko'
  const compact = useCompactLayout()
  const [detailView, setDetailView] = useState<'chart' | 'review'>('chart')
  const [showDetail, setShowDetail] = useState(false)
  const [params, setParams] = useSearchParams()
  const crypto = venue.startsWith('upbit-') || venue.startsWith('binance-')
  const allCoins = params.get('coins') === 'all'
  const query = search.trim().toLocaleLowerCase()
  const catalogItems = catalog?.venue === venue ? catalog.instruments : []
  const instruments = catalogItems.filter(item => (!favoritesOnly || favorites.has(item.id)) && (!query || [item.symbol, item.displaySymbol, item.name, item.koreanName, item.englishName, crypto ? coreCoinName(item, 'ko') : '', crypto ? coreCoinName(item, 'en') : ''].some(value => value?.toLocaleLowerCase().includes(query))))
  const core = crypto && !allCoins && !query && !favoritesOnly
  const shown = core ? coreMarketCoins(instruments) : instruments
  const listView = (all: boolean) => {
    const next = new URLSearchParams(params)
    if (all) next.set('coins', 'all'); else next.delete('coins')
    setParams(next)
    onSearch(''); onFavoritesOnly(false); setShowDetail(false)
  }
  const assetList = <section className={styles.list} data-list-mode={core ? 'core' : 'all'} aria-label={ko ? '종목 목록' : 'Assets'}>
        <p className={styles.note} role="status">{loading ? (ko ? '목록을 불러오고 있어요…' : 'Loading assets…') : core ? (ko ? `대표 코인 ${shown.length}개 · 고정 목록` : `${shown.length} core coins · fixed shortlist`) : `${shown.length} ${ko ? '개 종목' : 'assets'}`}</p>
        {core && <p className={styles.note}>{ko ? '쉽게 찾도록 고른 코인입니다. 시가총액 순위는 아니며, 선택한 시장에 있는 종목만 표시해요.' : 'A fixed navigation shortlist, not a market-cap ranking. Only assets listed in this market are shown.'}</p>}
        {shown.map(item => <div key={item.id} className={styles.row}>
          <button type="button" aria-pressed={item.id === selected?.id} onClick={() => { onSelect(item); setShowDetail(true) }}><span><strong>{item.displaySymbol ?? item.symbol}</strong>{' '}<small>{(crypto ? coreCoinName(item, language) : undefined) ?? (ko ? item.koreanName ?? item.name : item.name)}</small></span><span aria-hidden>→</span></button>
          <button type="button" aria-label={`${item.symbol} ${ko ? '관심종목' : 'favorite'}`} aria-pressed={favorites.has(item.id)} onClick={() => onFavorite(item.id)}>{favorites.has(item.id) ? '★' : '☆'}</button>
        </div>)}
        {!loading && !error && shown.length === 0 && <p>{core ? (ko ? '이 시장에는 대표 목록에 해당하는 코인이 없어요. 전체 코인 보기를 이용하세요.' : 'No core coins are listed in this market. Open all coins instead.') : ko ? '해당 종목이 없어요. 검색어나 관심종목 필터를 바꿔보세요.' : 'No matching assets. Try another name or filter.'}</p>}
      </section>
  const assetDetail = <section className={styles.tasks}>
    {compact && <button type="button" onClick={() => setShowDetail(false)}>← {ko ? '다른 종목 찾기' : 'Back to assets'}</button>}
    <div className={styles.choices} role="group" aria-label={ko ? '종목에서 볼 내용' : 'Asset view'}><button type="button" aria-pressed={detailView === 'chart'} onClick={() => setDetailView('chart')}>{ko ? '가격 차트' : 'Price chart'}</button><button type="button" aria-pressed={detailView === 'review'} onClick={() => setDetailView('review')}>{ko ? '흐름 요약' : 'Quick review'}</button></div>
    <div hidden={detailView !== 'chart'}>{props.chart}</div>
    {selected && <div hidden={detailView !== 'review'}><SimpleMarketAsset key={selected.id} instrument={selected} /></div>}
    <ModeGuide expert={{ ko: '호가·체결 내역과 상세 시세는 전문가모드에서 함께 볼 수 있어요.', en: 'Expert mode adds the order book, trades and detailed market statistics.' }} />
  </section>
  return <SimpleWorkspace compactHeading wide={!!props.chart} title={ko ? '궁금한 종목을 찾아보세요' : 'Find an asset you know'} description={ko ? '이름을 찾고, 하나를 골라 지금 확인할 내용을 읽어보세요.' : 'Search by name and select an asset to review.'}>
    {crypto && <div className={styles.coinMenu} role="group" aria-label={ko ? '코인 목록 선택' : 'Coin list'}><button type="button" aria-pressed={core} onClick={() => listView(false)}>{ko ? '대표 코인' : 'Core coins'}</button><button type="button" aria-pressed={!core} onClick={() => listView(true)}>{ko ? '전체 코인 보기' : 'View all coins'}</button></div>}
    <div className={styles.controls}>
      <label>{ko ? '시장 선택' : 'Market'}<select value={venue} onChange={event => { onVenue(event.target.value as MarketVenue); setShowDetail(false) }}>{venues.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {(!compact || !showDetail) && <><label>{ko ? '종목 이름' : 'Asset name'}<input type="search" value={search} onChange={event => onSearch(event.target.value)} placeholder={ko ? '예: 비트코인, BTC' : 'e.g. Bitcoin, BTC'} /></label><button type="button" aria-pressed={favoritesOnly} onClick={() => onFavoritesOnly(!favoritesOnly)}>{ko ? '관심종목만' : 'Favorites only'}</button></>}
      <button type="button" disabled={loading} onClick={onRetry}>{ko ? '시세 새로고침' : 'Refresh'}</button>
    </div>
    {catalog?.source === 'mock' && <p role="status" className={styles.risk}>{ko ? '예시 시세입니다. 실제 투자 판단에 사용할 수 없어요.' : 'Example quotes. These are not live investment data.'}</p>}
    {error && <p role="alert">{ko ? '시세를 가져오지 못했어요. 새로고침으로 다시 확인해주세요.' : 'Quotes unavailable. Please refresh.'}</p>}
    {props.chart && selected && (!compact || showDetail) ? <div className={styles.marketPanels}><MarketPanels navigator={compact ? undefined : assetList} detail={assetDetail} activity={undefined} /></div> : <div className={!compact ? styles.split : undefined}>
      {(!compact || !showDetail) && assetList}
      {selected && (!compact || showDetail) && assetDetail}
    </div>}
  </SimpleWorkspace>
}

function SimpleMarketAsset({ instrument }: { instrument: MarketInstrument }) {
  const { language } = useLanguage(), ko = language === 'ko'
  const { setDisplayMode } = useDisplayMode()
  const daily = useTechnicalLevelData(instrument, '1D')
  const crypto = ['upbit', 'binance-spot', 'binance-futures'].includes(instrument.marketId)
  const [clock, setClock] = useState(Date.now)
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 5000); return () => clearInterval(timer) }, [])
  const quoted = daily.connectionStatus === 'live' && daily.dataQuality === 'live' && daily.updatedAt != null && Number.isFinite(daily.updatedAt) && clock - daily.updatedAt <= 90_000 && daily.updatedAt <= clock + 5000
  return <>
    <header><h2>{instrument.symbol}</h2><p className={styles.note}>{ko ? instrument.koreanName ?? instrument.name : instrument.name} · {instrument.quoteCurrency}</p></header>
    {crypto ? <CryptoDecisionPanel instrument={instrument} daily={daily} language={language} expert={false} onExpert={() => setDisplayMode('expert')} investmentContent={<Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '내 평단가 입력하고 손익 확인' : 'Add my average price and review returns'} →</Link>} /> : <article className={styles.card}>
      <h3>{ko ? '이 주식의 가격부터 확인해요' : 'Start with this stock’s price'}</h3>
      <div className={styles.answer}><small>{quoted ? (ko ? '확인한 가격' : 'Fetched price') : (ko ? '실제 시세 확인 필요' : 'Live quote unavailable')}</small><strong>{quoted && daily.currentPrice !== null ? `${formatAnalysisPrice(daily.currentPrice, language)} ${instrument.quoteCurrency}` : '—'}</strong></div>
      <p>{ko ? '주식 시세와 분석은 연결된 자료 범위에서 제공돼요. 예시나 부족한 자료로 매수 후보를 만들지 않아요.' : 'Stock analysis depends on available data. Example or incomplete data is not used to suggest a buy.'}</p>
    </article>}
    <nav className={styles.actions}><Link to={`/my-analysis?instrumentId=${encodeURIComponent(instrument.id)}`}>{ko ? '내 상황에 맞춰 분석' : 'Review my situation'} →</Link><Link to="/portfolio">{ko ? '보유 종목으로 기록' : 'Record a holding'} →</Link></nav>
  </>
}
