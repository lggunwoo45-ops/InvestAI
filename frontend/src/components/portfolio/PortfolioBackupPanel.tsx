import { useEffect, useRef, useState } from 'react'
import { createPortfolioBackup, MAX_BACKUP_BYTES, mergePortfolioBackup, parsePortfolioBackup, type PortfolioBackup } from '@/services/portfolio/portfolioBackup'
import type { PortfolioState, Position } from '@/services/portfolio/portfolioStorage'
import styles from './TradeLedgerPanel.module.css'
import { cloudSignedIn } from '@/services/cloud/cloudClient'

const copy = {
  ko: { title: '백업 · 복원', download: '백업 파일 내려받기', file: '백업 파일 선택', preview: '복원 미리보기', confirm: '확인한 기록 추가 복원', cancel: '취소', created: '백업 생성일', records: '보유 기록', trades: '거래', add: '추가', skip: '동일 기록 건너뜀', note: '보유·거래·투자 기준을 JSON 파일로 보관합니다. 관심종목은 포함하지 않습니다. 내려받는 파일은 암호화되지 않습니다.', restoreNote: '현재 기록을 보존하고 없는 ID만 추가합니다. 같은 ID의 내용이 다르면 전체 복원을 중지합니다.', error: '복원할 수 없습니다. 파일 형식·크기(10MB 이하)·거래 계산 또는 기존 기록과의 충돌을 확인하세요.', failed: '적용하지 못했습니다. 다른 탭의 변경 또는 저장공간을 확인한 뒤 파일을 다시 선택하세요.', exportError: '백업 파일을 만들지 못했습니다. 저장 데이터를 다시 읽어 확인하세요.', loading: '파일 검사 중' },
  en: { title: 'Backup & restore', download: 'Download backup', file: 'Choose backup file', preview: 'Restore preview', confirm: 'Confirm additive restore', cancel: 'Cancel', created: 'Backup created', records: 'Holdings', trades: 'Trades', add: 'Add', skip: 'Skip identical', note: 'Keep holdings, trades and criteria in a JSON file. Watchlists are excluded. Downloaded files are unencrypted.', restoreNote: 'Existing records are preserved. Only missing IDs are added; differing contents under the same ID stop the entire restore.', error: 'Cannot restore. Check file format, size (up to 10MB), ledger calculations or conflicts with existing records.', failed: 'Not applied. Check changes in another tab or storage limits, then select the file again.', exportError: 'Could not create a backup. Reload and check stored data.', loading: 'Checking file' },
}
interface Preview { backup: PortfolioBackup; added: number; skipped: number; expectedRaw: string | null }
export function PortfolioBackupPanel({ store, language, onRestore }: { store: PortfolioState; language: 'ko' | 'en'; onRestore: (positions: Position[], expectedRaw: string | null) => boolean }) {
  const t = copy[language]
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const request = useRef(0)
  useEffect(() => () => { request.current++ }, [])
  const download = () => {
    try {
      const text = createPortfolioBackup(store)
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      const anchor = document.createElement('a')
      anchor.href = url; anchor.download = `investai-portfolio-${new Date().toISOString().slice(0, 10)}.json`
      document.body.append(anchor); anchor.click(); anchor.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setError('')
    } catch { setError(t.exportError) }
  }
  const load = async (file: File) => {
    const ticket = ++request.current
    setPreview(null); setError(''); setLoading(true)
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('size')
      const backup = parsePortfolioBackup(await file.text())
      const result = mergePortfolioBackup(store.positions, backup.portfolio.positions)
      if (ticket === request.current) setPreview({ backup, added: result.added, skipped: result.skipped, expectedRaw: store.raw })
    } catch { if (ticket === request.current) setError(t.error) }
    finally { if (ticket === request.current) setLoading(false) }
  }
  return <section className={styles.panel} aria-label={t.title}>
    <header><h3>{t.title}</h3><button type="button" disabled={!!store.error} onClick={download}>{t.download}</button></header>
    <small>{t.note}</small>{cloudSignedIn() && <p>{language === 'ko' ? '현재 계정의 기록을 내려받습니다. 복원을 확정하면 추가한 기록이 현재 계정의 서버에도 동기화됩니다.' : 'Downloads records for this account. Confirming a restore also syncs added records to the account server.'}</p>}
    <label>{t.file}<input type="file" accept=".json,application/json" disabled={!!store.error} onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void load(file) }} /></label>
    {loading && <p role="status">{t.loading}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {preview && <section aria-label={t.preview}>
      <h4>{t.preview}</h4><p>{t.created}: {new Date(preview.backup.createdAt).toLocaleString()}</p>
      <p>{t.records}: {preview.backup.portfolio.positions.length} · {t.trades}: {preview.backup.portfolio.positions.reduce((count, p) => count + (p.ledger?.trades.length ?? 0), 0)}</p>
      <p>{t.add}: {preview.added} · {t.skip}: {preview.skipped}</p><p>{t.restoreNote}</p>
      <button type="button" disabled={!!store.error || preview.added === 0} onClick={() => { if (onRestore(preview.backup.portfolio.positions, preview.expectedRaw)) setPreview(null); else { setPreview(null); setError(t.failed) } }}>{t.confirm}</button>
      <button type="button" onClick={() => setPreview(null)}>{t.cancel}</button>
    </section>}
  </section>
}
