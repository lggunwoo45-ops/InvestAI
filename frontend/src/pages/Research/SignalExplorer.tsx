import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { fetchResearchHistory, type ResearchHistory } from '@/services/research/researchClient'
import { researchNow } from '@/services/research/researchClock'
import { defaultExplorerConfig, ENGINE_VERSION, DERIVATIVE_FILTER_VERSION, derivativeMatch, hasDerivativeFilters, exploreHistory, explorerSignals, matchesFrame, signalFrames, timeframes, validExplorerConfig, type ExplorerConfig, type ExplorerSignal, type ResearchTimeframe, type SignalFamily } from '@/services/research/signalExplorer'
import { fetchDerivativeContext, type DerivativeContext } from '@/services/research/derivativeContextClient'
import { DerivativeFilterPanel } from './DerivativeFilterPanel'
import { configFromQuery, createExplorerPreset, explorerLink, readExplorerPresets, removeExplorerPreset, type ExplorerPreset } from '@/services/research/explorerPresets'
import { ExplorerChart } from './ExplorerChart'
import { SignalWatchPanel } from './SignalWatchPanel'
import styles from './SignalExplorer.module.css'
const pct = (n: number | null | undefined) => n == null ? '—' : `${n.toFixed(2)}%`
const date = (n: number | undefined) => n === undefined ? '—' : new Date(n).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const names: Record<SignalFamily, string> = { momentum: '힘의 변화', trend: '추세', volatility: '변동·거래량', candle: '봉 모양' }
const emptyCandles: ResearchHistory['candles'] = []
const simpleTimeframes: readonly [ResearchTimeframe, string][] = [['1h', '하루 흐름'], ['4h', '며칠 흐름'], ['1d', '긴 흐름']]
const starters = [
  { name: '많이 내려온 뒤에는?', description: '매도 압력이 쌓였던 구간을 살펴봐요.', ids: ['rsi-long'], side: 'long' },
  { name: '상승에 힘이 실렸을까?', description: '고점 돌파와 거래량 증가를 함께 봐요.', ids: ['breakout-long', 'volume-long'], side: 'long' },
  { name: '하락 흐름이 이어질까?', description: '추세가 약해지며 거래가 늘어난 구간이에요.', ids: ['ema-short', 'volume-short'], side: 'short' },
] as const

function SignalDetail({ signal }: { signal: ExplorerSignal }) { return <div className={styles.signalDetail}><b>{signal.name}</b><p>{signal.description}</p><dl><dt>관측 기준</dt><dd>{signal.rule}</dd><dt>함께 생각할 점</dt><dd>{signal.limit}</dd></dl></div> }

