import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { checkRules, readEvents, readObservations, readRules, removeRule, saveEvents, saveRule, type ReviewContext } from '@/services/research/researchJournal'
import { numeric, object, sourceData, type ResearchSnapshot } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'

const number = (value: number) => value.toLocaleString('ko-KR', { maximumFractionDigits: 6 })
const time = (at: number) => new Date(at).toLocaleString('ko-KR')

function Review({ review }: { review: ReviewContext }) {
  return <div className={styles.alertReview}><span>이 알림을 정한 이유</span><blockquote>{review.note || '메모 없이 남긴 검토 기록이에요.'}</blockquote><small>{time(review.at)} · 당시 {number(review.price)} USDT</small></div>
}

export function BrowserPriceAlerts({ asset, snapshot, now, auto, loading, onStart, onPause }: {
  asset: string; snapshot: ResearchSnapshot | null; now: number; auto: boolean; loading: boolean; onStart: () => void; onPause: () => void;
}) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [params] = useSearchParams()
  const reviewId = params.get('review')
  const [rules, setRules] = useState(readRules), [events, setEvents] = useState(readEvents)
  const existing = rules.find(rule => rule.asset === asset)
  const [above, setAbove] = useState(() => existing?.above?.toString() ?? '')
  const [below, setBelow] = useState(() => existing?.below?.toString() ?? '')
  const [message, setMessage] = useState(''), [error, setError] = useState('')
  useEffect(() => { const update=()=>{const restored=readRules();setRules(restored);setEvents(readEvents());const rule=restored.find(r=>r.asset===asset);setAbove(rule?.above?.toString()??'');setBelow(rule?.below?.toString()??'')};window.addEventListener('investai-cloud-records',update);return()=>window.removeEventListener('investai-cloud-records',update) },[asset])
  const previous = useRef<{ price: number; at: number } | null>(null)
  const mark = object(sourceData(snapshot, 'mark', now)), price = numeric(mark.markPrice), at = numeric(mark.time)
  const selected = readObservations().find(review => review.id === reviewId && review.asset === asset)
  const review: ReviewContext | undefined = selected ? { id: selected.id, at: selected.at, price: selected.price, note: selected.note } : reviewId ? undefined : existing?.review
  const visibleRules = simple ? rules.filter(rule => rule.asset === asset) : rules
  const visibleEvents = simple ? events.filter(event => event.asset === asset) : events

  useEffect(() => {
    if (loading) return
    // Missing or stale data breaks the observation sequence; do not infer a crossing through that gap.
    if (price === null || price <= 0 || at === null) { previous.current = null; return }
    const old = previous.current
    if (old && at <= old.at) return
    previous.current = { price, at }
    if (!old) return
    const triggered = checkRules(rules, asset, old.price, price, at)
    if (triggered.length) {
      try { setEvents(saveEvents(triggered)); setMessage('설정한 가격을 통과했어요. 아래 확인 기록에 남겼습니다.') }
      catch { setError('가격 통과는 확인했지만 기록을 저장하지 못했어요. 브라우저 저장 공간을 확인해주세요.') }
    }
  }, [asset, price, at, rules, loading])

  const save = (event: FormEvent) => {
    event.preventDefault()
    setMessage(''); setError('')
    const a = numeric(above), b = numeric(below)
    if ((a === null && b === null) || (a !== null && a <= 0) || (b !== null && b <= 0) || (a !== null && b !== null && a <= b)) {
      setError('위·아래 중 하나 이상에 0보다 큰 가격을 입력해주세요. 위쪽 가격은 아래쪽보다 커야 해요.'); return
    }
    if (reviewId && !selected) { setError('연결할 기록을 찾지 못했어요. 생각 기록에서 같은 종목의 기록을 다시 선택해주세요.'); return }
    try {
      saveRule({ asset, above: a, below: b, ...(review ? { review } : {}) })
      setRules(readRules())
      previous.current = price !== null && price > 0 && at !== null ? { price, at } : null
      onStart()
      setMessage('가격 조건을 저장하고 1분마다 확인을 켰어요. 이 화면을 열어두세요.')
    } catch { setError('저장하지 못했어요. 입력한 가격은 그대로 두었습니다. 브라우저 저장 공간을 확인해주세요.') }
  }
  const remove = (target: string) => {
    try {
      removeRule(target); setRules(readRules()); setError(''); setMessage(`${target} 가격 조건을 삭제했어요.`)
      if (target === asset) { setAbove(''); setBelow('') }
    } catch { setError('조건을 삭제하지 못했어요. 다시 시도해주세요.') }
  }
  return <section className={simple ? styles.alertWorkspace : styles.panel} aria-label="브라우저 가격 알림">
    <div className={styles.alertHeading}><span className={styles.eyebrow}>다시 확인할 가격</span><h2>{simple ? `${asset}, 어느 가격에서 다시 볼까요?` : '조건 알림·관측 결과'}</h2><p>가격이 정한 선을 지나면 이 화면에 표시하고 기록해요. 위·아래 중 필요한 가격만 입력하세요.</p></div>
    <div className={styles.alertLayout}>
      <form className={styles.alertEditor} onSubmit={save}>
        <div className={styles.alertPrice}><span>지금 기준 가격 · Binance 선물</span><strong>{price !== null && price > 0 ? `${number(price)} USDT` : '가격 확인 필요'}</strong><small>{at ? `${time(at)} 기준` : '현재 가격을 받으면 비교를 시작해요.'}</small></div>
        {review && <Review review={review} />}
        {reviewId && !selected && <p role="alert">선택한 기록이 이 브라우저에 없거나 종목이 달라요. <Link to={`/research?asset=${asset}&mode=journal`}>생각 기록에서 다시 선택하기</Link></p>}
        <div className={styles.form}>
          <label>이 가격까지 오르면 (USDT)<input type="number" step="any" min="0" value={above} placeholder="위쪽 가격" onChange={event => setAbove(event.target.value)} /></label>
          <label>이 가격까지 내려가면 (USDT)<input type="number" step="any" min="0" value={below} placeholder="아래쪽 가격" onChange={event => setBelow(event.target.value)} /></label>
        </div>
        <p className={styles.caption}>같은 종목의 기존 조건은 새 가격으로 바뀌어요. 비워둔 방향의 조건은 해제돼요.</p>
        <button className={styles.primaryAction} type="submit">저장하고 가격 확인 시작</button>
        {error && <p role="alert">{error}</p>}<p role="status" aria-live="polite">{message}</p>
        <details><summary>알림이 나타나는 기준</summary><p>이 화면을 열어둔 동안 받은 두 가격이 설정한 선을 통과했을 때 기록해요. 이미 선을 지난 가격에서 시작하면 즉시 알리지 않으며, 다시 반대편으로 돌아온 뒤 통과해야 해요. 1분 사이의 움직임이나 연결이 끊긴 동안의 통과는 놓칠 수 있어요.</p></details>
      </form>
      <aside className={styles.alertStatus} aria-label="저장한 가격 조건">
        <h3>{simple ? '지금 확인할 조건' : '저장된 브라우저 조건'}</h3>
        <p className={styles.alertState}>{!existing ? '아직 저장한 가격 조건이 없어요' : !auto ? '가격 확인이 꺼져 있어요' : loading ? '새 가격을 확인하고 있어요' : price === null || price <= 0 ? '현재 가격을 기다리고 있어요' : '1분마다 가격 확인 중'}</p>
        {simple && <label className={styles.check}><input type="checkbox" checked={auto} onChange={event => event.target.checked ? onStart() : onPause()} />이 화면에서 1분마다 가격 확인</label>}
        {existing && !auto && <button onClick={onStart}>저장한 조건으로 다시 시작</button>}
        {visibleRules.length ? <ul className={styles.alertRules}>{visibleRules.map(rule => <li key={rule.asset}><b>{rule.asset}</b>{rule.asset !== asset && <small>해당 종목의 알림 화면에서 확인해요.</small>}{rule.above !== null && <span>↑ {number(rule.above)} USDT 이상으로 통과</span>}{rule.below !== null && <span>↓ {number(rule.below)} USDT 이하로 통과</span>}{rule.review && <small>기록과 연결됨 · {time(rule.review.at)}</small>}<button onClick={() => remove(rule.asset)} aria-label={`${rule.asset} 가격 조건 삭제`}>조건 삭제</button></li>)}</ul> : <p>가격을 저장하면 다음에 방문해도 다시 불러올 수 있어요.</p>}
        <p className={styles.caption}>이 알림 화면을 닫거나 다른 화면으로 이동하면 확인이 멈춰요. 휴대폰 푸시·이메일 발송은 지원하지 않아요.</p>
        <Link to={`/research?asset=${asset}&mode=journal`}>생각 기록으로 돌아가기 →</Link>
      </aside>
    </div>
    <section className={styles.alertHistory} aria-label="가격 통과 기록"><h3>가격을 통과한 뒤, 확인 기록</h3>{visibleEvents.length ? <ol>{visibleEvents.map(event => <li key={event.id}><div><b>{event.asset} · {event.kind === 'above' ? '위쪽' : '아래쪽'} 가격 통과</b><time>{time(event.at)}</time></div><p>{event.threshold ? `설정한 가격 ${number(event.threshold)} USDT · ` : ''}확인한 가격 {number(event.price)} USDT</p>{event.review && <details><summary>그때 남긴 생각</summary><Review review={event.review} /></details>}</li>)}</ol> : <p>아직 확인한 통과가 없어요. 실제로 받은 가격에서 통과를 확인하면 여기에 남겨요.</p>}</section>
  </section>
}
