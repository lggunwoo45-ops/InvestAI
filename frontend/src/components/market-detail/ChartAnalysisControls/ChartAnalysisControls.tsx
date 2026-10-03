import { useState, type FormEvent } from 'react'

import type { Language } from '@/i18n/translations'
import type { ChartOverlayGroup, ChartOverlayVisibility, UserChartLine, UserChartLineInput } from '@/types/chartOverlays'
import type { TechnicalLevelAnalysis } from '@/types/technicalLevels'
import styles from './ChartAnalysisControls.module.css'

interface ChartAnalysisControlsProps {
  language: Language
  analysisMode: boolean
  visibility: ChartOverlayVisibility
  availableCounts: Record<ChartOverlayGroup, number>
  userLines: readonly UserChartLine[]
  technicalAnalysis: TechnicalLevelAnalysis
  technicalLoading?: boolean
  currentPrice: number
  onToggleAnalysisMode: () => void
  onToggleGroup: (group: ChartOverlayGroup) => void
  onAddLine: (input: UserChartLineInput) => UserChartLine | null
  onUpdateLine: (id: string, input: UserChartLineInput) => boolean
  onDeleteLine: (id: string) => void
  onSetLineVisible: (id: string, visible: boolean) => void
}

type EditorMode = 'add' | 'edit' | null

const copy = {
  en: {
    analysisMode: 'Analysis mode', exitAnalysisMode: 'Exit analysis mode', add: 'Add horizontal line', edit: 'Edit selected line', delete: 'Delete selected line',
    userLine: 'User reference line', name: 'Line name', price: 'Line price', save: 'Save line', cancel: 'Cancel', noLines: 'No user reference lines.',
    groups: { supportResistance: 'Support / resistance', movingAverage: 'MA', fibonacci: 'Fibonacci', user: 'User lines' },
    structure: 'Chart structure analysis', firstSupport: 'First support', firstResistance: 'First resistance', average: 'Moving-average context', fibonacciReference: 'Fibonacci reference', unavailable: 'Not enough data to calculate chart reference lines.', quality: { live: 'Live data', mock: 'Mock data', limited: 'Limited data', unavailable: 'Unavailable data' },
    loading: 'Preparing daily chart references…', safety: 'Chart reference lines are review references, not trade instructions.', visible: 'Show line', select: 'Select',
  },
  ko: {
    analysisMode: '분석 모드', exitAnalysisMode: '분석 모드 종료', add: '수평선 추가', edit: '선택한 선 수정', delete: '선택한 선 삭제',
    userLine: '사용자 기준선', name: '기준선 이름', price: '기준선 가격', save: '기준선 저장', cancel: '취소', noLines: '저장된 사용자 기준선이 없습니다.',
    groups: { supportResistance: '지지 / 저항', movingAverage: '이동평균', fibonacci: '피보나치', user: '사용자 기준선' },
    structure: '차트 구조 분석', firstSupport: '1차 지지', firstResistance: '1차 저항', average: '이동평균 맥락', fibonacciReference: '피보나치 참고', unavailable: '차트 기준선을 계산할 데이터가 부족합니다.', quality: { live: '실시간 데이터', mock: '모의 데이터', limited: '제한된 데이터', unavailable: '데이터 없음' },
    loading: '일봉 차트 기준선을 준비하는 중입니다…', safety: '차트 기준선은 거래 지시가 아니라 차트 검토 기준입니다.', visible: '선 표시', select: '선택',
  },
} as const

const groups: readonly ChartOverlayGroup[] = ['supportResistance', 'movingAverage', 'fibonacci', 'user']

