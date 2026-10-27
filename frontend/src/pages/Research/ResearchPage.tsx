import { SimpleTasks } from '@/components/simple/SimpleWorkspace'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLanguage } from '@/i18n/useLanguage'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { useWatchlists } from '@/hooks/useWatchlists'
import { useMarketWorkspace } from '@/hooks/useMarketWorkspace'
import { itemFromInstrument } from '@/services/watchlist/watchlistStorage'
import { useResearchSnapshot } from '@/hooks/useResearchSnapshot'
import { ResearchHelp, ResearchGuideLibrary } from './ResearchHelp'
import { modeGuides } from './researchGuides'
import { ResearchDataStatus } from './ResearchDataStatus'
import { MarketIndicatorCards } from './MarketIndicatorCards'
import { researchNow } from '@/services/research/researchClock'
import { array, candleSignals, closedCandles, kimchiPremium, numeric, object, observedFundingInterval, positionRisk, providerNow, researchAssets, signalLabels, sourceData, volatilitySummary, type ResearchSnapshot, type Signal } from '@/services/research/researchModel'
import { readJournalDraft, readObservations, saveJournalDraft, saveObservation, type ResearchObservation } from '@/services/research/researchJournal'
import type { Candle } from '@/types/marketDetail'
import styles from './ResearchPage.module.css'
import { GuidedCosts, GuidedPremium } from './GuidedResearchTools'
import { FeeBudget } from './FeeBudget'
import { FundingComparison } from './FundingComparison'
import { PremiumTable } from './PremiumTable'
import { PublicWallet } from './PublicWallet'
import { PositionConnections } from './PositionConnections'
import { ResearchNews } from './ResearchNews'
import { MonitorWorkspace } from './MonitorWorkspace'
import { researchModes as modes, type ResearchMode as Mode } from './researchExperience'
import { SimpleCoinCheck, SimpleMarketSummary, SimpleResearchNav, SimpleToolIntro } from './SimpleResearch'
import { ResearchEvidence } from './ResearchEvidence'
import { SignalExplorer } from './SignalExplorer'
import { SignalWatchPanel } from './SignalWatchPanel'
import { localMonitorAvailable } from '@/services/research/monitorAvailability'
import { LocalMonitorNotice } from './LocalMonitorNotice'
import { BrowserPriceAlerts } from './BrowserPriceAlerts'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { cloudSignedIn } from '@/services/cloud/cloudClient'
import { CloudPriceAlerts } from './CloudPriceAlerts'
import { ExpertResearchNav } from './ExpertResearchNav'
import { EconomicCalendarPanel, LiquidationPanel } from './MarketEvents'
import { DerivativeHistory } from './DerivativeHistory'

const format = (value: number | null | undefined, digits = 2) => value === null || value === undefined || !Number.isFinite(value) ? '확인 불가' : value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
const percent = (value: number | null | undefined) => value === null || value === undefined ? '확인 불가' : `${format(value)}%`
const time = (at: number | null | undefined) => at ? new Date(at).toLocaleString('ko-KR') : '시각 미확인'
const field = (data: unknown, key: string) => numeric(object(data)[key])
function Metric({ title, value, detail }: { title: string; value: ReactNode; detail?: ReactNode }) { return <article className={styles.metric}><span>{title}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</article> }
function NumberField({ label, value, onChange, min, max, step = 'any' }: { label: string; value: string; onChange: (value: string) => void; min?: number; max?: number; step?: number | 'any' }) {
  return <label>{label}<input type="number" value={value} min={min} max={max} step={step} onChange={e => onChange(e.target.value)} /></label>
}
function Chart({ candles }: { candles: readonly Candle[] }) {
  const values = candles.slice(-120).map(c => c.close)
  if (values.length < 2) return <p>완결된 1시간봉 차트 데이터가 없습니다.</p>
  const low = Math.min(...values), high = Math.max(...values), range = high - low || 1
  return <figure className={styles.chart}><svg viewBox="0 0 720 150" role="img" aria-label="최근 완결 1시간봉 종가 추이"><polyline points={values.map((v, i) => `${i / (values.length - 1) * 720},${140 - (v - low) / range * 130}`).join(' ')} fill="none" stroke="currentColor" strokeWidth="2" /></svg><figcaption>Binance 선물 · 최근 {values.length}개 완결 1시간봉 · {format(low)}–{format(high)} USDT</figcaption></figure>
}

