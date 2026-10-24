import { useState } from 'react'
import type { Candle } from '@/types/marketDetail'
import type { SignalFrame } from '@/services/research/signalExplorer'
import styles from './SignalExplorer.module.css'
const number = (n: number) => n.toLocaleString('ko-KR', { maximumFractionDigits: 5 })
export function ExplorerChart({ candles, frames, matches, simple }: { candles: readonly Candle[]; frames: readonly SignalFrame[]; matches: Set<number>; simple: boolean }) {
  const [hover, setHover] = useState<number | null>(null), [count, setCount] = useState(80)
  const rows = candles.slice(-count), features = frames.slice(-count)
  if (!rows.length) return <div className={styles.chartEmpty}>시세를 불러오면 가격과 조건이 나타난 위치를 함께 보여드려요.</div>
  const averages = simple ? [] : features.map(f => f.ema50)
  const low = Math.min(...rows.map(c => c.low), ...averages), high = Math.max(...rows.map(c => c.high), ...averages), span = high - low || high * 0.01
  const x = (i: number) => 14 + i * 700 / rows.length, y = (v: number) => 224 - (v - low) / span * 190
  const currentIndex = Math.min(hover ?? rows.length - 1, rows.length - 1), current = rows[currentIndex]!
  return <div className={styles.chart}>
    <div className={styles.chartReadout}><time>{new Date(current.timestamp).toLocaleString('ko-KR')}</time>{!simple && <><span>시가 {number(current.open)}</span><span>고가 {number(current.high)}</span><span>저가 {number(current.low)}</span></>}<b>{simple ? '가격' : '종가'} {number(current.close)}</b></div>
    <svg viewBox="0 0 810 290" role="img" aria-label={simple ? '최근 가격 흐름과 조건 충족 위치' : '캔들·50 EMA·조건 충족 위치'} onPointerMove={e => { const box = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(rows.length - 1, Math.round(((e.clientX - box.left) / box.width * 810 - 14) * rows.length / 700)))) }} onPointerLeave={() => setHover(null)}>
      {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="10" x2="715" y1={34 + i * 47.5} y2={34 + i * 47.5} stroke="currentColor" opacity=".09" /><text x="724" y={38 + i * 47.5} fontSize="10" fill="currentColor" opacity=".65">{number(high - span * i / 4)}</text></g>)}
      {simple ? <><path d={`M ${x(0)},244 ${rows.map((c, i) => `L ${x(i)},${y(c.close)}`).join(' ')} L ${x(rows.length - 1)},244 Z`} fill="var(--color-accent)" opacity=".07" /><polyline points={rows.map((c, i) => `${x(i)},${y(c.close)}`).join(' ')} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" /></> : <>
        {rows.map((c, i) => <g key={c.timestamp} fill={c.close >= c.open ? '#168d80' : '#dc626a'} stroke={c.close >= c.open ? '#168d80' : '#dc626a'}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} /><rect x={x(i) - 2} y={Math.min(y(c.close), y(c.open))} width={Math.max(2, 450 / rows.length)} height={Math.max(1, Math.abs(y(c.close) - y(c.open)))} /></g>)}
        <polyline points={features.map((f, i) => `${x(i)},${y(f.ema50)}`).join(' ')} fill="none" stroke="#dd9c42" strokeWidth="1.5" />
      </>}
      {rows.map((c, i) => matches.has(c.timestamp) ? <circle key={c.timestamp} cx={x(i)} cy="260" r="3" fill="var(--color-accent)" /> : null)}
      {hover !== null && <line x1={x(currentIndex)} x2={x(currentIndex)} y1="20" y2="265" stroke="var(--color-text-muted)" strokeDasharray="3 4" />}
      <text x="12" y="285" fill="currentColor" fontSize="10">{new Date(rows[0]!.timestamp).toLocaleDateString('ko-KR')}</text><text x="640" y="285" fill="currentColor" fontSize="10">{new Date(rows.at(-1)!.timestamp).toLocaleDateString('ko-KR')}</text>
    </svg>
    <div className={styles.chartLegend}><span>{simple ? '● 비슷한 조건이 나타났던 때' : '● 선택 조건 충족　━ 50 EMA'}</span>{!simple && <label>차트 범위<select aria-label="차트 표시 봉 수" value={count} onChange={e => setCount(Number(e.target.value))}><option value={80}>최근 80봉</option><option value={160}>최근 160봉</option></select></label>}</div>
  </div>
}
