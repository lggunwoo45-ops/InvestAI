import { useEffect, useState } from 'react'
import { useDisplayMode } from '@/app/displayMode/useDisplayMode'
import { fetchLiquidationArchive, type LiquidationArchive } from '@/services/research/marketEvents'
import styles from './ResearchRecords.module.css'
const stamp = (n: number) => new Date(n).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const money = (n: number | null) => n === null ? '관측 자료 없음' : `${n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })} USDT`
export function LiquidationArchivePanel({ asset }: { asset: string }) {
  const simple = useDisplayMode().displayMode === 'simple'
  const [hours, setHours] = useState(24), [state, setState] = useState<{ key: string; value?: LiquidationArchive; error?: string }>({ key: '' }), [reload, setReload] = useState(0)
  const key = `${asset}:${hours}:${reload}`
  useEffect(() => { const c = new AbortController(); let busy = false; const load = async () => { if (busy || c.signal.aborted) return; busy = true; try { const value = await fetchLiquidationArchive(asset, hours, c.signal); if (!c.signal.aborted) setState({ key, value }) } catch (e) { if (!c.signal.aborted) setState({ key, error: e instanceof Error ? e.message : '기록을 불러오지 못했습니다.' }) } finally { busy = false } }; void load(); const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 60000); return () => { c.abort(); clearInterval(timer) } }, [asset, hours, key])
  const data = state.key === key ? state.value : undefined, error = state.key === key ? state.error : undefined
  const observed = data?.rows.filter(r => r.count !== null) ?? [], coverage = data?.rows.reduce((n, r) => n + r.coveredMs, 0) ?? 0
  return <section className={`${styles.records} ${styles.card}`} aria-label="청산 관측 기록실"><h3>{simple ? '하루·일주일 동안 쌓인 청산 기록' : '청산 기록실 · 시간별 보관'}</h3><p>완료된 1시간 구간을 최대 7일 보관합니다. 지금 진행 중인 시간은 위 실시간 관측에서 확인하세요.</p><div className={styles.actions}><button aria-pressed={hours === 24} onClick={() => setHours(24)}>지난 24시간 기록</button><button aria-pressed={hours === 168} onClick={() => setHours(168)}>지난 7일 기록</button><button onClick={() => setReload(v => v + 1)}>보관 기록 다시 확인</button></div>
    {error && <p role="alert">{error}</p>}{!data && !error && <p role="status">보관한 청산 기록을 불러오고 있어요.</p>}
    {data && <><p>{stamp(data.from)} – {stamp(data.to)} · 한국 시간 · {data.persistent ? '서버에 저장 · 재시작 후 유지' : '현재 실행 세션에만 보관'}</p><div className={styles.metrics}><div><span>관측한 롱 청산</span><b>{money(observed.length ? observed.reduce((n, r) => n + (r.long ?? 0), 0) : null)}</b></div><div><span>관측한 숏 청산</span><b>{money(observed.length ? observed.reduce((n, r) => n + (r.short ?? 0), 0) : null)}</b></div><div><span>연결 확인 시간 / 조회 기간</span><b>{(coverage / 3600000).toFixed(1)} / {hours}시간</b></div></div><p>{coverage < hours * 3600000 ? '수집 시작 전·연결 중단 구간이 포함돼 있어요. 빈 구간은 0원으로 채우지 않습니다.' : '선택한 기간 동안 연결을 확인했습니다. 제공처가 보내지 않은 기록까지 검증하는 것은 아닙니다.'} Bybit 한 거래소에서 받은 수량 × 파산가격의 합계이며 시장 전체 청산액이 아닙니다.</p><details open={!simple}><summary>시간별 관측과 누락 확인</summary><ol className={styles.list} style={{ maxHeight: 420, overflowY: 'auto' }}>{[...data.rows].reverse().map(r => <li key={r.at}><b>{stamp(r.at)}부터 1시간</b><p>롱 {money(r.long)} · 숏 {money(r.short)}</p><small>{r.count === null ? '수집 기록 없음' : `${r.count}건 관측`} · 연결 확인 {(r.coveredMs / 60000).toFixed(1)} / 60분</small></li>)}</ol></details><small>{stamp(data.fetchedAt)} 조회 · 재연결해도 놓친 과거 청산은 자동 복원되지 않습니다.</small></>}
  </section>
}