function Position({ mark, funding, interval }: { mark: number | null; funding: number | null; interval: number | null }) {
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [entry, setEntry] = useState(''), [current, setCurrent] = useState(''), [margin, setMargin] = useState('100')
  const [leverage, setLeverage] = useState('1'), [mmr, setMmr] = useState('0.5'), [fee, setFee] = useState('0.05')
  const [rate, setRate] = useState('0'), [hours, setHours] = useState('24'), [fundingHours, setFundingHours] = useState('8')
  const result = [entry, current, margin, leverage, mmr, fee, rate, hours, fundingHours].every(v => v.trim() !== '') ? positionRisk({ side, entry: Number(entry), mark: Number(current), margin: Number(margin), leverage: Number(leverage), maintenancePercent: Number(mmr), feePercent: Number(fee), fundingPercent: Number(rate), hours: Number(hours), fundingIntervalHours: Number(fundingHours) }) : null
  const simple = useDisplayMode().displayMode === 'simple'
  const guided = <section className={styles.guidedCalculator} aria-label="쉬운 손익 계산">
    <div className={styles.calculatorInputs}><h3><span className={styles.stepNumber}>1</span> 비교할 가격을 입력하세요</h3><p>시작 가격과 비교 가격을 바꾸면 손익이 어떻게 달라지는지 볼 수 있어요.</p><button disabled={!mark} onClick={() => { setEntry(String(mark)); setCurrent(String(mark)); if (funding !== null) setRate(String(funding * 100)); if (interval !== null) setFundingHours(String(interval)) }}>현재 자료로 채우기</button>
      <div className={styles.form}><NumberField label="시작 가격 (USDT)" value={entry} onChange={setEntry} min={0} /><NumberField label="비교 가격 (USDT)" value={current} onChange={setCurrent} min={0} /></div>
      <h3><span className={styles.stepNumber}>2</span> 투자금과 방향을 정하세요</h3><div className={styles.form}><NumberField label="넣을 금액 (USDT)" value={margin} onChange={setMargin} min={0} /><label>방향<select value={side} onChange={e => setSide(e.target.value as 'long' | 'short')}><option value="long">가격이 오르면 이익 · 롱</option><option value="short">가격이 내리면 이익 · 숏</option></select></label></div>
      <p className={styles.caption}>증거금은 거래에 맡긴 돈이에요. 현재 {leverage}배로 계산하며, 숫자를 바꾸기 전 기본 투자금은 100 USDT예요.</p>
      <details><summary>레버리지·수수료·보유 비용 바꾸기</summary><div className={styles.form}><NumberField label="레버리지 (배)" value={leverage} onChange={setLeverage} min={1} max={125} /><NumberField label="유지증거금률 (%) · 직접 확인" value={mmr} onChange={setMmr} min={0} /><NumberField label="편도 거래 수수료 (%) · 가정" value={fee} onChange={setFee} min={0} /><NumberField label="회당 펀딩률 (%) · 고정 가정" value={rate} onChange={setRate} /><NumberField label="펀딩 간격 (시간)" value={fundingHours} onChange={setFundingHours} min={1} /><NumberField label="보유 시간" value={hours} onChange={setHours} min={0} max={8760} /></div></details>
    </div>
    <aside className={styles.calculationStory}><span className={styles.eyebrow}>입력한 조건으로 계산하면</span><h3>{!result ? '두 가격을 넣으면 결과가 나와요' : result.net >= 0 ? '비용을 뺀 예상 이익' : '비용을 포함한 예상 손실'}</h3>{!result ? <p role="status">양수인 가격과 투자금을 입력해주세요. 계산이 안 되면 레버리지와 비용 설정도 확인해주세요.</p> : <><strong className={styles.resultAmount}>{format(Math.abs(result.net), 4)} USDT</strong><dl className={styles.resultBreakdown}><div><dt>가격 변화로 생긴 손익</dt><dd>{format(result.pnl, 4)} USDT</dd></div><div><dt>거래 수수료</dt><dd>{format(result.fees, 4)} USDT</dd></div><div><dt>선물 보유 비용</dt><dd>{format(result.funding, 4)} USDT</dd></div></dl><p>수수료는 편도 {fee}%, 보유 기간은 {hours}시간으로 가정했어요. 보유 비용이 음수이면 받는 금액이에요.</p><details><summary>강제 청산 위험도 확인하기</summary><p>계산상 청산 경계: {format(result.liquidation, 6)} USDT<br />현재가와 거리: {percent(result.distancePercent)}<br />거래 규모: {format(result.notional)} USDT</p><p>강제 청산은 맡긴 돈이 거래소의 유지 기준에 부족해질 때 일어나요. 이 계산은 일정한 유지증거금률을 가정한 근사값이며 실제 청산가는 거래소에서 확인해야 해요.</p></details></>}
      <small>USDT 선형 선물·격리 증거금 가정이에요. 현물 계좌의 실제 수익이나 실제 체결 결과가 아니에요.</small>
    </aside>
  </section>
  const expert = <section className={styles.panel}><h2>내 포지션 위험 진단</h2><p>USDT 선형 무기한 계약의 격리 증거금 가정입니다. 계정 연결 없이 입력한 조건으로 계산합니다.</p>
    <div className={styles.actions}><label>방향<select value={side} onChange={e => setSide(e.target.value as 'long' | 'short')}><option value="long">롱</option><option value="short">숏</option></select></label><button disabled={!mark} onClick={() => { setEntry(String(mark)); setCurrent(String(mark)); if (funding !== null) setRate(String(funding * 100)); if (interval !== null) setFundingHours(String(interval)) }}>현재 자료로 채우기</button></div>
    <div className={styles.form}>
      <NumberField label="진입가 (USDT)" value={entry} onChange={setEntry} min={0} /><NumberField label="현재 마크가격 (USDT)" value={current} onChange={setCurrent} min={0} />
      <NumberField label="증거금 (USDT)" value={margin} onChange={setMargin} min={0} /><NumberField label="레버리지 (배)" value={leverage} onChange={setLeverage} min={1} max={125} />
      <NumberField label="유지증거금률 (%) · 직접 확인" value={mmr} onChange={setMmr} min={0} /><NumberField label="편도 거래 수수료 (%) · 가정" value={fee} onChange={setFee} min={0} />
      <NumberField label="회당 펀딩률 (%) · 고정 가정" value={rate} onChange={setRate} /><NumberField label="펀딩 간격 (시간)" value={fundingHours} onChange={setFundingHours} min={1} />
      <NumberField label="보유 시간" value={hours} onChange={setHours} min={0} max={8760} />
    </div>
    {!result ? <p role="status">양수인 가격·증거금을 입력하고 유지증거금률이 초기 증거금률보다 작은지 확인해주세요.</p> : <><div className={styles.metrics}>
      <Metric title="포지션 규모" value={`${format(result.notional)} USDT`} /><Metric title="미실현 손익" value={`${format(result.pnl)} USDT`} detail={`증거금 대비 ${percent(result.roe)}`} />
      <Metric title="추정 청산 가격" value={`${format(result.liquidation, 6)} USDT`} detail={`현재가와 거리 ${percent(result.distancePercent)}${result.distancePercent <= 0 ? ' · 청산 경계 도달 가정' : ''}`} />
      <Metric title="진입·현재가 청산 수수료" value={`${format(result.fees, 4)} USDT`} /><Metric title="보유 기간 펀딩 비용" value={`${format(result.funding, 4)} USDT`} detail="음수는 수취 · 미래 펀딩 고정 가정" /><Metric title="비용 반영 손익" value={`${format(result.net)} USDT`} />
    </div><p>예상 청산가는 유지증거금 구간·공제액·추가 증거금·청산 수수료를 반영하지 않는 근사값입니다. 실제 거래소 청산가와 다를 수 있습니다. 교차 증거금과 역선물에는 사용할 수 없습니다.</p></>}
  </section>
  return <SimpleTasks all={!simple} label="포지션에서 할 일" tasks={[
    { id: 'calculate', title: '직접 손익 계산', description: '계좌 연결 없이 계산해요', content: simple ? guided : expert },
    { id: 'connect', title: '내 포지션 연결', description: '연결한 계좌의 위험 확인', content: <PositionConnections /> },
    { id: 'wallet', title: '공개 지갑 조회', description: '공개 주소로 한 번 확인', content: <section className={styles.panel}><PublicWallet /></section> },
  ]} />

}

