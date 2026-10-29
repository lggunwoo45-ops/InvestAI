import { useRef } from 'react'
import styles from './ResizeHandle.module.css'

import { clampPanelSize } from './panelGeometry'

/** Pointer capture keeps dragging reliable when the cursor crosses a chart canvas. */
export function ResizeHandle({ label, axis = 'width', value, min, max, onChange, onReset, reverse = false }: {
  label: string; axis?: 'width' | 'height'; value: number; min: number; max: number;
  onChange: (value: number) => void; onReset?: () => void; reverse?: boolean;
}) {
  const drag = useRef<{ id: number; start: number; value: number } | null>(null)
  const change = (next: number) => onChange(Math.round(clampPanelSize(next, min, max)))
  return <div role="separator" tabIndex={0} aria-label={label} aria-orientation={axis === 'width' ? 'vertical' : 'horizontal'}
    aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(value)} aria-valuetext={`${Math.round(value)} px`}
    className={`${styles.handle} ${axis === 'width' ? styles.vertical : styles.horizontal}`} title={label}
    onDoubleClick={onReset}
    onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); drag.current = { id: e.pointerId, start: axis === 'width' ? e.clientX : e.clientY, value }; e.currentTarget.setPointerCapture?.(e.pointerId) }}
    onPointerMove={e => { const d = drag.current; if (d && d.id === e.pointerId) change(d.value + ((axis === 'width' ? e.clientX : e.clientY) - d.start) * (reverse ? -1 : 1)) }}
    onPointerUp={e => { drag.current = null; if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }}
    onPointerCancel={() => { drag.current = null }} onLostPointerCapture={() => { drag.current = null }}
    onKeyDown={e => {
      if (e.key === 'Escape' && drag.current) { change(drag.current.value); drag.current = null; return }
      const backward = axis === 'width' ? 'ArrowLeft' : 'ArrowUp', forward = axis === 'width' ? 'ArrowRight' : 'ArrowDown'
      if (![backward, forward, 'Home', 'End'].includes(e.key)) return
      e.preventDefault()
      change(e.key === 'Home' ? min : e.key === 'End' ? max : value + (e.key === forward ? 1 : -1) * (reverse ? -1 : 1) * (e.shiftKey ? 50 : 10))
    }}><span aria-hidden="true" /></div>
}
