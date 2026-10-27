import { withMarketContext, contextExplanation } from '@/services/cryptoAnalysis/marketContext'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { SaveScenario } from '@/components/scenarios/SaveScenario'
import { useTechnicalLevelData } from '@/hooks/useTechnicalLevelData'
import { useDominance } from '@/hooks/useDominance'
import { buildCryptoDecision, type AnalysisSeries, type SeriesIssue } from '@/services/cryptoAnalysis/cryptoDecisionEngine'
import type { MarketInstrument } from '@/types/market'
import type { Language } from '@/i18n/translations'
import { portfolioNumber as number } from '@/utils/formatPortfolio'
import { formatAnalysisPrice } from '@/utils/formatAnalysisPrice'
import { decisionGuide, easyDirection } from '@/services/cryptoAnalysis/decisionGuide'
import type { AnalysisTab } from '@/services/myAnalysis/analysisSession'
import styles from './CryptoDecisionPanel.module.css'
import { AnalysisPreparation } from './AnalysisPreparation'
import { CryptoExpertOverview } from './CryptoExpertOverview'

interface Props { instrument: MarketInstrument; daily: AnalysisSeries; language: Language; averagePrice?: number | null; quantity?: number; expert?: boolean; onExpert?: () => void; holding?: boolean; onHoldingChange?: (holding: boolean) => void; positionId?: string; detailsContent?: ReactNode; investmentContent?: ReactNode; activeTab?: AnalysisTab; onTabChange?: (tab: AnalysisTab) => void }
const tabs = ['summary', 'details', 'investment'] as const
const text = {
  ko: {
    tabs: { summary: '한눈에 보기', details: '자세히 보기', investment: '내 평단가·가격 기준' }, tabLabel: '코인 분석 보기', investmentHelp: '이 종목의 평단가를 입력하거나 관심 가격을 저장하세요. 보유 코인 전체는 ‘내 투자’ 메뉴에서 관리해요.',
    title: '지금의 방향과 가격 계획', direction: { buy: '매수 우세', neutral: '중립 · 방향 혼재', sell: '매도 우세', unavailable: '분석 데이터 확인 중' },
    target: '저항 기준 가격', sellTarget: '저항 기준 가격', core: '핵심 근거', trendLabel: '추세', dataPending: '아직 시장 방향을 판단할 데이터가 충분하지 않습니다. 아래 연결 상태를 확인하세요.', details: '시간대별 지표·계산 근거', contextDetails: '큰 체결·비트코인 도미넌스', copy: '요약 복사', copied: '복사했습니다', copyError: '복사 기능을 사용할 수 없습니다', checked: '분석 시각', riskLabel: '주의할 점', stopHint: '기준 시간대 종가 이탈 시 재검토', noVolume: '거래량 비교 근거 확인 중', noReward: '가격 계획이 준비되면 표시합니다',
    action: { poorReward: '손익비가 낮아 더 유리한 진입 구간 대기', pullback: '추격보다 눌림 구간 대기', entry: '지지 확인 후 분할 매수 검토', reduce: '추가 매수보다 반등 시 축소 검토', wait: '방향 확인 전 신규 진입 대기', refresh: '확인된 시간대부터 살펴보세요' },
    frame: { '1H': '1시간', '4H': '4시간', '1D': '일봉' }, trend: { buy: '상승 추세', neutral: '횡보·혼재', sell: '하락 추세' },
    issue: { loading: '시세 준비 중', mock: '모의 데이터', disconnected: '연결 재시도 중', stale: '시세 갱신 지연', history: '완료 봉 50개 미만', gaps: '원본 봉 공백 · 분석 제외', range: '변동 범위 산정 불가' },
    connectingHelp: '업비트 요청 제한에 맞춰 시간대별 데이터를 준비하고 있습니다. 최초 연결은 수십 초 걸릴 수 있으며, 연결된 분석은 잠깐 다른 화면에 다녀와도 이어집니다.',
    reconnectHelp: '시세 연결을 복구하고 있습니다. 연결이 돌아오면 봉 기록을 다시 확인한 뒤 분석을 갱신합니다.',
    gapHelp: '누락 구간은 임의로 채우지 않습니다. 정상 시간대가 2개 이상이면 해당 근거로 분석을 제공합니다.', gapRange: '원본 데이터가 없는 구간',
    live: '실제 시세', coverage: '시간대 확인', reason: '왜 이렇게 보나요?', contrary: '반대 근거도 확인하세요', mixed: '시간대별 방향이 달라 큰 흐름과 단기 움직임이 충돌합니다.', extended: 'RSI 과열 또는 이동평균 대비 이격이 커 추격 매수에 불리합니다.', lowVolume: '최근 완료 봉의 거래량이 평소보다 적어 추세 확인이 약합니다.', balanced: '추세가 유지돼도 지지 이탈이나 거래량 감소가 나타나면 다시 판단해야 합니다.',
    entry: '지지 구간', resistance: '저항 구간', stop: '추가 하락 주의선', sellInvalidation: '상승 돌파 확인선', rr: '관심 구간 중간값 기준 손익비', atrTarget: '관측 저항 없음 · ATR 2배 확장 기준', observed: '완료 봉의 관측 저항 기준', provisional: '피벗 지지 미확인 · 최근 저가를 임시 기준으로 사용', lowReward: '손익비가 1.5 미만입니다. 더 유리한 진입 가격이나 새로운 저항 구조를 기다리세요.', futures: '선물 종목의 가격 흐름입니다. 레버리지·펀딩비·청산 가격은 이 계획에 반영되지 않습니다.', condition: '관심 구간에서 지지를 확인한 뒤 검토합니다. 기준 시간대 종가가 아래 가격을 이탈하면 매수 가정을 다시 검토하세요.', bearish: '하락 추세 중 지지 가격에 닿았다는 이유만으로 매수하지 않습니다. 반등 저항과 추세 회복을 먼저 확인하세요.', invalidation: '기준 시간대 종가가 위 가격을 회복하면 매도 우세 해석을 다시 검토합니다.', noData: '시간대별 연결 상태를 확인하고 있습니다. 실제 시세와 완료 봉이 확보되는 대로 방향과 가격 계획을 표시합니다.', noPlan: '현재가 아래의 지지와 유효한 변동 폭이 확인되면 가격 구간을 표시합니다. 지금은 표시된 추세를 기준으로 대기하세요.',
    volume: '평소 대비 거래량', volatility: '평균 변동 폭 (ATR)', position: '내 평단가', pnl: '주의 가격에서 예상 손익', percent: '주의 가격에서 예상 수익률',
    flow: '큰 체결은 어느 쪽인가요?', flowLast: '최근 수신 체결 시각', flowStale: '체결 갱신 지연 · 우세 판단 보류', flowMissing: '5분 이내 유효 체결 10건과 대형 체결 3건이 필요합니다.', flowLabels: { buy: '대형 체결 매수 우세', sell: '대형 체결 매도 우세', neutral: '대형 체결 매수·매도 균형', unavailable: '대형 체결 표본 축적 중' }, buyShare: '대형 체결 금액 중 매수 비중', sample: '관측 표본', large: '대형 체결', threshold: '이번 표본의 대형 기준', flowNote: '선택 거래소 최근 최대 20건 중 상대적으로 큰 체결입니다. 전체 5분 거래나 고래 지갑의 매집·분산을 뜻하지 않습니다.',
    dominance: '비트코인 도미넌스', dominanceHelp: '전체 암호자산 시가총액에서 BTC가 차지하는 비중', dominanceLoading: '시장 전체 데이터 조회 중', dominanceError: '도미넌스 연결 불가 · 가격 분석은 계속 제공됩니다.', dominanceHistory: '이 브라우저의 비교 기록 축적 중 · 30분 이후부터 변화 비교', dominanceUp: 'BTC 비중 상승: 알트코인의 상대 약세 가능성을 함께 확인하세요.', dominanceDown: 'BTC 비중 하락: 알트코인으로 강세가 확산되는지 확인하세요.', dominanceFlat: '관측 기간의 BTC 비중 변화는 작습니다.', dominanceNote: '비중 상승이 BTC 가격 상승이나 실제 자금 유입을 의미하지는 않습니다. 단독 매수·매도 신호로 사용하지 않습니다.', marketChange: '전체 시가총액 24시간 변화', prior: '이 브라우저 관측 대비',
    detail: '계산 근거와 데이터 시점', close: '마지막 완료 봉', rule: '완료 봉의 20·50 이동평균 정렬을 1시간:4시간:일봉 = 1:2:3으로 합산합니다. 2개 이상 시간대와 방향 비중 50% 이상에서 우세를 표시합니다. RSI 14·ATR 14는 Wilder 방식이며, 거래량은 직전 20개 완료 봉 평균과 비교합니다.', note: '규칙 기반 가격 분석입니다. 우세는 수익 확률이 아니며 주문을 실행하지 않습니다. 가격 계획과 손익비는 수수료·세금·슬리피지 제외입니다.', demo: '모의 시세에서는 실제 매수·매도 우세와 가격 계획을 표시하지 않습니다.',
  },
  en: {
    tabs: { summary: 'Summary', details: 'Evidence', investment: 'My price criteria' }, tabLabel: 'Crypto analysis views', investmentHelp: 'Review your own criteria and save this analysis as a scenario.',
    title: 'Direction and price plan', direction: { buy: 'Buy-side bias', neutral: 'Neutral · mixed', sell: 'Sell-side bias', unavailable: 'Checking analysis data' },
    target: 'Resistance reference price', sellTarget: 'Resistance reference price', core: 'Key evidence', trendLabel: 'Trend', dataPending: 'There is not enough data to assess market direction yet. Check the connection status below.', details: 'Timeframe indicators and calculations', contextDetails: 'Large executions and Bitcoin dominance', copy: 'Copy summary', copied: 'Copied', copyError: 'Copy is unavailable', checked: 'Analysis time', riskLabel: 'Watch for', stopHint: 'Reassess on a reference-timeframe close below', noVolume: 'Checking volume evidence', noReward: 'Available when the price plan is ready',
    action: { poorReward: 'Wait for a better reward/risk entry', pullback: 'Wait for a pullback before chasing', entry: 'Consider staged entry after support holds', reduce: 'Review reducing on rebounds before adding', wait: 'Wait for direction before a new entry', refresh: 'Review the timeframes already available' },
    frame: { '1H': '1 hour', '4H': '4 hours', '1D': 'Daily' }, trend: { buy: 'Uptrend', neutral: 'Mixed / sideways', sell: 'Downtrend' },
    issue: { loading: 'Preparing quotes', mock: 'Mock data', disconnected: 'Reconnecting quotes', stale: 'Stale quotes', history: 'Fewer than 50 closed bars', gaps: 'Source bar gap · excluded', range: 'Volatility unavailable' },
    connectingHelp: 'Loading Upbit timeframes within request limits. The first connection can take tens of seconds. Connected analysis stays available during brief navigation away.',
    reconnectHelp: 'Restoring the quote connection. Candle history is checked again before analysis resumes.',
    gapHelp: 'Missing bars are not filled with estimates. Analysis uses the available evidence when at least two timeframes are valid.', gapRange: 'Missing source interval',
    live: 'Live quotes', coverage: 'Timeframes available', reason: 'What supports this view?', contrary: 'Counter-evidence', mixed: 'Timeframes disagree: the short move and broader trend conflict.', extended: 'RSI or distance from the moving average is extended; chasing needs caution.', lowVolume: 'The latest closed bar has less volume than its recent baseline.', balanced: 'Reassess the trend if support breaks or participation weakens.',
    entry: 'Support zone', resistance: 'Resistance zone', stop: 'Downside risk threshold', sellInvalidation: 'Upside breakout threshold', rr: 'Reward / risk at zone midpoint', atrTarget: 'No observed resistance · 2 ATR extension reference', observed: 'Observed resistance from closed bars', provisional: 'No confirmed pivot support · recent low used provisionally', lowReward: 'Reward/risk is below 1.5. Wait for a better entry price or a new resistance structure.', futures: 'Futures price context. Leverage, funding and liquidation prices are not included in this plan.', condition: 'Review entry only after support holds in this zone. Reassess the long thesis if the reference timeframe closes below the following price.', bearish: 'Touching support alone is not an entry trigger during a downtrend. Check rebound resistance and trend recovery first.', invalidation: 'Reassess the sell-side view if the reference timeframe closes above this price.', noData: 'Checking timeframe connections. Direction and price plans appear when live quotes and enough closed bars are available.', noPlan: 'A price plan requires support below the current price and usable volatility. Wait using the available trend evidence.',
    volume: 'Relative volume', volatility: 'Average range (ATR)', position: 'Your holding basis', pnl: 'Unrealized P/L at invalidation', percent: 'Versus average price',
    flow: 'Which side has larger executions?', flowLast: 'Latest received execution time', flowStale: 'Delayed executions · bias withheld', flowMissing: 'Requires ten valid trades within five minutes, including at least three large trades.', flowLabels: { buy: 'Large trades: buy-side bias', sell: 'Large trades: sell-side bias', neutral: 'Large trades: balanced', unavailable: 'Collecting large-trade evidence' }, buyShare: 'Buy share of large-trade notional', sample: 'Observed sample', large: 'Large trades', threshold: 'Large threshold in this sample', flowNote: 'Relative large executions among up to 20 recent trades on this venue. This is not a complete five-minute tape or evidence of whale wallet accumulation/distribution.',
    dominance: 'Bitcoin dominance', dominanceHelp: 'BTC share of total cryptocurrency market capitalization', dominanceLoading: 'Loading global market data', dominanceError: 'Dominance unavailable · price analysis remains available.', dominanceHistory: 'Collecting local comparison history · changes available after 30 minutes', dominanceUp: 'BTC share is rising: check relative weakness in altcoins.', dominanceDown: 'BTC share is falling: check whether strength is broadening to altcoins.', dominanceFlat: 'BTC share changed little over the observed period.', dominanceNote: 'Rising share does not imply rising BTC price or actual capital inflows. It is not a standalone trade signal.', marketChange: 'Total market cap: 24h change', prior: 'Versus this browser’s observation',
    detail: 'Calculation and data timestamps', close: 'Last closed bar', rule: 'Closed-bar 20/50 moving-average alignment is weighted 1:2:3 for 1h/4h/daily. Bias requires at least two timeframes and a directional balance of 50%. RSI 14 and ATR 14 use Wilder smoothing. Volume compares with the previous 20 closed bars.', note: 'Rule-based price analysis. Bias is not a return probability and no orders are placed. Plans and reward/risk exclude fees, taxes and slippage.', demo: 'Mock quotes do not produce live directional labels or price plans.',
  },
} as const