function Costs({ funding, interval, snapshot, now }: { funding: number | null; interval: number | null; snapshot: ResearchSnapshot | null; now: number }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [amount, setAmount] = useState('1000'), [hours, setHours] = useState('24'), [side, setSide] = useState<'long' | 'short'>('long')
  const [rows, setRows] = useState([{ name: 'Binance · 직접 확인', fee: '0.05', funding: '0', interval: '8' }, { name: '비교 거래소 · 직접 입력', fee: '0.05', funding: '0', interval: '8' }])
  const update = (i: number, key: keyof typeof rows[number], value: string) => setRows(rows.map((r, j) => i === j ? { ...r, [key]: value } : r))
  const estimates = rows.map(row => {
    const n = Number(amount), h = Number(hours), f = Number(row.fee), r = Number(row.funding), step = Number(row.interval)
    if ([amount, hours, row.fee, row.funding, row.interval].some(v => v.trim() === '') || ![n, h, f, r, step].every(Number.isFinite) || n <= 0 || h < 0 || h > 8760 || f < 0 || f > 100 || step < 1) return null
    const fees = n * f / 100 * 2, funding = n * r / 100 * h / step * (side === 'long' ? 1 : -1), total = fees + funding
    return [fees, funding, total].every(Number.isFinite) ? { fees, funding, total } : null
  })
  const applyFunding = () => { if (funding !== null && interval !== null) setRows(old => old.map((r, i) => i ? r : { ...r, funding: String(funding * 100), interval: String(interval) })) }
  const expert = <section className={styles.panel}><h2>거래소별 수수료·펀딩 비교</h2><p>수수료는 계정 등급·주문 방식에 따라 다릅니다. 아래 기본값은 비교용 가정이며 실제 요금표가 아닙니다.</p><div className={styles.form}>
    <NumberField label="포지션 금액 (USDT)" value={amount} onChange={setAmount} min={0} /><NumberField label="보유 시간" value={hours} onChange={setHours} min={0} max={8760} />
    <label>방향<select value={side} onChange={e => setSide(e.target.value as 'long' | 'short')}><option value="long">롱</option><option value="short">숏</option></select></label>
  </div><button disabled={funding === null || interval === null} onClick={applyFunding}>Binance 펀딩 자료 적용</button>
    {rows.map((row, i) => {
      const estimate = estimates[i]
      return <article key={i} className={styles.subpanel}><div className={styles.form}><label>거래소 이름<input value={row.name} maxLength={80} onChange={e => update(i, 'name', e.target.value)} /></label><NumberField label="편도 수수료 (%)" value={row.fee} onChange={v => update(i, 'fee', v)} min={0} /><NumberField label="회당 펀딩률 (%)" value={row.funding} onChange={v => update(i, 'funding', v)} /><NumberField label="펀딩 간격 (시간)" value={row.interval} onChange={v => update(i, 'interval', v)} min={1} /></div><p>{estimate ? `왕복 수수료 ${format(estimate.fees, 4)} + 펀딩 ${format(estimate.funding, 4)} = 총 ${format(estimate.total, 4)} USDT` : '입력 조건을 확인해주세요.'}</p></article>
    })}<small>동일 가격으로 진입·청산하고 펀딩률이 유지된다는 가정입니다. 펀딩 간격은 공개 조정 정보 또는 최근 3개 정산 간격에서 가져오며 향후 유지가 보장되지 않습니다. 실제 정산 횟수·슬리피지·할인은 반영하지 않습니다.</small>
  </section>
  return <>{simple ? <GuidedCosts amount={amount} hours={hours} side={side} rows={rows} estimates={estimates} onAmount={setAmount} onHours={setHours} onSide={setSide} onRow={update} onFunding={applyFunding} canApplyFunding={funding !== null && interval !== null} /> : expert}
    <details className={styles.panel} open={!simple}><summary>거래소별 현재 펀딩률 확인하기</summary><FundingComparison snapshot={snapshot} now={now} /></details>
    <details className={styles.panel} open={!simple}><summary>반복 거래 비용과 손익분기점 계산하기</summary><FeeBudget /></details>
  </>

}

