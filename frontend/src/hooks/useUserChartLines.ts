import { useCallback, useMemo, useState } from 'react'

import { createUserChartLine, loadUserChartLines, saveUserChartLines } from '@/services/chartOverlays/userChartLineStorage'
import type { UserChartLine, UserChartLineInput } from '@/types/chartOverlays'

export function useUserChartLines(instrumentId: string) {
  const storedLines = useMemo(() => loadUserChartLines(instrumentId), [instrumentId])
  const [sessionLines, setSessionLines] = useState<Readonly<Record<string, readonly UserChartLine[]>>>({})
  const lines = sessionLines[instrumentId] ?? storedLines

  const commit = useCallback((next: readonly UserChartLine[]) => {
    setSessionLines((current) => ({ ...current, [instrumentId]: next }))
    saveUserChartLines(instrumentId, next)
  }, [instrumentId])

  const addLine = useCallback((input: UserChartLineInput) => {
    const line = createUserChartLine(instrumentId, input)
    if (!line) return null
    commit([...lines, line])
    return line
  }, [commit, instrumentId, lines])

  const updateLine = useCallback((id: string, input: UserChartLineInput) => {
    const label = input.label.trim()
    if (!label || !Number.isFinite(input.price) || input.price <= 0) return false
    const next = lines.map((line) => line.id === id
      ? { ...line, label, price: input.price, updatedAt: new Date().toISOString() }
      : line)
    if (!next.some((line) => line.id === id)) return false
    commit(next)
    return true
  }, [commit, lines])

  const deleteLine = useCallback((id: string) => commit(lines.filter((line) => line.id !== id)), [commit, lines])
  const setLineVisible = useCallback((id: string, visible: boolean) => commit(lines.map((line) => line.id === id
    ? { ...line, visible, updatedAt: new Date().toISOString() }
    : line)), [commit, lines])

  return { lines, addLine, updateLine, deleteLine, setLineVisible }
}