export function CryptoDecisionPanel({ instrument, daily, language, averagePrice, quantity, expert = false, onExpert, holding: holdingInput, onHoldingChange, positionId, detailsContent, investmentContent, activeTab, onTabChange }: Props) {
  const hourly = useTechnicalLevelData(instrument, '1H')
  const fourHourly = useTechnicalLevelData(instrument, '4H')
  const dominance = useDominance(daily.dataQuality === 'live')
  const [clock, setClock] = useState(Date.now)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [localTab, setLocalTab] = useState<AnalysisTab>('summary')
  const tab = activeTab ?? localTab
  const setTab = (next: AnalysisTab) => { setLocalTab(next); onTabChange?.(next) }
  const tabId = useId()
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([])
  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 10_000); return () => clearInterval(timer) }, [])
  // updatedAt is local receipt time; marketTime is the separate exchange clock.
  // Include receipts between timer ticks without advancing to an exchange timestamp.
  const now = Math.max(clock, hourly.updatedAt ?? 0, fourHourly.updatedAt ?? 0, daily.updatedAt ?? 0)
  const t = text[language]
  const ko = language === 'ko'
  const series = { '1H': hourly, '4H': fourHourly, '1D': daily }
  const decision = withMarketContext(buildCryptoDecision(series, now), series, instrument, dominance.data, now)
  const { plan } = decision
  const holding = holdingInput ?? (averagePrice != null && Number.isFinite(averagePrice) && averagePrice > 0)
  const reviewAbove = decision.direction === 'sell' && !holding
  const guide = decisionGuide(decision, language, holding)
  const reference = decision.frames.find(r => r.frame === plan?.frame) ?? decision.frames.find(r => !r.issue)
  const flow = decision.context!.flowSample
  const global = dominance.data && now - dominance.data.point.at <= 3_600_000 ? dominance.data : null
  const delta = global?.previous ? global.point.percent - global.previous.percent : null
  const priceNumber = (n: number) => formatAnalysisPrice(n, language)
  const price = (n: number) => `${priceNumber(n)} ${instrument.quoteCurrency}`
  const range = (values: readonly [number, number]) => `${priceNumber(values[0])} – ${price(values[1])}`
  const date = (n: number) => new Date(n).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')
  const issue = (value: SeriesIssue) => t.issue[value]
  const pnl = plan && averagePrice && averagePrice > 0 && quantity && quantity > 0 ? (plan.stop - averagePrice) * quantity : null
  const currentPnl = decision.direction !== 'unavailable' && decision.price !== null && averagePrice != null && Number.isFinite(averagePrice) && averagePrice > 0 && quantity != null && Number.isFinite(quantity) && quantity > 0 ? (decision.price - averagePrice) * quantity : null
  const trendSummary = decision.frames.filter(r => !r.issue).map(r => `${t.frame[r.frame]} ${t.trend[r.direction]}`).join(' · ')
  const volumeSummary = reference?.volumeRatio != null ? `${t.frame[reference.frame]} · ${reference.volumeRatio.toFixed(2)}×` : t.noVolume
  const caution = contextExplanation(decision.context, ko) || (decision.direction === 'sell' ? t.bearish : decision.extended ? t.extended : decision.mixed ? t.mixed : reference?.volumeRatio != null && reference.volumeRatio < 0.6 ? t.lowVolume : t.balanced)
  const copySummary = async () => {
    const lines = [instrument.symbol, `${t.checked}: ${date(now)}`, easyDirection[language][decision.direction],
      guide.title, guide.reason, guide.next,
      ...(plan ? [`${t.entry}: ${range(plan.entry)}`, `${t.resistance}: ${range(plan.resistance)} (${plan.targetBasis === 'observed' ? t.observed : t.atrTarget})`, `${t.target}: ${price(plan.target)}`, `${t.stop}: ${price(plan.stop)} (${t.frame[plan.frame]} ${ko ? '종가가 아래일 때' : 'close below'})`, ...(decision.direction === 'sell' ? [`${t.sellInvalidation}: ${price(plan.sellInvalidation)} (${t.frame[plan.frame]} ${ko ? '종가가 위일 때' : 'close above'})`] : []), `${t.rr}: ${plan.rewardRisk.toFixed(2)} : 1`] : []),
      `${t.trendLabel}: ${trendSummary || decision.frames.map(r => `${t.frame[r.frame]} ${r.issue ? issue(r.issue) : t.trend[r.direction]}`).join(' · ')}`,
      `${t.volume}: ${volumeSummary}`, ...(decision.direction !== 'unavailable' ? [`${t.riskLabel}: ${caution}`] : []), t.note]
    try { await navigator.clipboard.writeText(lines.join('\n')); setCopyState('copied') } catch { setCopyState('error') }
  }
  return <section className={styles.panel} aria-label={t.title} data-bias={decision.direction} data-display-mode={expert ? 'expert' : 'simple'} data-tab={tab}>
    <header className={styles.heading}>{expert && <h2>{ko ? '지금 무엇을 보면 될까요?' : 'What should I look at now?'}</h2>}<div className={styles.tools}><button type="button" onClick={copySummary}>{t.copy}</button><small role="status">{copyState === 'copied' ? t.copied : copyState === 'error' ? t.copyError : ''}</small></div></header>
    <div className={styles.tabs} role="tablist" aria-label={t.tabLabel}>{tabs.map((value, index) => <button type="button" role="tab" key={value} id={`${tabId}-${value}`} aria-controls={`${tabId}-${value}-panel`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} ref={node => { tabButtons.current[index] = node }} onClick={() => setTab(value)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
      if (next === null) return
      event.preventDefault(); setTab(tabs[next]); tabButtons.current[next]?.focus()
    }}>{t.tabs[value]}</button>)}</div>
    <div className={styles.tabPanel} role="tabpanel" id={`${tabId}-summary-panel`} aria-labelledby={`${tabId}-summary`} hidden={tab !== 'summary'} tabIndex={0}>
    {onHoldingChange && <div className={styles.purpose} role="group" aria-label={ko ? '어떤 상황인가요?' : 'Your situation'}>
      <button type="button" aria-pressed={!holding} onClick={() => onHoldingChange(false)}>{ko ? '새로 살까 해요' : 'Considering a buy'}</button>
      <button type="button" aria-pressed={holding} onClick={() => onHoldingChange(true)}>{ko ? '이미 갖고 있어요' : 'Already holding'}</button>
    </div>}
    <AnalysisPreparation key={`${instrument.id}:${daily.dataQuality === 'mock'}`} decision={decision} series={series} language={language} compactReady onDetails={() => setTab('details')} />
    {decision.direction !== 'unavailable' && <div className={styles.verdict}>
      <span className={styles.direction}>{easyDirection[language][decision.direction]}</span>
      <h3>{guide.title}</h3>
      <p>{guide.reason}</p>
    </div>}
    {holding && !positionId && <p className={styles.notice}>{ko ? '보유 상황에 맞춘 설명이에요. 실제 보유 기록은 ‘내 투자’에서 저장해주세요.' : 'This changes the explanation only. Save the actual holding in My Investments.'}</p>}
    {holding && <div className={styles.holdingSummary}>
      {averagePrice != null && Number.isFinite(averagePrice) && averagePrice > 0
        ? <span>{ko ? '내 평단가' : 'My average price'} <strong>{price(averagePrice)}</strong>{decision.direction !== 'unavailable' && decision.price !== null && <> · {ko ? '현재 가격 기준' : 'At current price'} <strong>{((decision.price / averagePrice - 1) * 100).toFixed(2)}%</strong></>}{currentPnl !== null && Number.isFinite(currentPnl) && <span className={styles.currentPnl}> · {ko ? '평가손익' : 'Unrealized P/L'} <strong>{currentPnl > 0 ? '+' : ''}{price(currentPnl)}</strong></span>}</span>
        : <span>{ko ? '평단가를 입력하면 내 손익도 함께 볼 수 있어요.' : 'Add your average price to see your return.'}</span>}
      <button type="button" onClick={() => setTab('investment')}>{ko ? '내 평단가 입력·수정' : 'Edit my average price'} →</button>
    </div>}
    {plan ? <>
      <div className={styles.prices}>
        <article aria-label={t.entry}><span>{t.entry}</span>
          <strong>{range(plan.entry)}</strong>
          <small>{ko ? '가격이 내려올 때 하락이 멈추는지 확인하는 구간입니다.' : 'Watch whether a decline stops in this area.'}</small>
          {plan.supportBasis === 'range' && <small>{ko ? '최근 저가를 사용한 임시 지지 구간입니다.' : 'Provisional support based on recent lows.'}</small>}
        </article>
        <article aria-label={t.resistance}><span>{t.resistance}{plan.targetBasis === 'atr' && (ko ? ' · 추정' : ' · estimated')}</span>
          <strong>{range(plan.resistance)}</strong>
          <small>{ko ? '가격이 올라갈 때 상승이 막히는지 확인하는 구간입니다.' : 'Watch whether an advance stalls in this area.'}</small>
          <small>{ko ? `구간의 기준 가격: ${price(plan.target)} · ${plan.targetBasis === 'observed' ? '최근 고가 기준' : '변동 폭으로 추정'}` : `Reference price: ${price(plan.target)} · ${plan.targetBasis === 'observed' ? 'recent highs' : 'volatility estimate'}`}</small>
        </article>
        <article className={reviewAbove ? styles.breakout : styles.risk} aria-label={reviewAbove ? t.sellInvalidation : t.stop}><span>{reviewAbove ? t.sellInvalidation : t.stop}</span>
          <strong>{price(reviewAbove ? plan.sellInvalidation : plan.stop)}</strong>
          <small>{ko ? `${plan.frame === '1D' ? '일봉' : `${t.frame[plan.frame]}봉`}이 이 가격 ${reviewAbove ? '위' : '아래'}에서 마감하면 ${reviewAbove ? '하락 판단을 재검토합니다.' : '추가 하락 위험에 주의하세요.'}` : `A ${plan.frame} close ${reviewAbove ? 'above' : 'below'} this price ${reviewAbove ? 'calls for a review of the bearish view.' : 'raises concern about a further decline.'}`}</small>
          <small>{ko ? reviewAbove ? '저항 위에 변동 폭의 여유를 더한 기준이며, 상승 확정선은 아닙니다.' : '지지 아래에 변동 폭의 여유를 더한 위험 기준입니다.' : reviewAbove ? 'A buffer above resistance, not confirmation of an uptrend.' : 'A risk threshold with a buffer below support.'}</small>
        </article>
      </div>
      <p className={styles.caution}>{ko ? '마감 가격(종가)은 해당 시간 구간이 끝났을 때의 가격입니다. 잠깐 닿거나 넘는 것과 구분해서 보세요.' : 'A candle close is the price when that time interval ends, not a brief touch or crossing.'}</p>
      {expert && <p className={styles.nextCheck}><strong>{ko ? '다음에 확인할 것' : 'What to check next'}</strong>{guide.next}</p>}
    </> : decision.direction !== 'unavailable' ? <p className={styles.nextCheck}>{guide.next}</p> : null}
    {!expert && decision.direction !== 'unavailable' && <div className={styles.simpleActions}>
      <details className={styles.simpleReasons}><summary>{ko ? '이렇게 보는 이유·다음 확인' : 'Why this view and what to check'}</summary><p>{guide.next}</p><p><strong>{t.riskLabel}</strong> · {caution}</p></details>
      <button className={styles.evidenceLink} type="button" onClick={() => onExpert ? onExpert() : setTab('details')}>{ko ? '차트·계산 근거 보기' : 'View chart and calculations'} →</button>
    </div>}
    {expert && <CryptoExpertOverview decision={decision} language={language} quoteCurrency={instrument.quoteCurrency} />}
    {expert && <button className={styles.evidenceLink} type="button" onClick={() => setTab('details')}>{ko ? `3개 시간 흐름 중 ${decision.coverage}개 확인 · 이유 자세히 보기` : `${decision.coverage} of 3 timeframes checked · View the evidence`} →</button>}
    </div>
    <div className={styles.tabPanel} role="tabpanel" id={`${tabId}-details-panel`} aria-labelledby={`${tabId}-details`} hidden={tab !== 'details'} tabIndex={0}>
    {daily.dataQuality === 'mock' && <p>{t.demo}</p>}
    {decision.coverage < 3 && <ul className={styles.dataIssues} aria-label={t.coverage}>{decision.frames.map(r => <li key={r.frame}>{t.frame[r.frame]} · {r.issue ? issue(r.issue) : t.trend[r.direction]}</li>)}</ul>}
    {decision.frames.some(r => r.issue === 'loading') && instrument.marketId === 'upbit' && <p className={styles.notice} role="status">{t.connectingHelp}</p>}
    {decision.frames.some(r => r.issue === 'disconnected' || r.issue === 'stale') && <p className={styles.notice} role="status">{t.reconnectHelp}</p>}
    {decision.frames.some(r => r.issue === 'gaps') && <p className={styles.notice}>{t.gapHelp}</p>}
    {decision.direction !== 'unavailable' && <p className={styles.caution}><strong>{t.riskLabel}</strong> · {caution}</p>}
    {plan && <div className={styles.referencePrices}><p>{t.entry}: {range(plan.entry)}</p><p>{decision.direction === 'sell' ? t.sellTarget : t.target}: {price(plan.target)} · {plan.targetBasis === 'observed' ? t.observed : t.atrTarget}</p><p>{t.stop}: {price(plan.stop)}</p>{plan.supportBasis === 'range' && <p>{t.provisional}</p>}{plan.rewardRisk < 1.5 && <p>{t.lowReward}</p>}</div>}
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
      <article aria-label={t.flow}><h3>{t.flow}</h3><strong>{flow.direction === 'unavailable' && decision.context!.flowStale ? t.flowStale : t.flowLabels[flow.direction]}</strong>{flow.ratio !== null && <p>{t.buyShare}: {(flow.ratio * 100).toFixed(1)}%</p>}<p>{t.sample}: {flow.count} · {t.large}: {flow.largeCount}</p>{flow.threshold !== null && <small>{t.threshold}: {price(flow.threshold)}</small>}{flow.from !== null && flow.to !== null && <small>{date(flow.from)} – {date(flow.to)}</small>}<p>{t.flowNote}</p>{flow.direction === 'unavailable' && <small>{t.flowMissing}</small>}{decision.context!.flowLastAt !== null && <small>{t.flowLast}: {date(decision.context!.flowLastAt)}</small>}</article>
      <article aria-label={t.dominance}><h3>{t.dominance}</h3>{global ? <><strong>{global.point.percent.toFixed(2)}%</strong><p>{t.dominanceHelp}</p>{delta !== null && global.previous ? <><p>{t.prior}: {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%p<br />{date(global.previous.at)} → {date(global.point.at)}</p><p>{delta >= 0.15 ? t.dominanceUp : delta <= -0.15 ? t.dominanceDown : t.dominanceFlat}</p></> : <p>{t.dominanceHistory}</p>}<p>{t.marketChange}: {global.point.marketChange.toFixed(2)}%</p><small>{date(global.point.at)}</small></> : <p>{dominance.loading ? t.dominanceLoading : t.dominanceError}</p>}<a href="https://coinpaprika.com/overview" target="_blank" rel="noreferrer">CoinPaprika ↗</a><small>{t.dominanceNote}</small></article>
    </div>
    <small>{language === 'ko' ? '대형 체결: 표본 금액 상위 25%이면서 중앙값의 1.5배 이상, 3건 이상일 때 금액 비중으로 우세 표시.' : 'Large trades: top quartile and at least 1.5× median notional; bias requires at least three large executions.'}</small>
    </details>
    {detailsContent}
    <p>{t.note}</p>
    </div>
    <div className={styles.tabPanel} role="tabpanel" id={`${tabId}-investment-panel`} aria-labelledby={`${tabId}-investment`} hidden={tab !== 'investment'} tabIndex={0}>
      <p>{t.investmentHelp}</p>
      {plan && averagePrice != null && Number.isFinite(averagePrice) && averagePrice > 0 && <div className={styles.position}><strong>{t.position}: {price(averagePrice)}</strong><span>{t.stop}: {price(plan.stop)}</span><span>{t.percent}: {((plan.stop / averagePrice - 1) * 100).toFixed(2)}%</span>{pnl !== null && Number.isFinite(pnl) && <span>{t.pnl}: {price(pnl)}</span>}</div>}
      <SaveScenario instrument={instrument} decision={decision} language={language} positionId={positionId} />
      {investmentContent}
    </div>
    <footer>{ko ? '가격 기록으로 계산한 참고 정보예요. 수익을 보장하지 않으며 거래 비용은 포함하지 않아요.' : 'A reference calculated from price history. Returns are not guaranteed; trading costs are excluded.'}{instrument.marketId === 'binance-futures' && <p>{t.futures}</p>}</footer>
  </section>
}