export function SignalExplorer({ asset, refresh = 0 }: { asset: string; refresh?: number }) {
  const { displayMode, setDisplayMode } = useDisplayMode(), simple = displayMode === 'simple', [params, setParams] = useSearchParams()
  const [config, setConfig] = useState<ExplorerConfig>(() => configFromQuery(params))
  const [history, setHistory] = useState<{ key: string; value?: ResearchHistory; error?: string }>({ key: '' }), [reload, setReload] = useState(0)
  const [family, setFamily] = useState<SignalFamily | 'all'>('all'), [direction, setDirection] = useState('all'), [search, setSearch] = useState(''), [detail, setDetail] = useState(explorerSignals[0]!)
  const [initial] = useState(() => { try { return { rows: readExplorerPresets(), error: '' } } catch (e) { return { rows: [], error: e instanceof Error ? e.message : '저장소를 확인해주세요.' } } })
  const [tab, setTab] = useState<'distribution' | 'samples' | 'saved'>('distribution'), [presets, setPresets] = useState<ExplorerPreset[]>(initial.rows), [message, setMessage] = useState(initial.error), [name, setName] = useState(''), [share, setShare] = useState('')
  useEffect(() => { const update=()=>{try {setPresets(readExplorerPresets())} catch {setMessage('저장한 조건을 읽지 못했습니다.')}};window.addEventListener('investai-cloud-records',update);return()=>window.removeEventListener('investai-cloud-records',update) }, [])
  const [clientNow, setNow] = useState(Date.now), key = `${asset}:${config.timeframe}:${config.bars}:${reload}:${refresh}`
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    const controller = new AbortController()
    fetchResearchHistory(asset, config.timeframe, config.bars, controller.signal).then(value => { if (!controller.signal.aborted) setHistory({ key, value }) }).catch(e => { if (!controller.signal.aborted) setHistory({ key, error: e instanceof Error ? e.message : '시세를 불러오지 못했습니다.' }) })
    return () => controller.abort()
  }, [asset, config.timeframe, config.bars, key])
  const loading = history.key !== key, data = history.key === key ? history.value : undefined, error = history.key === key ? history.error : undefined
  const now = researchNow(data, clientNow)
  const candles = data?.candles ?? emptyCandles, frames = useMemo(() => signalFrames(candles, config.timeframe), [candles, config.timeframe])
  const filtered = hasDerivativeFilters(config), step = timeframes[config.timeframe]
  const contextFrom = candles.length ? candles[0]!.timestamp + step : 0, contextTo = candles.length ? candles.at(-1)!.timestamp + step : 0
  const contextKey = `${key}:${contextFrom}:${contextTo}`
  const [contextState, setContextState] = useState<{ key: string; value?: DerivativeContext; error?: string }>({ key: '' })
  useEffect(() => {
    if (!filtered || !contextFrom || !contextTo) return
    const controller = new AbortController()
    fetchDerivativeContext(asset, config.timeframe, contextFrom, contextTo, controller.signal).then(value => { if (!controller.signal.aborted) setContextState({ key: contextKey, value }) }).catch(e => { if (!controller.signal.aborted) setContextState({ key: contextKey, error: e instanceof Error ? e.message : '당시 지표를 확인할 수 없습니다.' }) })
    return () => controller.abort()
  }, [filtered, asset, config.timeframe, contextFrom, contextTo, contextKey])
  const context = contextState.key === contextKey ? contextState.value : undefined, contextError = contextState.key === contextKey ? contextState.error : undefined
  const contextLoading = filtered && !!candles.length && contextState.key !== contextKey
  const contexts = useMemo(() => new Map(context?.points.map(p => [p.at, p])), [context])
  const result = useMemo(() => filtered && !context ? null : exploreHistory(candles, config, frames, contexts), [candles, config, frames, contexts, filtered, context])
  const matches = useMemo(() => new Set(frames.filter((_, i) => matchesFrame(frames, candles, i, config, contexts)).map(f => f.at)), [frames, candles, config, contexts])
  const last = candles.at(-1), latest = frames.at(-1), valid = validExplorerConfig(config)
  const fresh = !!data && !!last && now >= data.fetchedAt && now - data.fetchedAt < 180000 && data.asOf - last.timestamp <= timeframes[config.timeframe] * 2
  const currentMatch = fresh && !!last && matches.has(last.timestamp)
  const currentUnknown = filtered && (!last || derivativeMatch(config, contexts.get(last.timestamp + step), last.timestamp + step) === 'unknown')
  const selected = explorerSignals.filter(s => config.signals.includes(s.id))
  const visible = explorerSignals.filter(s => (family === 'all' || s.family === family) && (direction === 'all' || s.side === direction) && `${s.name} ${s.rule}`.toLowerCase().includes(search.toLowerCase()))
  const update = (patch: Partial<ExplorerConfig>) => { setConfig(c => ({ ...c, ...patch })); setShare(''); setMessage('') }
  const toggle = (id: string) => update({ signals: config.signals.includes(id) ? config.signals.filter(s => s !== id) : [...config.signals, id] })
  const save = () => {
    try { setPresets(createExplorerPreset({ name: name.trim() || `${asset} · ${selected.map(s => s.name).join(' + ')}`.slice(0, 60), asset, config })); setMessage('조건을 저장했어요. 저장한 조건에서 다시 불러올 수 있어요.'); setName('') } catch (e) { setMessage(e instanceof Error ? e.message : '저장하지 못했습니다.') }
  }
  const loadPreset = (p: ExplorerPreset) => { setConfig(structuredClone(p.config)); setParams({ asset: p.asset, mode: 'setups', config: JSON.stringify(p.config) }); setTab('distribution'); setMessage(`${p.name} 조건을 불러왔어요.`) }
  return <section className={`${styles.studio} ${simple ? styles.simple : styles.expert}`} aria-label="신호 탐색 스튜디오">
    <header className={styles.hero}><div><span className={styles.eyebrow}>{simple ? '질문 하나로 과거 살펴보기' : 'INVESTAI / SIGNAL STUDIO'}</span><h2>{simple ? '내 생각을, 과거 흐름과 비교해보세요.' : '가격의 움직임을 조건으로 읽다.'}</h2><p>{simple ? '아래에서 궁금한 상황을 고르면, 비슷했던 순간과 그 이후를 보여드려요.' : '30개 관측 신호 · 9개 시간봉 · 조건 결합 · 과거 분포와 사례 추적'}</p></div><button className={styles.experienceLink} onClick={() => setDisplayMode(simple ? 'expert' : 'simple')}>{simple ? '전문가 설정 열기' : '쉬운 질문으로 보기'}</button></header>
    {simple && <div className={styles.starters}>{starters.map((s, i) => <button key={s.name} aria-pressed={s.ids.join() === config.signals.join()} onClick={() => update({ signals: [...s.ids], side: s.side })}><span>0{i + 1}</span><b>{s.name}</b><small>{s.description}</small><i aria-hidden="true">↗</i></button>)}</div>}
    <DerivativeFilterPanel simple={simple} config={config} update={update} active={filtered} data={filtered ? context : undefined} loading={contextLoading} error={filtered ? contextError : undefined} coverage={result?.derivativeCoverage} />
    <div className={styles.workspace}>
      <div className={styles.main}>
        <section className={styles.marketCard}>
          <header className={styles.marketHeader}><div className={styles.assetIdentity}><span>{asset === 'BTC' ? '₿' : asset.slice(0, 1)}</span><div><h3>{asset} <small>/ USDT</small></h3><p>Binance · 무기한 선물</p></div></div><div className={styles.quote}><b>{last ? last.close.toLocaleString('ko-KR', { maximumFractionDigits: 5 }) : '—'}</b><small>{last ? `${date(last.timestamp)} 봉 종가` : '완료된 봉 기준'}</small></div></header>
          <div className={styles.timeframes} aria-label={simple ? '살펴볼 흐름' : '분석 시간봉'}>{simple ? simpleTimeframes.map(([t, label]) => <button key={t} aria-pressed={config.timeframe === t} onClick={() => update({ timeframe: t })}>{label}</button>) : (Object.keys(timeframes) as ResearchTimeframe[]).map(t => <button key={t} aria-pressed={config.timeframe === t} onClick={() => update({ timeframe: t })}>{t}</button>)}<button className={styles.reload} disabled={loading} onClick={() => setReload(n => n + 1)}>{loading ? '불러오는 중…' : '↻ 다시 불러오기'}</button></div>
          {simple && <p className={styles.readingBasis}>{selected.length ? selected.map(s => s.name).join(' + ') : '비교할 질문을 골라주세요'} · {timeframes[config.timeframe] < 3600000 ? timeframes[config.timeframe] / 60000 + '분' : timeframes[config.timeframe] / 3600000 + '시간'} 간격 · 최근 {config.bars.toLocaleString()}개 완료 구간</p>}
          {error ? <div className={styles.error} role="alert"><b>차트 자료를 가져오지 못했어요.</b><p>{error}</p><button onClick={() => setReload(n => n + 1)}>다시 시도</button></div> : loading ? <div className={styles.chartEmpty} role="status">{asset}의 {config.timeframe} 과거 시세를 불러오고 있어요…</div> : <ExplorerChart candles={candles} frames={frames} matches={matches} simple={simple} />}
          <div className={styles.currentState}><span className={currentMatch ? styles.dotActive : styles.dot} /><div><b>{!valid ? '확인할 조건을 선택해주세요' : currentUnknown ? '당시 파생 자료 부족으로 판정 보류' : !fresh ? '최신 상태 확인 필요' : currentMatch ? '마지막 완료 봉에서 선택 조건이 충족됐어요' : '마지막 완료 봉에서는 조합이 충족되지 않았어요'}</b><small>{simple ? '조건 충족은 매수·매도 지시가 아니라, 다시 살펴볼 시점이에요.' : `최근 ${config.window}봉 내 모든 조건 · ${latest?.signals.length ?? 0}개 개별 신호 관측 · RSI ${latest?.rsi?.toFixed(1) ?? '—'}`}</small></div></div>
        </section>
        <section className={styles.results}>
          <nav className={styles.resultTabs} aria-label="분석 결과"><button aria-selected={tab === 'distribution'} onClick={() => setTab('distribution')}>과거에는 어땠나요</button><button aria-selected={tab === 'samples'} onClick={() => setTab('samples')}>관측 사례 {result?.records.length ?? 0}</button><button aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>저장한 조건 {presets.length}</button></nav>
          {tab === 'distribution' && <><div className={styles.resultHeading}><div><span className={styles.eyebrow}>HISTORICAL CONTEXT</span><h3>{simple ? '비슷한 순간, 서로 다른 결과' : '조건 충족 이후의 가격 분포'}</h3></div><span className={styles.samplePill}>{result?.samples ?? 0}개 비중복 사례</span></div>
            {!valid ? <p className={styles.notice}>신호와 유효한 숫자를 입력하면 비교 결과를 보여드려요.</p> : !candles.length ? <p className={styles.notice}>시세를 불러온 뒤 실제 관측 결과를 계산합니다.</p> : filtered && !context ? <p className={styles.notice}>추가 지표를 확인한 뒤 결과를 계산합니다. 자료 연결 실패 시 조건을 생략하지 않습니다.</p> : <>
              <div className={styles.resultMetrics}><div><span>{config.side === 'long' ? '위쪽' : '아래쪽'} 기준 먼저 도달</span><b>{simple ? `${config.side === 'long' ? result?.up ?? 0 : result?.down ?? 0} / ${result?.samples ?? 0}건` : pct(result?.proportion == null ? null : result.proportion * 100)}</b><small>{simple ? '실제로 찾은 과거 사례' : '미도달도 분모에 포함'}</small></div><div><span>비용 반영 평균 변화</span><b className={(result?.meanNet ?? 0) >= 0 ? styles.positive : styles.negative}>{pct(result?.meanNet)}</b><small>{config.side === 'long' ? '상승 방향' : '하락 방향'} 가정 · 비용 {config.cost}%</small></div><div><span>이후 살펴본 기간</span><b>{simple ? Number((config.horizon * timeframes[config.timeframe] / 3600000).toFixed(2)) : config.horizon}<em>{simple ? '시간' : '봉'}</em></b><small>{simple ? '각 사례를 같은 기간으로 비교' : `최대 ${Number((config.horizon * timeframes[config.timeframe] / 3600000).toFixed(2))}시간`}</small></div></div>
              <div className={styles.distribution}>{[['먼저 위로', result?.up, styles.upBar], ['먼저 아래로', result?.down, styles.downBar], ['기간 안에 미도달', result?.timeout, styles.timeoutBar]].map(([label, count, cls]) => <div key={String(label)}><span>{label}</span><div className={styles.barTrack}><div className={String(cls)} style={{ width: `${Number(count) / Math.max(1, result?.samples ?? 0) * 100}%` }} /></div><b>{count}건</b></div>)}</div>
              <p className={styles.notice}>{(result?.samples ?? 0) < 30 ? '사례가 적어 방향을 판단하기 어려워요. 조건을 바꾸거나 조회 범위를 넓혀 비교해보세요.' : '같은 자료에서 여러 조건을 골라 얻은 탐색 결과예요. 앞으로의 확률이나 독립 검증 성과를 뜻하지 않아요.'}</p>
              <details><summary>결과의 범위와 계산 근거</summary><p>같은 봉에서 양쪽 도달 {result?.ambiguous}건 제외 · 자료 공백 {result?.skippedGaps}건 제외 · 관찰 기간 부족 {result?.pending}건 대기.</p><p>목표 우선 도달 비율의 95% 구간: {result?.interval ? `${pct(result.interval[0]! * 100)}–${pct(result.interval[1]! * 100)}` : '표본 없음'}. 앞·뒤 절반 표본 {result?.splits.map(s => `${s.samples}건 / 평균 ${pct(s.meanNet)}`).join(' · ')}.</p></details>
            </>}
          </>}
          {tab === 'samples' && <div className={styles.sampleTable}><p>최근 50건 · 다음 봉 시가 진입 가정 · 관찰 기간이 겹치는 사례 제외</p><table><thead><tr><th>조건 발생</th><th>진입 가정</th><th>관측 결과</th><th>비용 반영</th>{filtered && <th>당시 파생 지표</th>}</tr></thead><tbody>{result?.records.slice(-50).reverse().map(r => <tr key={r.at}><td>{date(r.at)}</td><td>{r.entry.toLocaleString('ko-KR', { maximumFractionDigits: 4 })}</td><td>{({ up: '상단 먼저', down: '하단 먼저', timeout: '기간 종료', ambiguous: '양쪽 도달·순서 불명' })[r.outcome]}</td><td>{pct(r.net)}</td>{filtered && <td><b>펀딩 {r.derivatives?.funding ? `${(r.derivatives.funding.value * 100).toFixed(4)}%` : '—'}</b><br />OI 하루 변화 {pct(r.derivatives?.openInterest?.change24h)}<details><summary>자료 시각 확인</summary><p>판정 시각 {date(r.enteredAt)}</p><p>펀딩 기준 {date(r.derivatives?.funding?.at)} · 저장 {date(r.derivatives?.funding?.knownAt)}</p><p>OI 기준 {date(r.derivatives?.openInterest?.at)} · 저장 {date(r.derivatives?.openInterest?.knownAt)}</p></details></td>}</tr>)}</tbody></table>{!result?.records.length && <p>완료된 관측 사례가 아직 없어요.</p>}</div>}
          {tab === 'saved' && <div className={styles.savedList}>{presets.length ? presets.map(p => <article key={p.id}><div><b>{p.name}</b><p>{p.asset} · {p.config.timeframe} · {p.config.signals.length}개 조건 · {date(p.at)}</p></div><button onClick={() => loadPreset(p)}>불러오기</button><button aria-label={`${p.name} 삭제`} onClick={() => { try { setPresets(removeExplorerPreset(p.id)) } catch (e) { setMessage(e instanceof Error ? e.message : '삭제하지 못했습니다.') } }}>삭제</button></article>) : <p>마음에 드는 조건을 저장하면 여기에 모여요.</p>}</div>}
        </section>
      </div>
      <aside className={simple ? styles.guidedReview : styles.builder}>
        {simple ? <div><h3>이 비교를 다음에도 이어볼까요?</h3><p>선택한 조건을 저장하거나, 지금 생각을 기록으로 남겨보세요.</p><details><summary>비교에 사용한 기준 확인</summary><dl className={styles.assumptions}><div><dt>선택한 조건</dt><dd>{selected.map(s => s.name).join(' + ') || '선택 없음'}</dd></div><div><dt>비교 방향과 가격 폭</dt><dd>{config.side === 'long' ? '상승' : '하락'} 방향 · 위아래 {config.target}%</dd></div><div><dt>조건이 나타나는 범위</dt><dd>{config.window === 1 ? '같은 구간' : `최근 ${config.window}개 구간 안에서 모두`}</dd></div><div><dt>추가 시장 조건</dt><dd>{{ any: '없음', above: '종가가 50 EMA 위', below: '종가가 50 EMA 아래', volume: '거래량이 평균의 1.5배 이상' }[config.regime]}</dd></div><div><dt>조회 범위와 비용</dt><dd>{config.bars.toLocaleString()}개 구간 · 왕복 비용 {config.cost}%</dd></div></dl><p>시간 간격·신호 조합·가격 폭을 직접 바꾸려면 전문가 설정을 열어주세요. 현재 조건이 그대로 이어집니다.</p></details></div> : <>
        <header><span className={styles.eyebrow}>{simple ? 'MY QUESTION' : 'CONDITION BUILDER'}</span><h3>{simple ? '어떤 흐름이 궁금하세요?' : '관측 조건 설계'}</h3><p>{simple ? '선택한 조건이 모두 나타났던 때를 찾아요.' : '최대 30개 신호를 조합하고 관찰 가정을 설정합니다.'}</p></header>
        <div className={styles.selected}>{selected.map(s => <button key={s.id} onClick={() => toggle(s.id)} aria-label={`${s.name} 선택 해제`}>{s.name} <span>×</span></button>)}{!selected.length && <small>아래에서 조건을 선택해주세요.</small>}</div>
        <details className={styles.catalog} open={!simple}><summary>30개 신호에서 직접 고르기 <span>{config.signals.length}개 선택</span></summary><input type="search" aria-label="신호 검색" placeholder="이름이나 지표로 검색" value={search} onChange={e => setSearch(e.target.value)} /><div className={styles.filters}><select aria-label="신호 종류" value={family} onChange={e => setFamily(e.target.value as SignalFamily | 'all')}><option value="all">모든 종류</option>{Object.entries(names).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><select aria-label="신호 방향" value={direction} onChange={e => setDirection(e.target.value)}><option value="all">양방향</option><option value="long">상승 관점</option><option value="short">하락 관점</option></select></div><div className={styles.signalList}>{visible.map(s => <div key={s.id}><label><input type="checkbox" checked={config.signals.includes(s.id)} onChange={() => toggle(s.id)} /><span>{s.name}<small>{s.side === 'long' ? '상승 관점' : '하락 관점'} · {names[s.family]}</small></span></label><button onClick={() => setDetail(s)} aria-label={`${s.name} 설명`}>ⓘ</button></div>)}</div><SignalDetail signal={detail} /></details>
        <div className={styles.fields}><label>조건이 나타나는 범위<select value={config.window} onChange={e => update({ window: Number(e.target.value) as ExplorerConfig['window'] })}>{[1, 3, 6, 12].map(n => <option value={n} key={n}>{n === 1 ? '같은 봉에서 모두' : `최근 ${n}봉 안에서 모두`}</option>)}</select></label><label>비교할 방향<select value={config.side} onChange={e => update({ side: e.target.value as ExplorerConfig['side'] })}><option value="long">상승 방향 · 롱</option><option value="short">하락 방향 · 숏</option></select></label></div>
        <div className={styles.fields}><label>위·아래 가격 폭 (%)<input type="number" min="0.1" max="99" step="0.1" value={Number.isNaN(config.target) ? '' : config.target} onChange={e => update({ target: e.target.value === '' ? NaN : Number(e.target.value) })} /></label><label>이후 관찰 봉 수<input type="number" min="1" max="168" value={Number.isNaN(config.horizon) ? '' : config.horizon} onChange={e => update({ horizon: e.target.value === '' ? NaN : Number(e.target.value) })} /></label></div>
        <details open={!simple}><summary>시장 조건·조회 범위·비용</summary><div className={styles.advancedFields}><label>당시 시장 조건<select value={config.regime} onChange={e => update({ regime: e.target.value as ExplorerConfig['regime'] })}><option value="any">추가 조건 없음</option><option value="above">종가가 50 EMA 위</option><option value="below">종가가 50 EMA 아래</option><option value="volume">거래량이 직전 평균의 1.5배 이상</option></select></label><label>조회 범위<select value={config.bars} onChange={e => update({ bars: Number(e.target.value) as ExplorerConfig['bars'] })}><option value={1000}>최근 1,000봉</option><option value={3000}>최근 3,000봉</option><option value={5000}>최근 5,000봉</option></select></label><label>왕복 수수료·슬리피지 (%)<input type="number" min="0" max="10" step="0.01" value={Number.isNaN(config.cost) ? '' : config.cost} onChange={e => update({ cost: e.target.value === '' ? NaN : Number(e.target.value) })} /></label></div><p>과거 펀딩·미결제약정 조건은 위의 추가 조건에서 선택할 수 있습니다. 청산 조건과 실제 펀딩 비용은 아직 반영하지 않습니다.</p></details>
        </>}
        <div className={styles.saveArea}>{!simple && <label>조건 이름<input maxLength={60} placeholder="예: BTC 거래량 동반 돌파" value={name} onChange={e => setName(e.target.value)} /></label>}<button className={styles.primary} disabled={!valid} onClick={save}>이 조건 저장하기 <span>＋</span></button><div className={styles.secondaryActions}><button disabled={!valid} onClick={() => { setShare(explorerLink(asset, config)); setMessage('공유 링크에는 종목과 계산 조건만 포함돼요.') }}>조건 링크 만들기</button><button onClick={() => update(structuredClone(defaultExplorerConfig))}>초기화</button></div>{share && <label>공유할 조건 링크<input aria-label="공유할 조건 링크" readOnly value={share} onFocus={e => e.target.select()} /></label>}{message && <p role="status">{message}</p>}</div>
        {!simple && <SignalWatchPanel asset={asset} config={config} name={name} />}
        <div className={styles.nextStep}><b>분석 다음에는</b><p>가격 기준을 남겨두고, 이후 변화를 기록으로 확인하세요.</p><Link to={`/research?asset=${asset}&mode=journal`}>검토 기록 남기기 →</Link><Link to={`/research?asset=${asset}&mode=alerts`}>가격 감시·결과 확인 →</Link></div>
      </aside>
    </div>
    <details className={styles.method}><summary>분석에 사용한 자료와 계산 방식</summary><p>{data?.source ?? 'Binance USDⓈ-M'} · {candles.length.toLocaleString()}개 완료 봉 · {date(candles[0]?.timestamp)}–{date(last?.timestamp)} · 버전 {ENGINE_VERSION}{filtered ? ` · ${DERIVATIVE_FILTER_VERSION}` : ''}. 10분봉은 빠짐없는 두 개의 5분봉을 합칩니다. 자료의 처음 60봉과 공백 직후 60봉은 지표 준비 구간입니다.</p><p>조건을 완료 봉에서 확인한 다음 봉 시가로 진입했다고 가정합니다. 양쪽 가격을 같은 봉에서 만나면 순서를 알 수 없어 평균에서 제외합니다. 미도달은 관찰 마지막 종가로 계산합니다. 레버리지·복리·실제 펀딩 비용·실제 체결은 반영하지 않습니다. 조회한 범위 내 탐색이며 전체 역사나 검증된 매매 전략이 아닙니다.</p></details>
  </section>
}


