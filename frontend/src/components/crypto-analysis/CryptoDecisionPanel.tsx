import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { SaveScenario } from '@/components/scenarios/SaveScenario'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { useDominance } from '@/hooks/useDominance'
import { buildCryptoDecision, seriesMarketTime, tradeFlow, type AnalysisSeries, type SeriesIssue } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import type { Language } from '@/i18n/translations'
import { portfolioNumber as number } from '@/utils/formatPortfolio'
import styles from './CryptoDecisionPanel.module.css'

interface Props { instrument: MarketInstrument; daily: AnalysisSeries; language: Language; averagePrice?: number | null; quantity?: number; expert?: boolean; positionId?: string; detailsContent?: ReactNode; investmentContent?: ReactNode }
const tabs = ['summary', 'details', 'investment'] as const
type AnalysisTab = typeof tabs[number]
const text = {
  ko: {
    tabs: { summary: '핵심 요약', details: '상세 근거', investment: '내 투자' }, tabLabel: '코인 분석 보기', investmentHelp: '내 기준을 확인하고 이 분석을 시나리오로 저장하세요.',
    title: '지금의 방향과 가격 계획', direction: { buy: '매수 우세', neutral: '중립 · 방향 혼재', sell: '매도 우세', unavailable: '분석 데이터 확인 중' },
    target: '목표 기준가', sellTarget: '반등 매도 검토 기준', core: '핵심 근거', trendLabel: '추세', dataPending: '아직 시장 방향을 판단할 데이터가 충분하지 않습니다. 아래 연결 상태를 확인하세요.', details: '시간대별 지표·계산 근거', contextDetails: '큰 체결·비트코인 도미넌스', copy: '요약 복사', copied: '복사했습니다', copyError: '복사 기능을 사용할 수 없습니다', checked: '분석 시각', riskLabel: '주의할 점', stopHint: '기준 시간대 종가 이탈 시 재검토', noVolume: '거래량 비교 근거 확인 중', noReward: '가격 계획이 준비되면 표시합니다',
    action: { poorReward: '손익비가 낮아 더 유리한 진입 구간 대기', pullback: '추격보다 눌림 구간 대기', entry: '지지 확인 후 분할 매수 검토', reduce: '추가 매수보다 반등 시 축소 검토', wait: '방향 확인 전 신규 진입 대기', refresh: '확인된 시간대부터 살펴보세요' },
    frame: { '1H': '1시간', '4H': '4시간', '1D': '일봉' }, trend: { buy: '상승 추세', neutral: '횡보·혼재', sell: '하락 추세' },
    issue: { loading: '시세 준비 중', mock: '모의 데이터', disconnected: '연결 재시도 중', stale: '시세 갱신 지연', history: '완료 봉 50개 미만', gaps: '원본 봉 공백 · 분석 제외', range: '변동 범위 산정 불가' },
    connectingHelp: '업비트 요청 제한에 맞춰 시간대별 데이터를 준비하고 있습니다. 최초 연결은 수십 초 걸릴 수 있으며, 연결된 분석은 잠깐 다른 화면에 다녀와도 이어집니다.',
    reconnectHelp: '시세 연결을 복구하고 있습니다. 연결이 돌아오면 봉 기록을 다시 확인한 뒤 분석을 갱신합니다.',
    gapHelp: '누락 구간은 임의로 채우지 않습니다. 정상 시간대가 2개 이상이면 해당 근거로 분석을 제공합니다.', gapRange: '원본 데이터가 없는 구간',
    live: '실제 시세', coverage: '시간대 확인', reason: '왜 이렇게 보나요?', contrary: '반대 근거도 확인하세요', mixed: '시간대별 방향이 달라 큰 흐름과 단기 움직임이 충돌합니다.', extended: 'RSI 과열 또는 이동평균 대비 이격이 커 추격 매수에 불리합니다.', lowVolume: '최근 완료 봉의 거래량이 평소보다 적어 추세 확인이 약합니다.', balanced: '추세가 유지돼도 지지 이탈이나 거래량 감소가 나타나면 다시 판단해야 합니다.',
    entry: '매수 관심 구간', resistance: '반등 매도 검토 · 저항 구간', stop: '매수 가정 해제 기준', sellInvalidation: '매도 우세 재검토 기준', rr: '관심 구간 중간값 기준 손익비', atrTarget: '관측 저항 없음 · ATR 2배 확장 기준', observed: '완료 봉의 관측 저항 기준', provisional: '피벗 지지 미확인 · 최근 저가를 임시 기준으로 사용', lowReward: '손익비가 1.5 미만입니다. 더 유리한 진입 가격이나 새로운 저항 구조를 기다리세요.', futures: '선물 종목의 가격 흐름입니다. 레버리지·펀딩비·청산 가격은 이 계획에 반영되지 않습니다.', condition: '관심 구간에서 지지를 확인한 뒤 검토합니다. 기준 시간대 종가가 아래 가격을 이탈하면 매수 가정을 다시 검토하세요.', bearish: '하락 추세 중 지지 가격에 닿았다는 이유만으로 매수하지 않습니다. 반등 저항과 추세 회복을 먼저 확인하세요.', invalidation: '기준 시간대 종가가 위 가격을 회복하면 매도 우세 해석을 다시 검토합니다.', noData: '시간대별 연결 상태를 확인하고 있습니다. 실제 시세와 완료 봉이 확보되는 대로 방향과 가격 계획을 표시합니다.', noPlan: '현재가 아래의 지지와 유효한 변동 폭이 확인되면 가격 구간을 표시합니다. 지금은 표시된 추세를 기준으로 대기하세요.',
    volume: '평소 대비 거래량', volatility: '평균 변동 폭 (ATR)', position: '내 보유 기준', pnl: '가정 해제 가격에서 평가손익', percent: '평단가 대비',
    flow: '큰 체결은 어느 쪽인가요?', flowLast: '최근 수신 체결 시각', flowStale: '체결 갱신 지연 · 우세 판단 보류', flowMissing: '5분 이내 유효 체결 10건과 대형 체결 3건이 필요합니다.', flowLabels: { buy: '대형 체결 매수 우세', sell: '대형 체결 매도 우세', neutral: '대형 체결 매수·매도 균형', unavailable: '대형 체결 표본 축적 중' }, buyShare: '대형 체결 금액 중 매수 비중', sample: '관측 표본', large: '대형 체결', threshold: '이번 표본의 대형 기준', flowNote: '선택 거래소 최근 최대 20건 중 상대적으로 큰 체결입니다. 전체 5분 거래나 고래 지갑의 매집·분산을 뜻하지 않습니다.',
    dominance: '비트코인 도미넌스', dominanceHelp: '전체 암호자산 시가총액에서 BTC가 차지하는 비중', dominanceLoading: '시장 전체 데이터 조회 중', dominanceError: '도미넌스 연결 불가 · 가격 분석은 계속 제공됩니다.', dominanceHistory: '이 브라우저의 비교 기록 축적 중 · 30분 이후부터 변화 비교', dominanceUp: 'BTC 비중 상승: 알트코인의 상대 약세 가능성을 함께 확인하세요.', dominanceDown: 'BTC 비중 하락: 알트코인으로 강세가 확산되는지 확인하세요.', dominanceFlat: '관측 기간의 BTC 비중 변화는 작습니다.', dominanceNote: '비중 상승이 BTC 가격 상승이나 실제 자금 유입을 의미하지는 않습니다. 단독 매수·매도 신호로 사용하지 않습니다.', marketChange: '전체 시가총액 24시간 변화', prior: '이 브라우저 관측 대비',
    detail: '계산 근거와 데이터 시점', close: '마지막 완료 봉', rule: '완료 봉의 20·50 이동평균 정렬을 1시간:4시간:일봉 = 1:2:3으로 합산합니다. 2개 이상 시간대와 방향 비중 50% 이상에서 우세를 표시합니다. RSI 14·ATR 14는 Wilder 방식이며, 거래량은 직전 20개 완료 봉 평균과 비교합니다.', note: '규칙 기반 가격 분석입니다. 우세는 수익 확률이 아니며 주문을 실행하지 않습니다. 가격 계획과 손익비는 수수료·세금·슬리피지 제외입니다.', demo: '모의 시세에서는 실제 매수·매도 우세와 가격 계획을 표시하지 않습니다.',
  },
  en: {
    tabs: { summary: 'Summary', details: 'Evidence', investment: 'My investment' }, tabLabel: 'Crypto analysis views', investmentHelp: 'Review your own criteria and save this analysis as a scenario.',
    title: 'Direction and price plan', direction: { buy: 'Buy-side bias', neutral: 'Neutral · mixed', sell: 'Sell-side bias', unavailable: 'Checking analysis data' },
    target: 'Target reference', sellTarget: 'Rebound sell-review reference', core: 'Key evidence', trendLabel: 'Trend', dataPending: 'There is not enough data to assess market direction yet. Check the connection status below.', details: 'Timeframe indicators and calculations', contextDetails: 'Large executions and Bitcoin dominance', copy: 'Copy summary', copied: 'Copied', copyError: 'Copy is unavailable', checked: 'Analysis time', riskLabel: 'Watch for', stopHint: 'Reassess on a reference-timeframe close below', noVolume: 'Checking volume evidence', noReward: 'Available when the price plan is ready',
    action: { poorReward: 'Wait for a better reward/risk entry', pullback: 'Wait for a pullback before chasing', entry: 'Consider staged entry after support holds', reduce: 'Review reducing on rebounds before adding', wait: 'Wait for direction before a new entry', refresh: 'Review the timeframes already available' },
    frame: { '1H': '1 hour', '4H': '4 hours', '1D': 'Daily' }, trend: { buy: 'Uptrend', neutral: 'Mixed / sideways', sell: 'Downtrend' },
    issue: { loading: 'Preparing quotes', mock: 'Mock data', disconnected: 'Reconnecting quotes', stale: 'Stale quotes', history: 'Fewer than 50 closed bars', gaps: 'Source bar gap · excluded', range: 'Volatility unavailable' },
    connectingHelp: 'Loading Upbit timeframes within request limits. The first connection can take tens of seconds. Connected analysis stays available during brief navigation away.',
    reconnectHelp: 'Restoring the quote connection. Candle history is checked again before analysis resumes.',
    gapHelp: 'Missing bars are not filled with estimates. Analysis uses the available evidence when at least two timeframes are valid.', gapRange: 'Missing source interval',
    live: 'Live quotes', coverage: 'Timeframes available', reason: 'What supports this view?', contrary: 'Counter-evidence', mixed: 'Timeframes disagree: the short move and broader trend conflict.', extended: 'RSI or distance from the moving average is extended; chasing needs caution.', lowVolume: 'The latest closed bar has less volume than its recent baseline.', balanced: 'Reassess the trend if support breaks or participation weakens.',
    entry: 'Entry watch zone', resistance: 'Rebound / sell review zone', stop: 'Long thesis invalidation', sellInvalidation: 'Sell-bias reassessment', rr: 'Reward / risk at zone midpoint', atrTarget: 'No observed resistance · 2 ATR extension reference', observed: 'Observed resistance from closed bars', provisional: 'No confirmed pivot support · recent low used provisionally', lowReward: 'Reward/risk is below 1.5. Wait for a better entry price or a new resistance structure.', futures: 'Futures price context. Leverage, funding and liquidation prices are not included in this plan.', condition: 'Review entry only after support holds in this zone. Reassess the long thesis if the reference timeframe closes below the following price.', bearish: 'Touching support alone is not an entry trigger during a downtrend. Check rebound resistance and trend recovery first.', invalidation: 'Reassess the sell-side view if the reference timeframe closes above this price.', noData: 'Checking timeframe connections. Direction and price plans appear when live quotes and enough closed bars are available.', noPlan: 'A price plan requires support below the current price and usable volatility. Wait using the available trend evidence.',
    volume: 'Relative volume', volatility: 'Average range (ATR)', position: 'Your holding basis', pnl: 'Unrealized P/L at invalidation', percent: 'Versus average price',
    flow: 'Which side has larger executions?', flowLast: 'Latest received execution time', flowStale: 'Delayed executions · bias withheld', flowMissing: 'Requires ten valid trades within five minutes, including at least three large trades.', flowLabels: { buy: 'Large trades: buy-side bias', sell: 'Large trades: sell-side bias', neutral: 'Large trades: balanced', unavailable: 'Collecting large-trade evidence' }, buyShare: 'Buy share of large-trade notional', sample: 'Observed sample', large: 'Large trades', threshold: 'Large threshold in this sample', flowNote: 'Relative large executions among up to 20 recent trades on this venue. This is not a complete five-minute tape or evidence of whale wallet accumulation/distribution.',
    dominance: 'Bitcoin dominance', dominanceHelp: 'BTC share of total cryptocurrency market capitalization', dominanceLoading: 'Loading global market data', dominanceError: 'Dominance unavailable · price analysis remains available.', dominanceHistory: 'Collecting local comparison history · changes available after 30 minutes', dominanceUp: 'BTC share is rising: check relative weakness in altcoins.', dominanceDown: 'BTC share is falling: check whether strength is broadening to altcoins.', dominanceFlat: 'BTC share changed little over the observed period.', dominanceNote: 'Rising share does not imply rising BTC price or actual capital inflows. It is not a standalone trade signal.', marketChange: 'Total market cap: 24h change', prior: 'Versus this browser’s observation',
    detail: 'Calculation and data timestamps', close: 'Last closed bar', rule: 'Closed-bar 20/50 moving-average alignment is weighted 1:2:3 for 1h/4h/daily. Bias requires at least two timeframes and a directional balance of 50%. RSI 14 and ATR 14 use Wilder smoothing. Volume compares with the previous 20 closed bars.', note: 'Rule-based price analysis. Bias is not a return probability and no orders are placed. Plans and reward/risk exclude fees, taxes and slippage.', demo: 'Mock quotes do not produce live directional labels or price plans.',
  },
} as const