function Premium({ snapshot, asset, now }: { snapshot: ResearchSnapshot | null; asset: string; now: number }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [krw, setKrw] = useState(''), [overseas, setOverseas] = useState(''), [fx, setFx] = useState(''), [amount, setAmount] = useState('1000'), [withdrawal, setWithdrawal] = useState('0'), [fee, setFee] = useState('0.2')
  const [basis, setBasis] = useState('직접 입력')
  const rows = array(sourceData(snapshot, 'korea', now)).map(object)
  const domestic = rows.find(r => r.market === `KRW-${asset}`), stable = rows.find(r => r.market === 'KRW-USDT')
  const spot = field(sourceData(snapshot, 'spot', now), 'lastPrice')
  const validTimes = [numeric(domestic?.timestamp), numeric(stable?.timestamp), field(sourceData(snapshot, 'spot', now), 'closeTime')].map((t, i) => t === null ? null : t + now - providerNow(snapshot, i === 2 ? 'spot' : 'korea', now))
  const aligned = validTimes.every(v => v !== null && Math.abs(now - v) < 120_000) && Math.max(...validTimes.map(v => v ?? 0)) - Math.min(...validTimes.map(v => v ?? 0)) < 60_000
  const rawPremium = kimchiPremium(Number(krw), Number(overseas), Number(fx))
  const premium = rawPremium !== null && Number.isFinite(rawPremium) && Number.isFinite(Number(overseas) * Number(fx)) ? rawPremium : null
  const validCosts = [amount, withdrawal, fee].every(v => v !== '' && Number.isFinite(Number(v))) && Number(amount) > 0 && Number(withdrawal) >= 0 && Number(fee) >= 0 && Number(fee) <= 100
  const bought = Number(amount) / Number(overseas), delivered = bought - Number(withdrawal)
  const rawNet = premium !== null && validCosts && delivered > 0 ? delivered * Number(krw) * (1 - Number(fee) / 100) - Number(amount) * Number(fx) : null
  const net = rawNet !== null && Number.isFinite(rawNet) ? rawNet : null
  const canFill = aligned && (numeric(domestic?.trade_price) ?? 0) > 0 && (numeric(stable?.trade_price) ?? 0) > 0 && (spot ?? 0) > 0
  const fill = () => {
    if (!canFill) return
    setKrw(String(domestic!.trade_price)); setFx(String(stable!.trade_price)); setOverseas(String(spot)); setBasis('Upbit / Binance · ' + time(snapshot?.fetchedAt) + ' · USDT 원화 기준')
  }
  const expert = <section className={styles.panel}><h2>김치프리미엄·이체 비용</h2><p>국내 원화 가격과 해외 USDT 가격을 비교합니다. 자동 채우기는 원/달러 환율 대신 업비트 USDT/KRW를 사용합니다.</p>
    <button disabled={!canFill} onClick={fill}>동시점 공개 시세로 채우기</button>
    {!aligned && <small>국내·해외 시세가 없거나 시각 차이가 커 자동 채우기를 제한했습니다. 직접 입력할 수 있습니다.</small>}
    <div className={styles.form}><NumberField label={`${asset} 국내 가격 (KRW)`} value={krw} onChange={v => { setKrw(v); setBasis('직접 입력') }} min={0} /><NumberField label={`${asset} 해외 가격 (USDT)`} value={overseas} onChange={v => { setOverseas(v); setBasis('직접 입력') }} min={0} /><NumberField label="1 USDT 원화 가격 (KRW)" value={fx} onChange={v => { setFx(v); setBasis('직접 입력') }} min={0} /></div>
    <div className={styles.metrics}><Metric title="USDT 환산 국내외 가격 차이" value={premium === null ? '가격 입력 필요' : percent(premium)} detail={basis} /></div>

  </section>
  return <>{simple ? <GuidedPremium asset={asset} krw={krw} overseas={overseas} fx={fx} premium={premium} basis={basis} onKrw={value => { setKrw(value); setBasis('직접 입력') }} onOverseas={value => { setOverseas(value); setBasis('직접 입력') }} onFx={value => { setFx(value); setBasis('직접 입력') }} onFill={fill} canFill={canFill} /> : expert}
    <details className={styles.panel} open={!simple}><summary>이체·거래 비용까지 넣어 계산하기</summary>    <h3>해외 매수 → 국내 매도 비용 시뮬레이션</h3><div className={styles.form}><NumberField label="해외 매수 금액 (USDT)" value={amount} onChange={setAmount} min={0} /><NumberField label={`출금 수수료 (${asset} 수량)`} value={withdrawal} onChange={setWithdrawal} min={0} /><NumberField label="총 거래비용·슬리피지 가정 (%)" value={fee} onChange={setFee} min={0} max={100} /></div><p>단순 환산 차액: {net === null ? '입력 확인 필요' : `${format(net)} KRW`}</p><small>전송 중 가격 변동, 입출금 중단, 네트워크 일치, 한도와 자금 이동 비용은 반영하지 않습니다. 이체 유리 순위나 확정 차익으로 해석할 수 없습니다.</small></details>
    <details className={styles.panel} open={!simple}><summary>다른 코인의 국내외 가격도 비교하기</summary><PremiumTable snapshot={snapshot} now={now} /></details>
  </>

}

function Indicators({ snapshot, candles, now, asset }: { snapshot: ResearchSnapshot | null; candles: readonly Candle[]; now: number; asset: string }) {
  const simple = useDisplayMode().displayMode === 'simple'
  return <SimpleTasks all={!simple} label="어떤 시장 흐름이 궁금하세요?" tasks={[
    { id: 'mood', title: '지금 시장 분위기', description: '심리와 비트코인 비중', content: <MarketIndicatorCards snapshot={snapshot} candles={candles} now={now} simple={simple} /> },
    { id: 'history', title: '며칠 동안의 변화', description: '계약과 보유 비용', content: <DerivativeHistory key={`history-${asset}`} asset={asset} /> },
    { id: 'events', title: '다가오는 일정', description: '가격이 흔들릴 수 있는 날', content: <EconomicCalendarPanel /> },
    { id: 'liquidations', title: '강제 정리된 포지션', description: '최근 관측한 청산', content: <LiquidationPanel key={asset} asset={asset} /> },
    { id: 'etf', title: 'ETF 수급 기록', description: '확정 자료를 직접 합산', content: <section className={styles.panel}><h2>ETF 자금이 얼마나 들어왔나요?</h2><p>자동 수집은 아직 연결되지 않았어요. 확보한 날짜별 확정 자료만 직접 합산할 수 있어요.</p><ResearchHelp topic="etf" /><EtfLedger /></section> },
  ]} />


}

function EtfLedger() {
  const [text, setText] = useState(''), [error, setError] = useState(''), [rows, setRows] = useState<{ date: string; flow: number; source: string }[]>([])
  return <div><p>직접 확보한 확정 데이터를 날짜, 순유입액(USD), 출처 순서의 CSV로 입력하면 합산합니다. 서버 수집 자료와 구분되는 수동 기록이며 이 화면을 나가면 초기화됩니다.</p><label>ETF 확정 순유입 CSV<textarea value={text} rows={4} placeholder={'2026-10-20,1000000,발행사 보고서'} maxLength={30000} onChange={e => setText(e.target.value)} /></label><button onClick={() => {
    try {
      const parsed = text.trim().split(/\r?\n/).map(line => { const [date, flow, ...source] = line.split(','); const n = numeric(flow); if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date || n === null || !source.join(',').trim()) throw new Error(); return { date, flow: n, source: source.join(',').slice(0, 300) } })
      if (new Set(parsed.map(r => r.date)).size !== parsed.length) throw new Error()
      setRows(parsed); setError('')
    } catch { setError('날짜·순유입액·출처를 확인해주세요. 날짜가 중복되면 합산하지 않습니다.'); setRows([]) }
  }}>기록 합산</button>{error && <p role="alert">{error}</p>}{rows.length > 0 && <><p>직접 입력 {rows.length}일 합계: {format(rows.reduce((sum, row) => sum + row.flow, 0))} USD</p><ul>{rows.map(r => <li key={r.date}>{r.date} · {format(r.flow)} USD · {r.source}</li>)}</ul></>}</div>
}

