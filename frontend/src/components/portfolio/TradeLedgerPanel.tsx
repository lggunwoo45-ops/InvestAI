import { useState } from 'react'
import type { Position } from '@/services/portfolio/portfolioStorage'
import { calculateLedger, ledgerFor, recordTrade, undoLastTrade, type PortfolioTrade } from '@/services/portfolio/tradeLedger'
import { portfolioNumber as number } from '@/utils/formatPortfolio'
import styles from './TradeLedgerPanel.module.css'

const copy = {
  ko: { title: '거래 기록', add: '거래 추가', buy: '매수', sell: '매도', side: '거래 종류', price: '체결 단가', quantity: '거래 수량', fee: '수수료', at: '거래 일시', save: '거래 저장', cancel: '취소', opening: '시작 보유 기록', realized: '기록된 실현손익', remaining: '거래 후 수량', average: '거래 후 평단가', history: '거래 내역 보기', undo: '마지막 거래 취소', confirm: '마지막 거래를 취소하고 이전 잔고로 되돌릴까요?', error: '유효한 가격·수량·수수료·일시를 입력하세요.', oversell: '보유 수량을 초과해 매도할 수 없습니다. 매도 수수료는 매도금액 이하여야 합니다.', chronology: '마지막 거래 이후 일시로 기록하세요. 이전 기록은 마지막 거래부터 취소해 정정할 수 있습니다.', future: '미래 일시의 거래는 기록할 수 없습니다.', range: '계산 가능한 숫자 범위를 벗어났습니다.', note: '이동평균 기준 · 입력한 기준통화 수수료 반영 · 거래소 주문은 실행하지 않습니다.', legacy: '시작 보유 이전의 매매 이력은 알 수 없어 실현손익에 포함하지 않습니다.', closed: '보유 종료', none: '아직 기록한 거래가 없습니다.', failed: '저장하지 못했습니다. 원본을 다시 읽고 저장공간을 확인하세요.' },
  en: { title: 'Trade ledger', add: 'Add trade', buy: 'Buy', sell: 'Sell', side: 'Trade side', price: 'Execution price', quantity: 'Trade quantity', fee: 'Fee', at: 'Trade time', save: 'Save trade', cancel: 'Cancel', opening: 'Opening holding', realized: 'Recorded realized P/L', remaining: 'Quantity after trade', average: 'Average after trade', history: 'View trade history', undo: 'Undo last trade', confirm: 'Undo the last trade and restore the preceding balance?', error: 'Enter valid price, quantity, fee and time.', oversell: 'Cannot sell more than held. Sell fees cannot exceed proceeds.', chronology: 'Record trades at or after the last trade time. Correct earlier entries by undoing from the last trade.', future: 'Future trades cannot be recorded.', range: 'Numbers exceed the supported calculation range.', note: 'Moving average cost · Includes entered quote-currency fees · Does not place exchange orders.', legacy: 'Realized P/L before the opening holding is unknown and excluded.', closed: 'Closed holding', none: 'No recorded trades yet.', failed: 'Save failed. Reload stored data and check storage availability.' },
}
const localTime = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

export function TradeLedgerPanel({ position, language, disabled, onSave }: { position: Position; language: 'ko' | 'en'; disabled: boolean; onSave: (position: Position) => boolean }) {
  const t = copy[language]
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<PortfolioTrade['side']>('buy')
  const [price, setPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [fee, setFee] = useState('0')
  const [at, setAt] = useState(localTime)
  const [id] = useState(() => crypto.randomUUID())
  const [undo, setUndo] = useState(false)
  const [failure, setFailure] = useState('')
  const ledger = ledgerFor(position)
  const current = calculateLedger(ledger)
  let preview: Position | null = null
  let error = ''
  if (open && price && quantity) {
    try { preview = recordTrade(position, { id, side, price: Number(price), quantity: Number(quantity), fee: Number(fee), at: new Date(at).toISOString() }) }
    catch (e) {
      const code = e instanceof Error ? e.message : ''
      error = code === 'oversell' ? t.oversell : code === 'chronology' ? t.chronology : code === 'future' ? t.future : code === 'range' ? t.range : t.error
    }
  }
  const previewResult = preview?.ledger ? calculateLedger(preview.ledger) : null
  return <section className={styles.panel} aria-label={t.title}>
    <header><div><h3>{t.title}</h3><span>{t.realized}: <strong>{number(current.realized)} {position.quoteCurrency}</strong></span></div><button type="button" disabled={disabled} onClick={() => { setOpen(!open); setAt(localTime()); setFailure('') }}>{open ? t.cancel : t.add}</button></header>
    {open && <form className={styles.form} aria-label={t.add} onSubmit={event => { event.preventDefault(); if (preview && !onSave(preview)) setFailure(t.failed) }}>
      <label>{t.side}<select value={side} onChange={e => setSide(e.target.value as PortfolioTrade['side'])}><option value="buy">{t.buy}</option><option value="sell">{t.sell}</option></select></label>
      <label>{t.price} ({position.quoteCurrency})<input required type="number" min="0" step="any" value={price} onChange={e => setPrice(e.target.value)} /></label>
      <label>{t.quantity}<input required type="number" min="0" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /></label>
      <label>{t.fee} ({position.quoteCurrency})<input required type="number" min="0" step="any" value={fee} onChange={e => setFee(e.target.value)} /></label>
      <label>{t.at}<input required type="datetime-local" value={at} onChange={e => setAt(e.target.value)} /></label>
      {previewResult && <dl className={styles.preview}><div><dt>{t.remaining}</dt><dd>{number(previewResult.quantity)}</dd></div><div><dt>{t.average}</dt><dd>{previewResult.quantity ? `${number(previewResult.averagePrice)} ${position.quoteCurrency}` : t.closed}</dd></div><div><dt>{t.realized}</dt><dd>{number(previewResult.realized)} {position.quoteCurrency}</dd></div></dl>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" disabled={disabled || !preview}>{t.save}</button>
    </form>}
    {failure && <p role="alert" className={styles.error}>{failure}</p>}
    <details><summary>{t.history} · {ledger.trades.length}</summary>
      <p>{t.opening}: {number(ledger.opening.quantity)} × {number(ledger.opening.averagePrice)} {position.quoteCurrency}</p>
      <small>{t.legacy}</small>
      {!current.rows.length && <p>{t.none}</p>}
      <ol className={styles.history}>{[...current.rows].reverse().map(row => <li key={row.trade.id}>
        <div><strong>{t[row.trade.side]}</strong><time dateTime={row.trade.at}>{new Date(row.trade.at).toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US')}</time></div>
        <span>{number(row.trade.quantity)} × {number(row.trade.price)} {position.quoteCurrency} · {t.fee} {number(row.trade.fee)} {position.quoteCurrency}</span>
        {row.trade.side === 'sell' && <strong>{t.realized}: {number(row.realized)} {position.quoteCurrency}</strong>}
      </li>)}</ol>
      {ledger.trades.length > 0 && <button type="button" disabled={disabled} onClick={() => setUndo(true)}>{t.undo}</button>}
      {undo && <div role="group" aria-label={t.confirm}><p>{t.confirm}</p><button type="button" disabled={disabled} onClick={() => { if (!onSave(undoLastTrade(position))) setFailure(t.failed) }}>{t.undo}</button><button type="button" onClick={() => setUndo(false)}>{t.cancel}</button></div>}
    </details>
    <small>{t.note}</small>
  </section>
}
