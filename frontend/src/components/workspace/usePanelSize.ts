import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { clampPanelSize } from './panelGeometry'

export function usePanelSize(key: string, fallback: number, min: number, max: number) {
  const [stored, setStored] = useState<{ key: string; value: number }>(() => ({ key, value: read(key, fallback, min, max) }))
  const value = stored.key === key ? stored.value : read(key, fallback, min, max)
  const set = useCallback((next: number) => {
    if (!Number.isFinite(next)) return
    const safe = clampPanelSize(next, min, max)
    setStored({ key, value: safe })
    try { localStorage.setItem(key, String(safe)) } catch { /* Session resizing still works without storage. */ }
  }, [key, min, max])
  return [value, set, () => set(fallback)] as const
}
function read(key: string, fallback: number, min: number, max: number) {
  try { const raw = localStorage.getItem(key), n = Number(raw); if (raw !== null && raw.trim() && Number.isFinite(n) && n >= min && n <= max) return n } catch { /* Storage is optional. */ }
  return fallback
}
export function useWorkspaceSize<T extends HTMLElement>() {
  const ref = useRef<T>(null), [size, setSize] = useState({ width: 0, height: 0 })
  useLayoutEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry || entry.contentRect.width <= 0) return
      const width = Math.floor(entry.contentRect.width), height = Math.floor(entry.contentRect.height)
      setSize(old => old.width === width && old.height === height ? old : { width, height })
    })
    observer.observe(element); return () => observer.disconnect()
  }, [])
  return [ref, size] as const
}