export function CryptoDecisionPanel({ instrument, daily, language, averagePrice, quantity, expert = false, positionId, detailsContent, investmentContent }: Props) {
  const hourly = useTechnicalLevelData(instrument, '1H')
  const fourHourly = useTechnicalLevelData(instrument, '4H')
  const dominance = useDominance(daily.dataQuality === 'live')
  const [clock, setClock] = useState(Date.now)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [tab, setTab] = useState<AnalysisTab>('summary')
  const tabId = useId()
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer) }, [])
  // updatedAt is local receipt time; marketTime is the separate exchange clock.
  // Include receipts between timer ticks without advancing to an exchange timestamp.
  const now = Math.max(clock, hourly.updatedAt ?? 0, fourHourly.updatedAt ?? 0, daily.updatedAt ?? 0)
  const t = text[language]
  const decision = buildCryptoDecision({ '1H': hourly, '4H': fourHourly, '1D': daily }, now)
  const { plan } = decision
  const reference = decision.frames.find(r => r.frame === plan?.frame) ?? decision.frames.find(r => !r.issue)
  const marketNow = seriesMarketTime(daily, now)
  const flow = tradeFlow(daily.dataQuality === 'live' && daily.connectionStatus === 'live' ? daily.recentTrades ?? [] : [], marketNow)
  const latestTrade = daily.recentTrades?.find(trade => Number.isFinite(trade.timestamp) && trade.timestamp > 0)
  const global = dominance.data && now - dominance.data.point.at <= 3_600_000 ? dominance.data : null
  const delta = global?.previous ? global.point.percent - global.previous.percent : null
  const priceNumber = (n: number) => n.toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US', Math.abs(n) >= 10_000 ? { maximumFractionDigits: 0 } : Math.abs(n) >= 1 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 6 })
  const price = (n: number) => `${priceNumber(n)} ${instrument.quoteCurrency}`
  const range = (values: readonly [number, number]) => `${priceNumber(values[0])} – ${price(values[1])}`
  const date = (n: number) => new Date(n).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')
  const issue = (value: SeriesIssue) => t.issue[value]
  const pnl = plan && averagePrice && averagePrice > 0 && quantity && quantity > 0 ? (plan.stop - averagePrice) * quantity : null
  const trendSummary = decision.frames.filter(r => !r.issue).map(r => `${t.frame[r.frame]} ${t.trend[r.direction]}`).join(' · ')
  const volumeSummary = reference?.volumeRatio != null ? `${t.frame[reference.frame]} · ${reference.volumeRatio.toFixed(2)}×` : t.noVolume
  const caution = decision.direction === 'sell' ? t.bearish : decision.extended ? t.extended : decision.mixed ? t.mixed : reference?.volumeRatio != null && reference.volumeRatio < 0.6 ? t.lowVolume : t.balanced
  const copySummary = async () => {
    const lines = [instrument.symbol, `${t.checked}: ${date(now)}`, t.direction[decision.direction],
      decision.direction === 'unavailable' ? t.dataPending : t.action[decision.action],
      ...(plan ? [`${t.entry}: ${range(plan.entry)}`, `${decision.direction === 'sell' ? t.sellTarget : t.target}: ${price(plan.target)}`, `${t.stop}: ${price(plan.stop)} (${t.frame[plan.frame]})`, `${t.rr}: ${plan.rewardRisk.toFixed(2)} : 1`] : []),
      `${t.trendLabel}: ${trendSummary || decision.frames.map(r => `${t.frame[r.frame]} ${r.issue ? issue(r.issue) : t.trend[r.direction]}`).join(' · ')}`,
      `${t.volume}: ${volumeSummary}`, ...(decision.direction !== 'unavailable' ? [`${t.riskLabel}: ${caution}`] : []), t.note]
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopyState('copied') } catch { setCopyState('error') }
  }
  return <section className={styles.panel} aria-label={t.title} data-bias={decision.direction}>
    <header className={styles.heading}><div><span>CRYPTO ANALYSIS</span><h2>{t.title}</h2></div><div className={styles.tools}><small>{t.coverage} {decision.coverage}/3</small><button type="button" onClick={copySummary}>{t.copy}</button><small role="status">{copyState === 'copied' ? t.copied : copyState === 'error' ? t.copyError : ''}</small></div></header>
    <div className={styles.tabs} role="tablist" aria-label={t.tabLabel}>{tabs.map((value, index) => <button type="button" role="tab" key={value} id={`${tabId}-${value}`} aria-controls={`${tabId}-${value}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} ref={node => { tabButtons.current[index] = node }} onClick={() => setTab(value)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
      if (next === null) return
      event.preventDefault(); setTab(tabs[next]); tabButtons.current[next]?.focus()
    }}>{t.tabs[value]}</button>)}</div>
    <div className={styles.tabPanel} role="tabpanel" id={`${tabId}-summary-panel`} aria-labelledby={`${tabId}-summary`} hidden={tab !== 'summary'} tabIndex={0}>
    <div className={styles.verdict}><strong>{t.direction[decision.direction]}</strong><p>{decision.direction === 'unavailable' ? t.dataPending : t.action[decision.action]}</p>{decision.price !== null && <span>{t.live} · {price(decision.price)}</span>}</div>
    {daily.dataQuality === 'mock' && <p>{t.demo}</p>}
    {plan ? <>
      <div className={styles.prices}>
        <article><span>{t.entry}</span><strong>{range(plan.entry)}</strong>{plan.supportBasis === 'range' && <small>{t.provisional}</small>}</article>
        <article><span>{decision.direction === 'sell' ? t.sellTarget : t.target}</span><strong>{price(plan.target)}</strong><small>{plan.targetBasis === 'observed' ? t.observed : t.atrTarget}</small></article>
        <article className={styles.risk}><span>{t.stop}</span><strong>{price(plan.stop)}</strong><small>{t.frame[plan.frame]} · {t.stopHint}</small></article>
      </div>
      {plan.rewardRisk < 1.5 && <p className={styles.notice}>{t.lowReward}</p>}
    </> : decision.direction !== 'unavailable' && <p className={styles.notice}>{t.noPlan}</p>}
    {decision.coverage < 3 && <ul className={styles.dataIssues} aria-label={t.coverage}>{decision.frames.map(r => <li key={r.frame}>{t.frame[r.frame]} · {r.issue ? issue(r.issue) : t.trend[r.direction]}</li>)}</ul>}
    {decision.frames.some(r => r.issue === 'loading') && instrument.marketId === 'upbit' && <p className={styles.notice} role="status">{t.connectingHelp}</p>}
    {decision.frames.some(r => r.issue === 'disconnected' || r.issue === 'stale') && <p className={styles.notice} role="status">{t.reconnectHelp}</p>}
    {decision.frames.some(r => r.issue === 'gaps') && <p className={styles.notice}>{t.gapHelp}</p>}
    {decision.direction !== 'unavailable' && <p className={styles.caution}><strong>{t.riskLabel}</strong> · {caution}</p>}
    </div>
    <div className={styles.tabPanel} role="tabpanel" id={`${tabId}-details-panel`} aria-labelledby={`${tabId}-details`} hidden={tab !== 'details'} tabIndex={0}>
      <section className={styles.evidence} aria-label={t.core}><h3>{t.core}</h3><dl>
        <div><dt>{t.trendLabel}</dt><dd>{trendSummary || t.dataPending}</dd></div>
        <div><dt>{t.volume}</dt><dd>{volumeSummary}</dd></div>
        <div><dt>{t.rr}</dt><dd>{plan ? `${plan.rewardRisk.toFixed(2)} : 1` : t.noReward}</dd></div>
      </dl></section>
    <details className={styles.disclosure}><summary>{t.details}</summary>
      <div className={styles.frames}>{decision.frames.map(r => <article key={r.frame} data-trend={r.issue ? 'unavailable' : r.direction}><span>{t.frame[r.frame]}</span><strong>{r.issue ? issue(r.issue) : t.trend[r.direction]}</strong>{!r.issue && <small>RSI {r.rsi?.toFixed(1)} · {t.volume} {r.volumeRatio === null ? '—' : `${r.volumeRatio.toFixed(2)}×`} · ATR {price(r.atr!)}</small>}<small>{t.close}: {r.asOf === null ? '—' : date(r.asOf)} · {r.count} bars</small>{expert && !r.issue && <small>SMA20 {number(r.sma20!)} / SMA50 {number(r.sma50!)}</small>}</article>)}</div>
      {plan && <div className={styles.referencePrices}><p><strong>{t.resistance}</strong>: {range(plan.resistance)}</p>{decision.direction === 'sell' && <p><strong>{t.sellInvalidation}</strong>: {price(plan.sellInvalidation)} · {t.invalidation}</p>}<p>{t.condition}</p></div>}
      {decision.frames.filter(r => r.gap).map(r => <p key={r.frame}>{t.frame[r.frame]} · {t.gapRange}: {date(r.gap!.from)} – {date(r.gap!.to)} ({r.gap!.missing} {language === 'ko' ? '개 봉' : 'bars'})</p>)}
      <p>{t.rule}</p><small>{language === 'ko' ? '가격 구간: 최근 완료 봉의 지지·저항 ±0.25 ATR. 매수 가정 해제: 지지 −1 ATR.' : 'Zones: observed support/resistance ±0.25 ATR. Long invalidation: support −1 ATR.'}</small>
    </details>
    <details className={styles.disclosure}><summary>{t.contextDetails}</summary>
    <div className={styles.context}>
      <article aria-label={t.flow}><h3>{t.flow}</h3><strong>{flow.direction === 'unavailable' && latestTrade && marketNow - latestTrade.timestamp > 60_000 ? t.flowStale : t.flowLabels[flow.direction]}</strong>{flow.ratio !== null && <p>{t.buyShare}: {(flow.ratio * 100).toFixed(1)}%</p>}<p>{t.sample}: {flow.count} · {t.large}: {flow.largeCount}</p>{flow.threshold !== null && <small>{t.threshold}: {price(flow.threshold)}</small>}{flow.from !== null && flow.to !== null && <small>{date(flow.from)} – {date(flow.to)}</small>}<p>{t.flowNote}</p>{flow.direction === 'unavailable' && <small>{t.flowMissing}</small>}{latestTrade && <small>{t.flowLast}: {date(latestTrade.timestamp)}</small>}</article>
      <article aria-label={t.dominance}><h3>{t.dominance}</h3>{global ? <><strong>{global.point.percent.toFixed(2)}%</strong><p>{t.dominanceHelp}</p>{delta !== null && global.previous ? <><p>{t.prior}: {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%p<br />{date(global.previous.at)} → {date(global.point.at)}</p><p>{delta >= 0.15 ? t.dominanceUp : delta <= -0.15 ? t.dominanceDown : t.dominanceFlat}</p></> : <p>{t.dominanceHistory}</p>}<p>{t.marketChange}: {global.point.marketChange.toFixed(2)}%</p><small>{date(global.point.at)}</small></> : <p>{dominance.loading ? t.dominanceLoading : t.dominanceError}</p>}<a href="https://coinpaprika.com/overview" target="_blank" rel="noreferrer">CoinPaprika ↗</a><small>{t.dominanceNote}</small></article>
    </div>
    <small>{language === 'ko' ? '대형 체결: 표본 금액 상위 25%이면서 중앙값의 1.5배 이상, 3건 이상일 때 금액 비중으로 우세 표시.' : 'Large trades: top quartile and at least 1.5× median notional; bias requires at least three large executions.'}</small>
    </details>
    {detailsContent}
    </div>
    <div className={styles.tabPanel} role="tabpanel" id={`${tabId}-investment-panel`} aria-labelledby={`${tabId}-investment`} hidden={tab !== 'investment'} tabIndex={0}>
      <p>{t.investmentHelp}</p>
      {plan && averagePrice != null && Number.isFinite(averagePrice) && averagePrice > 0 && <div className={styles.position}><strong>{t.position}: {price(averagePrice)}</strong><span>{t.percent}: {((plan.stop / averagePrice - 1) * 100).toFixed(2)}%</span>{pnl !== null && Number.isFinite(pnl) && <span>{t.pnl}: {price(pnl)}</span>}</div>}
      <SaveScenario instrument={instrument} decision={decision} language={language} positionId={positionId} />
      {investmentContent}
    </div>
    <footer>{t.note}{instrument.marketId === 'binance-futures' && <p>{t.futures}</p>}</footer>
  </section>
}
