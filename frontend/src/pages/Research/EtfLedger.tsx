import { useEffect, useState } from 'react'
import { cloudSignedIn } from '@/services/cloud/cloudClient'
import { readEtfLedger, saveEtfLedger, parseEtfCsv, mergeEtfRows, exportEtfCsv, type EtfLedger as Ledger } from '@/services/research/etfLedger'
import styles from './ResearchRecords.module.css'
const money = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
export function EtfLedger() {
  const [initial] = useState(() => { try { return { data: readEtfLedger(), error: '' } } catch (e) { return { data: null, error: String(e) } } })
  const [data, setData] = useState<Ledger | null>(initial.data), [asset, setAsset] = useState<'BTC' | 'ETH'>('BTC')
  const [text, setText] = useState(''), [error, setError] = useState(initial.error), [message, setMessage] = useState('')
  useEffect(() => { const update = () => { try { setData(readEtfLedger()); setError(''); setText(''); setMessage('') } catch (e) { setData(null); setError(String(e)) } }; window.addEventListener('investai-cloud-records', update); window.addEventListener('storage', update); return () => { window.removeEventListener('investai-cloud-records', update); window.removeEventListener('storage', update) } }, [])
  const rows = data?.rows.filter(r => r.asset === asset) ?? []
  const save = () => { try { const next = mergeEtfRows(readEtfLedger(), asset, parseEtfCsv(text)); saveEtfLedger(next); setData(next); setError(''); setMessage(cloudSignedIn() ? '회원 저장 대기열에 반영했어요. 상단 동기화 상태를 확인하세요.' : '이 브라우저에 저장했어요. 화면을 나가도 다시 불러옵니다.') } catch (e) { setError(e instanceof Error ? e.message : '저장하지 못했어요.'); setMessage('') } }
  const download = (format: 'csv' | 'json') => { const url = URL.createObjectURL(new Blob([format === 'csv' ? '\uFEFF' + exportEtfCsv(rows) : JSON.stringify({ version: 1, rows }, null, 2)], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `investai-${asset}-etf.${format}`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  return <div className={styles.records}>
    <p>직접 확보한 확정 자료를 날짜, 순유입액(USD), 출처 순서로 입력하세요. 같은 날짜를 다시 저장하면 수정 이력이 남습니다. 자동 수집·자료 진위 확인 기능은 아닙니다.</p>
    <label>ETF 구분<select value={asset} onChange={e => { setAsset(e.target.value as 'BTC' | 'ETH'); setText(''); setMessage('') }}><option value="BTC">비트코인 현물 ETF</option><option value="ETH">이더리움 현물 ETF</option></select></label>
    <label>ETF 확정 순유입 CSV<textarea value={text} rows={4} placeholder={'2026-10-20,1000000,발행사 보고서'} maxLength={30000} onChange={e => setText(e.target.value)} /></label>
    <div className={styles.actions}><button disabled={!data} onClick={save}>기록 합산·저장</button><button onClick={() => { setText(exportEtfCsv(rows)); setMessage('저장된 최신 값을 입력칸으로 불러왔어요. 수정 후 저장하세요.') }} disabled={!rows.length}>저장 기록 불러오기</button><button disabled={!rows.length} onClick={() => download('csv')}>CSV 내려받기</button><button disabled={!rows.length} onClick={() => download('json')}>수정 이력 포함 내려받기</button></div>
    {error && <p role="alert">{error}</p>}{message && <p role="status">{message}</p>}
    <p>{cloudSignedIn() ? '회원별 저장·기기 간 동기화' : '현재 브라우저에 저장'} · BTC·ETH 합계 1,000일치 · 날짜별 최근 수정 5회 보관</p>
    {rows.length ? <><h3>{asset} · 입력한 {rows.length}일 합계 {money(rows.reduce((n, r) => n + r.flow, 0))} USD</h3><p>자료가 없는 날짜는 0이나 휴장으로 채우지 않습니다. 두 종목의 수급은 합산하지 않아요.</p><ol className={styles.list}>{[...rows].reverse().map(r => <li key={r.date}><b>{r.date} · {money(r.flow)} USD</b><p>{r.source}</p><small>{new Date(r.updatedAt).toLocaleString('ko-KR')} 저장 · 버전 {r.revision}</small>{r.previous.length > 0 && <details><summary>수정 전 기록 {r.previous.length}개</summary>{r.previous.map((p, i) => <p key={i}>{money(p.flow)} USD · {p.source} · {new Date(p.updatedAt).toLocaleString('ko-KR')}</p>)}</details>}</li>)}</ol></> : <p>이 종목에 저장한 확정 자료가 없습니다.</p>}
  </div>
}