function Journal({ asset, snapshot, candles, now }: { asset: string; snapshot: ResearchSnapshot | null; candles: readonly Candle[]; now: number }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [entries, setEntries] = useState(readObservations), [note, setNote] = useState(() => readJournalDraft(asset)), [message, setMessage] = useState('')
  const [draftError, setDraftError] = useState('')
  useEffect(() => { const update = () => { setEntries(readObservations()); setNote(readJournalDraft(asset)) }; window.addEventListener('investai-cloud-records', update); return () => window.removeEventListener('investai-cloud-records', update) }, [asset])
  const updateNote = (value: string) => {
    setNote(value)
    try { saveJournalDraft(asset, value); setDraftError('') }
    catch { setDraftError('임시 메모를 보관하지 못했어요. 화면을 떠나기 전에 메모를 복사해두세요.') }
  }
  const mark = sourceData(snapshot, 'mark', now), price = field(mark, 'markPrice'), funding = field(mark, 'lastFundingRate'), interest = field(sourceData(snapshot, 'interest', now), 'openInterest'), vol = volatilitySummary(candles)
  const previous = entries.find(e => e.asset === asset), history = entries.filter(e => e.asset === asset)
  const currentSignals = candleSignals(candles, candles.length - 1)
  const difference = (current: number | null, before: number | null | undefined, unit = '') => current === null || before === undefined || before === null ? '비교 근거 없음' : `${format(before, 6)} → ${format(current, 6)} ${unit}`
  const save = () => {
    if (!price) return
    const entry: ResearchObservation = { id: crypto.randomUUID(), asset, at: now, price, funding, interest, volatility: vol?.hourly ?? null, signals: currentSignals, note }
    try { setEntries(saveObservation(entry)); setMessage('현재 기준을 저장했습니다. 이전 기록도 이력에 남습니다.'); updateNote('') } catch { setMessage('브라우저 저장 공간에 기록하지 못했습니다. 저장 권한과 여유 공간을 확인해주세요.') }
  }
  if (simple) return <div className={styles.journalLayout}>
    <section className={styles.journalEditor}><span className={styles.eyebrow}>내 생각 기록</span><h2>{asset}에 관심을 가진 이유가 있나요?</h2><p>정답을 맞힐 필요는 없어요. 지금 생각과 다음에 확인할 내용을 남겨두세요.</p>
      <div className={styles.writingPrompts} aria-label="메모 시작하기">{['관심을 가진 이유: ', '다음에 확인할 것: ', '내가 걱정하는 점: '].map(prompt => <button key={prompt} onClick={() => updateNote(((note ? note + '\n' : '') + prompt).slice(0, 1000))}>{prompt.replace(': ', '')} +</button>)}</div>
      <label>이번 검토 메모<textarea rows={5} value={note} maxLength={1000} placeholder="예: 가격이 올랐지만 거래량도 늘었는지 내일 다시 확인하고 싶어요." onChange={e => updateNote(e.target.value)} /></label>
      <small>{draftError ? <span role="alert">{draftError}</span> : note ? cloudSignedIn() ? '작성 중인 메모도 회원 계정에 동기화합니다. 위의 전송 상태를 확인하세요.' : '작성 중인 메모를 이 브라우저에 임시 보관했어요.' : '작성 중인 메모는 다른 화면을 다녀와도 이어 쓸 수 있어요.'}</small>
      <p className={styles.caption}>{price ? format(price, 6) + ' USDT와 지금 시장 지표를 함께 저장해요.' : '가격을 불러온 뒤 검토 기록으로 저장할 수 있어요. 임시 메모는 그대로 남겨둘게요.'}</p>
      <button className={styles.primaryAction} disabled={!price} onClick={save}>현재 검토 기준 저장</button><p role="status">{message}</p>
      <small>{cloudSignedIn() ? '회원 계정에 저장해 다른 기기에서도 이어볼 수 있어요.' : '이 브라우저에 저장돼요.'} 선물 기준 가격이며, 내 계좌의 매수 가격은 아니에요.</small>
    </section>
    <aside className={styles.journalHistory}><span className={styles.eyebrow}>지난 기록과 비교</span><h2>{previous ? '그때 생각, 지금은 어떤가요?' : '첫 기록이 비교의 시작이에요'}</h2>
      {previous ? <><div className={styles.journalCompare}><div><span>지난 검토 가격</span><b>{format(previous.price, 6)} USDT</b></div><div><span>지금 기준 가격</span><b>{price ? format(price, 6) + ' USDT' : '확인 필요'}</b></div><div><span>가격 변화</span><b>{price ? percent((price / previous.price - 1) * 100) : '확인 필요'}</b></div><small>{time(previous.at)} 기록과 비교 · 계좌 수익률 아님</small></div><blockquote>이전 메모: {previous.note || '없음'}</blockquote><Link to={'/research?asset=' + asset + '&mode=alerts&review=' + encodeURIComponent(previous.id)}>이 기록으로 가격 조건 정하기 →</Link></> : <p>기록을 남기면 다음 방문 때 그때의 가격과 생각을 나란히 볼 수 있어요.</p>}
      <details><summary>저장 이력 {history.length}건</summary><ol>{history.map(e => <li key={e.id}>{time(e.at)} · {format(e.price, 6)} USDT<br />{e.note || '메모 없음'}<br /><Link to={'/research?asset=' + asset + '&mode=alerts&review=' + encodeURIComponent(e.id)}>이 검토로 감시 설정</Link></li>)}</ol></details>
      {previous && <details><summary>함께 저장한 상세 지표</summary><p>펀딩률: {difference(funding === null ? null : funding * 100, previous.funding === null ? null : previous.funding * 100, '%')}<br />미결제약정: {difference(interest, previous.interest)}<br />시간 변동성: {difference(vol?.hourly ?? null, previous.volatility, '%')}</p></details>}
    </aside>
  </div>
  return <section className={styles.panel}><h2>{simple ? '내 검토 기록' : '첫 검토 → 기준 저장 → 다음 방문 변화 확인'}</h2><p>저장 당시 관측값을 보존하고 같은 Binance USDT 선물 종목의 현재 자료와 비교합니다. {cloudSignedIn() ? '회원 계정에 동기화합니다. 전송 상태는 위에서 확인하세요.' : '저장은 이 브라우저에만 남습니다.'}</p>
    {!previous ? <p>아직 저장된 기준이 없습니다. 시장 자료를 확인하고 첫 검토를 저장해주세요.</p> : <><p>이전 검토: {time(previous.at)} · 현재 확인: {time(now)}</p><div className={styles.metrics}>
      <Metric title="마크가격 변화" value={previous.price > 0 && price ? percent((price / previous.price - 1) * 100) : '확인 불가'} detail={difference(price, previous.price, 'USDT')} />
    </div><details open={!simple}><summary>당시 지표와 현재 자료 비교</summary><div className={styles.metrics}>
      <Metric title="다음 정산 예상 펀딩" value={difference(funding === null ? null : funding * 100, previous.funding === null ? null : previous.funding * 100, '%')} /><Metric title="미결제약정 변화" value={difference(interest, previous.interest)} />
      <Metric title="시간 변동성 변화" value={difference(vol?.hourly ?? null, previous.volatility, '%')} />
    </div><p>이전 조건: {previous.signals.map(s => signalLabels[s as Signal] ?? s).join(' · ') || '해당 없음'}<br />현재 조건: {currentSignals.map(s => signalLabels[s]).join(' · ') || '해당 없음'}</p></details><p>이전 메모: {previous.note || '없음'}</p></>}
    <label>이번 검토 메모<textarea rows={3} value={note} maxLength={1000} placeholder="관심 이유와 다음에 확인할 내용을 기록하세요." onChange={e => updateNote(e.target.value)} /></label>
    {draftError && <p role="alert">{draftError}</p>}
    <button disabled={!price} onClick={save}>현재 검토 기준 저장</button><p role="status">{message}</p>
    {previous && <p><Link to={`/research?asset=${asset}&mode=alerts&review=${encodeURIComponent(previous.id)}`}>{localMonitorAvailable() ? '최근 검토를 서버 감시로 연결 →' : '최근 검토로 가격 조건 정하기 →'}</Link></p>}
    <details><summary>저장 이력 {history.length}건</summary><ol>{history.map(e => <li key={e.id}>{time(e.at)} · {format(e.price, 6)} USDT · {e.note || '메모 없음'} · <Link to={`/research?asset=${asset}&mode=alerts&review=${encodeURIComponent(e.id)}`}>이 검토로 감시 설정</Link></li>)}</ol></details>
    <small>가격 상승이나 펀딩 변화가 투자 품질의 개선을 뜻하지 않습니다. 관측 시각이 서로 다르므로 그 사이의 뉴스·이벤트도 별도로 확인하세요.</small>
  </section>
}

