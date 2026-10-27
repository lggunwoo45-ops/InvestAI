import { ResearchHelp } from './ResearchHelp'
import { useEffect, useState } from 'react'
import { useCompactLayout } from '@/hooks/useCompactLayout'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { fetchDerivativesHistory, historyPaths, type DerivativesHistory, type DerivativeSeries } from '@/services/research/derivativesHistory'
import { researchNow } from '@/services/research/researchClock'
import styles from './DerivativeHistory.module.css'
import { DerivativeHeatPanel } from './DerivativeHeatPanel'

const stamp = (at: number | null) => at === null ? '아직 없음' : new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(at)
const day = (at: number) => new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' }).format(at)
const valueText = (n: number, metric: string, asset: string) => metric === 'funding' ? `${(n * 100).toFixed(4)}%` : `${n.toLocaleString('ko-KR', { maximumFractionDigits: 3 })} ${asset}`
function download(data: DerivativesHistory) {
  const rows = ['asset,venue,metric,provider_time_utc,value,unit,first_known_revision_utc', ...data.series.flatMap(s => s.points.map(p => `${data.asset},Bybit,${s.metric},${new Date(p.at).toISOString()},${p.value},${s.unit},${new Date(p.knownAt).toISOString()}`))]
  const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a'); a.href = url; a.download = `${data.asset}-bybit-history-${data.days}d.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function Trend({ series, data }: { series: DerivativeSeries; data: DerivativesHistory }) {
  const points = series.points, paths = historyPaths(points, data.from, data.to, series.metric === 'openInterest')
  const min = points.length ? Math.min(...points.map(p => p.value)) : null, max = points.length ? Math.max(...points.map(p => p.value)) : null
  return <div className={styles.chart}>
    <div className={styles.chartTitle}><strong>{series.metric === 'funding' ? '정산된 펀딩률 추이' : '미결제약정 추이'}</strong><span>{points.length}개 관측값</span></div>
    {paths.length ? <><div className={styles.axis}><span>{valueText(max!, series.metric, data.asset)}</span><span>세로축: 확보한 값의 최솟값~최댓값</span></div><svg viewBox="0 0 800 130" role="img" aria-label={`${series.metric === 'funding' ? '확정 펀딩률 과거 추이. 정산 간격은 종목에 따라 다릅니다.' : '미결제약정 과거 추이. 누락 구간은 연결하지 않습니다.'}`}><path d="M10 20 H790 M10 110 H790" className={styles.grid} />{paths.map((d, i) => <path key={i} d={d} className={styles.line} />)}</svg><div className={styles.axis}><span>{valueText(min!, series.metric, data.asset)}</span><span>{day(data.from)} ~ {day(data.to)} · 한국 시간</span></div></> : <p className={styles.empty}>추이를 그리려면 관측값이 2개 이상 필요해요.</p>}
    {series.metric === 'openInterest' && !!series.gaps?.length && <p className={styles.caption}>빈 구간은 확보하지 못한 자료예요. 선으로 이어 채우지 않습니다.</p>}
  </div>
}

