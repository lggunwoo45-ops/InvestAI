import { useCallback, useMemo, useState, type PropsWithChildren } from 'react'

import type { DisplayMode } from '@/types/displayMode'
import { DisplayModeContext } from './displayModeContext'
import { readDisplayMode, writeDisplayMode } from './displayModeStorage'

export function DisplayModeProvider({ children }: PropsWithChildren) {
  const [displayMode, updateDisplayMode] = useState<DisplayMode>(readDisplayMode)
  const setDisplayMode = useCallback((mode: DisplayMode) => {
    updateDisplayMode(mode)
    writeDisplayMode(mode)
  }, [])
  const value = useMemo(() => ({ displayMode, setDisplayMode }), [displayMode, setDisplayMode])

  return <DisplayModeContext value={value}>{children}</DisplayModeContext>
}