function Guide() {
  return <section className={styles.panel}><h2>사용 가이드·방법론</h2><ol><li>시장 컨디션에서 실제 자료가 연결됐는지 확인합니다.</li><li>포지션 위험과 비용을 계산하고 가정을 수정합니다.</li><li>검토·변화 기록에서 관심 이유와 현재 관측값을 저장합니다.</li><li>다음 방문 때 이전 관측값과 비교합니다.</li></ol><h3>용어사전</h3><dl className={styles.glossary}>
    <dt>펀딩비</dt><dd>무기한 선물의 롱·숏 사이에 정산되는 비용입니다. 양수이면 통상 롱이 지급하며 정산 간격은 계약별로 확인해야 합니다.</dd>
    <dt>미결제약정</dt><dd>아직 청산되지 않은 계약의 규모입니다. 증가 자체로 상승이나 하락을 뜻하지 않습니다.</dd>
    <dt>마크가격</dt><dd>미실현 손익과 청산 판단 등에 사용하는 거래소 기준 가격입니다. 마지막 체결가와 다를 수 있습니다.</dd>
    <dt>도미넌스</dt><dd>전체 가상자산 시가총액에서 해당 자산이 차지하는 비중입니다.</dd>
    <dt>과거 도달 비율</dt><dd>정해진 과거 표본에서 경계를 먼저 통과한 비율입니다. 앞으로 성공할 확률이나 검증된 매매 우위가 아닙니다.</dd>
  </dl><h3>공개된 계산 범위</h3><p>자료를 받지 못하면 확인 불가로 표시합니다. 복합 과열 점수와 미래 방향 확률은 만들지 않습니다. 신호 탐색은 30개 조건과 9개 시간봉, 최근 최대 5,000개 완료 봉을 지원합니다. 선택 편향·표본 부족·펀딩 비용의 한계가 있습니다. 포지션 계산은 일정 유지증거금률의 격리 계약 가정입니다.</p>
    <h3>신호 탐색과 자료 출처</h3><p>지표 계산은 InvestAI의 관측 기준을 따릅니다. 각 신호의 설명에서 계산 조건과 한계를 확인할 수 있습니다. 저장한 조건을 감시로 연결하면 이후 새로 충족된 봉과 그 뒤의 가격 변화를 기록합니다.</p><ul><li><a href="https://developers.binance.com/en/docs/catalog" target="_blank" rel="noreferrer">Binance 공개 시장 데이터</a></li><li><a href="https://docs.upbit.com/kr" target="_blank" rel="noreferrer">Upbit 공개 시세</a></li><li><a href="https://alternative.me/crypto/fear-and-greed-index/" target="_blank" rel="noreferrer">Alternative.me 공포·탐욕</a></li><li><a href="https://www.coingecko.com/" target="_blank" rel="noreferrer">CoinGecko 시가총액</a></li></ul>
    <p>PC용 감시는 프로그램이 실행되는 동안 브라우저와 독립적으로 동작하고 등록 근거와 관측 결과를 보관합니다. Telegram은 서버 채널 설정과 등록별 동의가 필요합니다. 회원 서버가 연결된 경우 계정별 저장과 상시 감시를 사용할 수 있습니다. 시장 지표에서 Bybit 청산 관측과 BLS·FOMC 경제 일정을 확인할 수 있습니다. 청산은 연결 이후 최대 15분의 관측값이며 시장 전체 집계가 아닙니다. 결제·구독 권한과 검증된 장기 성과는 아직 제공하지 않습니다. 국내·미국 주식과 원자재의 추가 시세 연결은 이 모드의 범위에 포함되지 않습니다.</p>
  </section>
}