export function DerivativeHistory({ asset }: { asset: string }) {
  const simple = useDisplayMode().displayMode === 'simple', compact = useCompactLayout()
  const [days, setDays] = useState(7), [metric, setMetric] = useState<'funding' | 'openInterest'>('openInterest')
  const [data, setData] = useState<DerivativesHistory | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0), [page, setPage] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>, busy = false
    async function load() {
      if (busy || controller.signal.aborted) return
      busy = true; setLoading(true)
      try { const next = await fetchDerivativesHistory(asset, days, controller.signal); if (!controller.signal.aborted) { setData(next); setError('') } }
      catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '저장된 지표를 확인할 수 없어요.') }
      finally { busy = false; if (!controller.signal.aborted) { setLoading(false); clearTimeout(timer); timer = setTimeout(() => { if (document.visibilityState === 'visible') void load() }, 60_000) } }
    }
    const visible = () => { if (document.visibilityState === 'visible') void load() }
    void load(); document.addEventListener('visibilitychange', visible)
    return () => { controller.abort(); clearTimeout(timer); document.removeEventListener('visibilitychange', visible) }
  }, [asset, days, revision])
  const visible = data?.asset === asset && data.days === days ? data : null
  const funding = visible?.series[0], interest = visible?.series[1], latest = interest?.points.at(-1), prior = latest ? interest?.points.find(p => p.at === latest.at - 86_400_000) : undefined
  const change = latest && prior && prior.value > 0 ? (latest.value / prior.value - 1) * 100 : null
  const selected = visible?.series[simple || metric === 'openInterest' ? 1 : 0]
  const stale = !!error || !!visible && researchNow(visible) - visible.fetchedAt > 120_000 || visible?.series.some(s => s.status !== 'available')
  const rows = selected?.points.slice().reverse() ?? [], safePage = Math.min(page, Math.max(0, Math.ceil(rows.length / 20) - 1))
  const missing = interest?.gaps?.reduce((sum, g) => sum + (g.to - g.from) / 3_600_000 + 1, 0) ?? 0
  return <section className={styles.panel} aria-labelledby="derivative-history-title">
    <header className={styles.header}><div><span className={styles.eyebrow}>MARKET MEMORY · {asset} / USDT · BYBIT</span><h2 id="derivative-history-title">{simple ? '선물 시장, 며칠 동안 어떻게 달라졌나요?' : '파생 지표 기록실'}</h2></div><span className={stale || !visible ? styles.waiting : styles.badge}>{!visible ? '기록 확인 중' : stale ? '일부 자료 확인 필요' : '자동 저장 중'}</span></header>
    <p className={styles.intro}>{simple ? '아직 끝나지 않은 선물 계약의 양과, 거래를 유지하며 주고받은 펀딩비를 모았어요. 하루의 숫자보다 며칠의 흐름을 함께 살펴보세요.' : 'Bybit USDT 무기한 선물 · 시간별 미결제약정과 정산 완료 펀딩률을 서버에 보관합니다.'}</p>
    <ResearchHelp topic="history" />
    <div className={styles.toolbar}><div className={styles.periods} role="group" aria-label="지표 기록 조회 기간">{[7, 30, 90].map(n => <button key={n} aria-pressed={days === n} onClick={() => { setDays(n); setPage(0) }}>최근 {n}일</button>)}</div><button disabled={loading} onClick={() => setRevision(n => n + 1)}>저장 기록 새로고침</button></div>
    {error && <p role="status" className={styles.notice}>{error}{visible && ' 아래는 마지막으로 불러온 저장 기록입니다.'}</p>}
    {!visible ? <p className={styles.empty}>{loading ? '서버에 저장된 기록을 불러오고 있어요.' : '저장 기록을 확인할 수 없습니다.'}</p> : <>
      {stale && !error && <p className={styles.notice}>일부 지표의 최근 수집이나 발표값을 확인하지 못했어요. 아래 시각의 저장 기록을 보여드립니다.</p>}
      <DerivativeHeatPanel data={visible} simple={simple} now={researchNow(visible)} unavailable={!!error || researchNow(visible) - visible.fetchedAt > 120_000} />
      <div className={styles.cards}>
        <article><span>{simple ? '아직 끝나지 않은 선물 계약' : '최근 미결제약정 · 기초자산 수량'}</span><strong>{latest ? valueText(latest.value, 'openInterest', asset) : '저장된 관측값 없음'}</strong><p>{change === null ? '24시간 전 비교 자료가 아직 없어요.' : `최근 관측값은 24시간 전보다 ${Math.abs(change).toFixed(2)}% ${change >= 0 ? '증가' : '감소'}`}</p><small>{stamp(interest?.lastAt ?? null)} 관측</small></article>
        <article><span>{simple ? '마지막으로 정산된 펀딩비율' : '최근 확정 펀딩률 · 정산 1회'}</span><strong>{funding?.points.length ? valueText(funding.points.at(-1)!.value, 'funding', asset) : '저장된 관측값 없음'}</strong><p>{simple ? '양수면 롱이 숏에게, 음수면 숏이 롱에게 지불해요.' : '예상 펀딩률·연환산 수익률이 아닌 정산값입니다.'}</p><small>{stamp(funding?.lastAt ?? null)} 정산</small></article>
      </div>
      {[interest, funding].filter(series => series && !series.points.length).map(series => <p className={styles.notice} key={series!.metric}>{series!.metric === 'funding' ? '확정 펀딩' : '미결제약정'}: {series!.status === 'collecting' ? '첫 수집을 진행 중입니다. 수집이 끝난 뒤 저장 기록을 다시 확인하세요.' : series!.status === 'unavailable' ? '최근 수집에서 유효한 기록을 확보하지 못했습니다. 다른 조회 기간을 선택하거나 다음 수집 후 다시 확인하세요.' : '선택한 기간에 저장된 기록이 없습니다. 조회 기간과 실제 확보 기간을 비교하세요.'} 값이 0이라는 뜻은 아닙니다.</p>)}
      <div className={styles.coverage}><strong>실제 확보한 기록</strong><span>미결제약정 {stamp(interest?.firstAt ?? null)} ~ {stamp(interest?.lastAt ?? null)}</span><span>확정 펀딩 {stamp(funding?.firstAt ?? null)} ~ {stamp(funding?.lastAt ?? null)}</span><span>조회 기간 내 미결제약정 미확보 {missing}시간 · 펀딩 간격은 종목마다 달라 누락 개수를 추정하지 않아요.</span></div>
      {!simple && <div className={styles.toolbar}><label>표시 지표 <select value={metric} onChange={e => { setMetric(e.target.value as typeof metric); setPage(0) }}><option value="openInterest">미결제약정</option><option value="funding">확정 펀딩률</option></select></label><button disabled={!visible.series.some(s => s.points.length)} onClick={() => download(visible)}>조회 기록 CSV 저장</button></div>}
      {selected && <Trend series={selected} data={visible} />}
      {simple ? <p className={styles.explanation}>미결제약정이 늘면 열린 계약이 늘었다는 뜻이에요. 가격 상승·하락 방향을 뜻하지는 않아요. 펀딩도 단독으로 매수·매도를 결정하는 기준은 아니에요.</p> : <>
        {compact ? <ol className={styles.historyCards} aria-label="저장된 지표 기록">{rows.slice(safePage * 20, safePage * 20 + 20).map(p => <li key={p.at}><time>{stamp(p.at)} 관측</time><strong>{valueText(p.value, metric, asset)}</strong><small>이 값을 저장한 시각 · {stamp(p.knownAt)}</small></li>)}{!rows.length && <li>확보한 기록이 없습니다.</li>}</ol> : <div className={styles.tableWrap}><table><caption>{metric === 'funding' ? '확정 펀딩률' : '시간별 미결제약정'} · 최근 시각순 · 한국 시간</caption><thead><tr><th>거래소 기준 시각</th><th>값</th><th>이 값을 처음 저장한 시각</th></tr></thead><tbody>{rows.slice(safePage * 20, safePage * 20 + 20).map(p => <tr key={p.at}><td>{stamp(p.at)}</td><td>{valueText(p.value, metric, asset)}</td><td>{stamp(p.knownAt)}</td></tr>)}</tbody></table>{!rows.length && <p className={styles.empty}>확보한 기록이 없습니다.</p>}</div>}
        {!!rows.length && <div className={styles.pagination}><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>이전 기록 페이지</button><span>{safePage + 1} / {Math.ceil(rows.length / 20)}</span><button disabled={(safePage + 1) * 20 >= rows.length} onClick={() => setPage(safePage + 1)}>다음 기록 페이지</button></div>}
        {!!interest?.gaps?.length && <details className={styles.caption}><summary>미결제약정 미확보 구간 {interest.gaps.length}개 확인</summary><ul>{interest.gaps.map(g => <li key={g.from}>{stamp(g.from)} ~ {stamp(g.to)}</li>)}</ul></details>}
      </>}
      <footer className={styles.caption}><p>15분마다 최근 7일을 재확인하고 최대 365일 보관합니다. 서버 재시작 후에도 기록이 남습니다. 수집을 시작하기 전의 긴 이력이나 7일보다 오래된 누락은 자동 복원하지 않습니다.</p><p>마지막 수집 · 미결제약정 {stamp(interest?.succeededAt ?? null)} / 펀딩 {stamp(funding?.succeededAt ?? null)}. 수정된 값은 수정 내용을 확인한 시각도 보관합니다. 신호 탐색에서는 당시 저장된 펀딩·미결제약정으로 사례를 좁힐 수 있습니다. 1년 종합 과열도는 아직 제공하지 않습니다.</p><a href="https://bybit-exchange.github.io/docs/v5/market/open-interest" target="_blank" rel="noreferrer">Bybit 미결제약정 기준</a> · <a href="https://bybit-exchange.github.io/docs/v5/market/history-fund-rate" target="_blank" rel="noreferrer">펀딩 이력 기준</a></footer>
    </>}
  </section>
}
