import { ResearchHelp } from './ResearchHelp'
import { useRef, useState } from 'react'
import { researchBase } from '@/services/research/researchClient'
import { array, numeric, object } from '@/services/research/researchModel'
import styles from './ResearchPage.module.css'
export function PublicWallet() {
  const [address, setAddress] = useState(''), [result, setResult] = useState<unknown>(null), [message, setMessage] = useState(''), [loading, setLoading] = useState(false)
  const generation = useRef(0)
  const clear = () => { generation.current++; setResult(null); setMessage(''); setLoading(false) }
  const format = (v: unknown) => numeric(v) === null ? '미제공' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: 6 })
  return <section className={styles.subpanel}><h3>Hyperliquid 공개 포지션 조회</h3><p>입력한 공개 주소를 Hyperliquid 정보 API에 전달해 현재 포지션을 읽습니다. 주소와 결과는 저장하지 않습니다. 개인 키·지갑 연결은 필요하지 않습니다.</p>
    <ResearchHelp topic="connections" />
    <form onSubmit={async e => {
      e.preventDefault()
      if (!/^0x[0-9a-fA-F]{40}$/.test(address.trim())) { setMessage('0x로 시작하는 42자리 공개 주소를 입력해주세요.'); return }
      const current = ++generation.current
      setLoading(true); setResult(null); setMessage('')
      try {
        const response = await fetch(`${researchBase()}/wallet`, { method: 'POST', credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address: address.trim() }) })
        if (!response.ok) throw new Error()
        const value: unknown = await response.json()
        if (!Array.isArray(object(value).positions)) throw new Error()
        if (generation.current === current) { setResult(value); setMessage(array(object(value).positions).length ? '공개 포지션을 확인했습니다.' : '기본 무기한 시장에서 열린 포지션이 없습니다.') }
      } catch { if (generation.current === current) setMessage('공개 포지션을 조회하지 못했습니다. 주소와 서버 연결을 확인해주세요.') }
      finally { if (generation.current === current) setLoading(false) }
    }}><label>공개 지갑 주소<input value={address} autoComplete="off" spellCheck={false} placeholder="0x…" maxLength={42} onChange={e => { clear(); setAddress(e.target.value) }} /></label><div className={styles.actions}><button disabled={loading} type="submit">{loading ? '조회 중…' : '공개 주소를 Hyperliquid로 조회'}</button><button type="button" onClick={() => { clear(); setAddress('') }}>주소·결과 지우기</button></div></form>
    <p role="status">{message}</p>{result !== null && <><small>Hyperliquid · 수신 {new Date(Number(object(result).fetchedAt)).toLocaleString('ko-KR')} · 기본 USDC 무기한 시장</small><div className={styles.metrics}>{array(object(result).positions).map((entry, i) => { const p = object(entry); return <article className={styles.metric} key={i}><span>{String(p.coin ?? '')} · {Number(p.size) < 0 ? '숏' : '롱'} · {format(p.leverage)}배</span><strong>미실현 {format(p.unrealizedPnl)} USDC</strong><small>진입가 {format(p.entryPrice)} · 거래소 제공 청산가 {format(p.liquidationPrice)} · {p.marginType === 'cross' ? '교차' : '격리'} 증거금</small></article> })}</div></>}
  </section>
}