export function ResearchPage() {
  const { language } = useLanguage()
  const { displayMode, setDisplayMode } = useDisplayMode()
  const simple = displayMode === 'simple'
  useDocumentTitle(simple ? '시장·기록' : '시장·리스크 연구실')
  const [params, setParams] = useSearchParams()
  const requestedMode = params.get('mode'), mode: Mode = requestedMode === 'check' && simple ? 'check' : modes.some(([key]) => key === requestedMode) ? requestedMode as Mode : 'overview'
  const requestedAsset = params.get('asset'), asset = researchAssets.some(a => a === requestedAsset) ? requestedAsset! : 'BTC'
  const [revision, setRevision] = useState(0), [clientNow, setNow] = useState(Date.now)
  const [auto, setAuto] = useState(true), [message, setMessage] = useState('')
  const { snapshot, loading, error, checkedAt } = useResearchSnapshot(asset, revision, auto)
  const { addToWatchlist, isWatchlisted } = useWatchlists(), { selectInstrument } = useMarketWorkspace()
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer) }, [])
  const visible = snapshot?.asset === asset ? snapshot : null
  const now = researchNow(visible, Math.max(clientNow, checkedAt))
  const candles = useMemo(() => closedCandles(sourceData(visible, 'candles', now), providerNow(visible, 'candles', now)), [visible, now])
  const markData = sourceData(visible, 'mark', now), markAt = field(markData, 'time')
  const markFresh = markData !== null && markAt !== null
  const mark = markFresh ? field(markData, 'markPrice') : null, funding = markFresh ? field(markData, 'lastFundingRate') : null
  const rawMarkAt = field(visible?.sources.mark?.data, 'time')
  const delayedMark = visible?.sources.mark?.status === 'available' && !markFresh
  const fundingInterval = observedFundingInterval(visible, now)
  const signals = candleSignals(candles, candles.length - 1), vol = volatilitySummary(candles)
  const setMode = (next: Mode) => setParams({ asset, mode: next })
  const browserAlerts = <BrowserPriceAlerts key={asset} asset={asset} snapshot={visible} now={now} loading={loading} auto={auto} onStart={() => { setAuto(true); setRevision(v => v + 1) }} onPause={() => setAuto(false)} />
  const openMarket = () => {
    const rows = array(sourceData(visible, 'korea', now)).map(object), row = rows.find(r => r.market === `KRW-${asset}`)
    const price = numeric(row?.trade_price)
    if (!price) { setMessage('업비트 원화 시세를 확인할 수 없어 관심 등록을 하지 않았습니다.'); return }
    const instrument = { id: `upbit-${asset.toLowerCase()}`, marketId: 'upbit' as const, symbol: `${asset}/KRW`, name: asset, providerSymbol: `KRW-${asset}`, providerType: 'upbit' as const, marketType: 'upbit-krw' as const, quoteCurrency: 'KRW', lastPrice: price, change24hPercent: Number(row?.signed_change_rate ?? 0) * 100, volume24h: Number(row?.acc_trade_price_24h ?? 0) }
    addToWatchlist(itemFromInstrument(instrument)); selectInstrument(instrument); setMessage('기존 관심종목에 등록했습니다. 종목 분석에서 차트·뉴스·검토 기록을 이어볼 수 있습니다.')
  }
  return <div className={[styles.page, simple ? styles.simplePage : styles.expertPage].join(' ')} data-research-experience={displayMode}>
    <header className={styles.workspaceHeader}><div className={styles.heading}><span>{simple ? '한 번에 하나씩, 쉽게 살펴보세요' : 'INVESTAI · RESEARCH WORKSPACE'}</span><h1>{simple ? (language === 'ko' ? '시장·기록' : 'Market & Reviews') : (language === 'ko' ? '시장·리스크 연구실' : 'Market & Risk Lab')}</h1>{!simple && <p>시장 지표와 거래 조건을 분석하고, 검토 근거를 비교합니다.</p>}</div><div className={styles.headerActions}><label>{simple ? '살펴볼 코인' : '검토 종목'}<select aria-label="검토 종목" value={asset} onChange={e => { setParams({ asset: e.target.value, mode }); setMessage('') }}>{researchAssets.map(a => <option key={a}>{a}</option>)}</select></label><button disabled={loading} onClick={() => setRevision(v => v + 1)}>{loading ? '확인 중…' : '↻ 새로고침'}</button></div></header>
    {!simple && <div className={styles.expertControls}><label className={styles.check}><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />화면을 보는 동안 1분마다 갱신</label><small>마지막 확인: {time(visible?.fetchedAt)}</small><button onClick={() => setDisplayMode('simple')}>쉬운 설명으로 보기</button></div>}
    {error && !['setups', 'position'].includes(mode) && <p className={styles.notice} role="alert">{simple ? '지금 시장 자료를 불러오지 못했어요. 새로고침으로 다시 확인해주세요. 저장한 기록과 직접 입력 계산은 계속 사용할 수 있어요.' : error}</p>}
    {delayedMark && !['setups', 'position'].includes(mode) && <p className={styles.notice} role="status">{simple ? '가격 자료가 오래되어 비교와 새 기록 저장을 잠시 멈췄어요. 새로고침 후 다시 확인해주세요.' : '마크가격 관측 시각: ' + time(rawMarkAt) + '. 갱신이 필요해 현재가 채우기와 검토 저장을 제한했습니다.'}</p>}
    {simple ? <SimpleResearchNav mode={mode} onMode={setMode} /> : <ExpertResearchNav mode={mode} onMode={setMode} />}
    {simple && <SimpleToolIntro mode={mode} onBack={() => setMode('check')} />}
    {simple && ['journal', 'alerts'].includes(mode) && <nav className={styles.recordNav} aria-label="기록과 가격 알림"><button aria-current={mode === 'journal' ? 'page' : undefined} onClick={() => setMode('journal')}>생각 기록</button><button aria-current={mode === 'alerts' ? 'page' : undefined} onClick={() => setMode('alerts')}>가격 알림</button></nav>}
    {!['guide', 'check'].includes(mode) && <ResearchHelp key={mode} topic={modeGuides[mode]} intro />}
    {!['guide', 'check', 'setups'].includes(mode) && <ResearchDataStatus snapshot={visible} now={now} loading={loading} error={error} auto={auto} onAuto={() => setAuto(true)} onRefresh={() => setRevision(v => v + 1)} />}
    {mode === 'check' && <SimpleCoinCheck asset={asset} onMode={setMode} />}
    {mode === 'overview' && simple && <SimpleMarketSummary asset={asset} price={mark} at={markAt} candles={candles} loading={loading} onMode={setMode} onWatch={openMarket} watchlisted={isWatchlisted('upbit-' + asset.toLowerCase())} canWatch={!!visible} message={message} />}
    {mode === 'overview' && !simple && <><section className={styles.panel}><div className={styles.actions}><h2>{asset} 현재 시장 컨디션</h2><button onClick={openMarket} disabled={!visible}>{isWatchlisted(`upbit-${asset.toLowerCase()}`) ? '관심종목·분석 이어가기' : '관심종목 등록'}</button><Link to="/market">차트·뉴스로 이동</Link></div><p role="status">{message}</p><div className={styles.metrics}><Metric title="선물 마크가격" value={mark ? `${format(mark, 6)} USDT` : '확인 불가'} detail={`Binance · ${time(markAt)}`} /><Metric title="다음 정산 예상 펀딩률" value={funding === null ? '확인 불가' : percent(funding * 100)} detail={`정산 예정 ${time(field(markData, 'nextFundingTime'))}`} /><Metric title="최근 실현 시간 변동성" value={percent(vol?.hourly)} detail="최근 24개 시간 수익률 기준" /></div><Chart candles={candles} /><h3>현재 관측된 조건</h3><p>{signals.map(s => signalLabels[s]).join(' · ') || '완결된 시간봉이 부족하거나 해당 조건이 없습니다.'}</p><div className={styles.actions}><button onClick={() => setMode('position')}>내 포지션 위험 계산</button><button onClick={() => setMode('journal')}>검토 저장·이전과 비교</button></div></section></>}
    <div className={styles.modeContent}>
    {mode === 'indicators' && <Indicators snapshot={visible} candles={candles} now={now} asset={asset} />}
    {mode === 'position' && <Position key={asset} mark={mark} funding={funding} interval={fundingInterval} />}
    {mode === 'costs' && <Costs key={asset} funding={funding} interval={fundingInterval} snapshot={visible} now={now} />}
    {mode === 'premium' && <Premium key={asset} snapshot={visible} asset={asset} now={now} />}
    {mode === 'setups' && <SignalExplorer asset={asset} refresh={revision} />}
    {mode === 'journal' && <><Journal key={asset} asset={asset} snapshot={visible} candles={candles} now={now} /><details className={styles.relatedNews} open={!simple}><summary>기록에 참고할 뉴스 찾아보기</summary><ResearchNews asset={asset} /></details></>}
    {mode === 'alerts' && <SimpleTasks all={!simple} initial={params.has('review') || !cloudSignedIn() ? 'browser' : 'server'} label="어떻게 알림을 받을까요?" tasks={[
      { id: 'server', title: '화면을 닫아도 확인', description: '로그인 후 서버에서 감시', content: cloudSignedIn() ? <CloudPriceAlerts key={asset} asset={asset} /> : <section className={styles.panel}><h2>계정에 가격 조건을 저장하세요</h2><p>화면 위 계정 메뉴에서 로그인하면 서버가 조건을 확인해요. 외부 알림은 별도 채널 연결이 필요하며, 먼저 화면 안 기록으로 확인할 수 있어요.</p><Link to="/settings">계정·연결 설정 확인 →</Link></section> },
      { id: 'browser', title: '이 화면에서만 확인', description: '열어둔 동안 가격 변화 확인', content: browserAlerts },
      { id: 'conditions', title: '포지션·신호 감시', description: '연결된 조건과 이후 결과', content: localMonitorAvailable() ? <SimpleTasks all={!simple} label="감시할 조건" tasks={[
        { id: 'positions', title: '보유 포지션', content: <PositionConnections ledger /> },
        { id: 'signals', title: '과거 흐름 조건', content: <SignalWatchPanel asset={asset} ledger /> },
        { id: 'entry', title: '진입 조건·결과', content: <MonitorWorkspace key={asset} asset={asset} /> },
      ]} /> : <LocalMonitorNotice asset={asset} /> },
    ]} />}
    {mode === 'guide' && (simple ? <section className={styles.panel}><h2>세 단계로 이어서 확인하세요</h2><ol><li><b>시장 보기</b>에서 지금 가격과 최근 변화를 살펴봐요.</li><li><b>내 종목 확인</b>에서 손익·과거 흐름·가격 비교 중 궁금한 내용을 골라요.</li><li><b>기록·알림</b>에서 생각을 남기고 다시 확인할 가격을 정해요.</li></ol><p>{cloudSignedIn() ? '회원 기록은 기기 간 동기화됩니다. 서버 감시로 등록한 조건은 화면을 닫아도 확인합니다.' : '기록은 이 브라우저에 저장돼요. 브라우저 가격 알림은 해당 화면이 열려 있는 동안만 확인합니다.'}</p><button onClick={() => setMode('check')}>내 종목 확인하기</button><p>신호를 직접 조합하거나 상세 지표를 비교하려면 전문가 모드로 전환하세요. 입력한 계산 조건과 기록은 이어서 사용할 수 있어요.</p></section> : <Guide />)}
    </div>
    {mode === 'guide' && <ResearchGuideLibrary />}
    <ResearchEvidence snapshot={visible} now={now} onMode={setMode} />
    {simple && mode !== 'alerts' && <details className={styles.evidence}><summary>가격 새로고침 설정</summary><label className={styles.check}><input type="checkbox" checked={auto} onChange={e => setAuto(e.target.checked)} />이 화면을 보는 동안 1분마다 새 자료 확인</label><p>마지막 확인: {time(visible?.fetchedAt)}</p></details>}
    {simple && <div className={styles.simpleLinks}><button onClick={() => setMode("guide")}>사용 방법</button><button onClick={() => setDisplayMode("expert")}>전체 지표를 한 화면에서 보기 →</button></div>}
    <footer className={styles.footer}>관측·계산을 돕는 정보입니다. 자료 출처·시각과 계산 가정을 함께 확인하세요.</footer>
  </div>
}