export function ChartAnalysisControls({
  language,
  analysisMode,
  visibility,
  availableCounts,
  userLines,
  technicalAnalysis,
  technicalLoading = false,
  currentPrice,
  onToggleAnalysisMode,
  onToggleGroup,
  onAddLine,
  onUpdateLine,
  onDeleteLine,
  onSetLineVisible,
}: ChartAnalysisControlsProps) {
  const t = copy[language]
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>(null)
  const [label, setLabel] = useState('')
  const [price, setPrice] = useState('')
  const selected = userLines.find((line) => line.id === selectedId) ?? null

  const openAdd = () => {
    setEditorMode('add')
    setLabel(t.userLine)
    setPrice(Number.isFinite(currentPrice) && currentPrice > 0 ? String(currentPrice) : '')
  }
  const openEdit = () => {
    if (!selected) return
    setEditorMode('edit')
    setLabel(selected.label)
    setPrice(String(selected.price))
  }
  const closeEditor = () => {
    setEditorMode(null)
    setLabel('')
    setPrice('')
  }
  const toggleAnalysisMode = () => {
    if (analysisMode) {
      closeEditor()
      setSelectedId(null)
    }
    onToggleAnalysisMode()
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const input = { label, price: Number(price) }
    if (editorMode === 'add') {
      const created = onAddLine(input)
      if (!created) return
      setSelectedId(created.id)
    } else if (editorMode === 'edit' && selected && !onUpdateLine(selected.id, input)) return
    closeEditor()
  }

  return <div className={styles.controls} data-analysis-mode={analysisMode ? 'active' : 'inactive'}>
    <button type="button" className={styles.modeButton} aria-pressed={analysisMode} onClick={toggleAnalysisMode}>
      {analysisMode ? t.exitAnalysisMode : t.analysisMode}
    </button>
    <section className={styles.panel} aria-label={t.structure}>
      <div className={styles.structure} data-status={technicalAnalysis.levelSet.status}>
        <div className={styles.structureTitle}><strong>{t.structure}</strong><span data-quality={technicalAnalysis.levelSet.dataQuality}>{t.quality[technicalAnalysis.levelSet.dataQuality]}</span></div>
        {technicalLoading ? <p role="status">{t.loading}</p> : technicalAnalysis.levelSet.status === 'unavailable' ? <p role="status">{t.unavailable}</p> : <dl>
          <div><dt>{t.firstSupport}</dt><dd>{technicalAnalysis.levelSet.firstSupport?.priceLabel ?? '—'}</dd></div>
          <div><dt>{t.firstResistance}</dt><dd>{technicalAnalysis.levelSet.firstResistance?.priceLabel ?? '—'}</dd></div>
          <div className={styles.wide}><dt>{t.average}</dt><dd>{technicalAnalysis.movingAverageContext.summary}</dd></div>
          <div className={styles.wide}><dt>{t.fibonacciReference}</dt><dd>{technicalAnalysis.levelSet.fibonacciLevels[1]?.priceLabel ?? technicalAnalysis.levelSet.fibonacciLevels[0]?.priceLabel ?? '—'}</dd></div>
        </dl>}
        {!technicalLoading && technicalAnalysis.levelSet.dataQuality !== 'live' && <small className={styles.qualityNote}>{technicalAnalysis.levelSet.cautions.at(-1)}</small>}
      </div>
      <div className={styles.groups}>
        {groups.map((group) => <button
          key={group}
          type="button"
          aria-pressed={visibility[group]}
          disabled={availableCounts[group] === 0}
          onClick={() => onToggleGroup(group)}
        >
          {t.groups[group]} <small>{availableCounts[group]}</small>
        </button>)}
      </div>

      {analysisMode && <><div className={styles.actions}>
        <button type="button" onClick={openAdd}>{t.add}</button>
        <button type="button" disabled={!selected} onClick={openEdit}>{t.edit}</button>
        <button type="button" disabled={!selected} onClick={() => { if (selected) { onDeleteLine(selected.id); setSelectedId(null); closeEditor() } }}>{t.delete}</button>
      </div>

      <div className={styles.userLines} aria-label={t.userLine}>
        <strong>{t.userLine}</strong>
        {userLines.length === 0 ? <p>{t.noLines}</p> : <ul>
          {userLines.map((line) => <li key={line.id} data-selected={line.id === selectedId}>
            <button type="button" className={styles.selectLine} aria-label={`${t.select}: ${line.label}`} aria-pressed={line.id === selectedId} onClick={() => setSelectedId(line.id)}>
              <span>{line.label}</span><b>{line.price}</b>
            </button>
            <label><input type="checkbox" aria-label={`${t.visible}: ${line.label}`} checked={line.visible} onChange={(event) => onSetLineVisible(line.id, event.currentTarget.checked)} /><span aria-hidden="true">{t.visible}</span></label>
          </li>)}
        </ul>}
      </div>

      {editorMode && <form className={styles.editor} onSubmit={submit}>
        <label>{t.name}<input required maxLength={80} value={label} onChange={(event) => setLabel(event.currentTarget.value)} /></label>
        <label>{t.price}<input required type="number" min="0" step="any" value={price} onChange={(event) => setPrice(event.currentTarget.value)} /></label>
        <div><button type="submit">{t.save}</button><button type="button" onClick={closeEditor}>{t.cancel}</button></div>
      </form>}</>}
      <p className={styles.safety}>{t.safety}</p>
    </section>
  </div>
}
