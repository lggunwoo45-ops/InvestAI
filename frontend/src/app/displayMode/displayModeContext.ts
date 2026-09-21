import { createContext } from 'react'

import type { DisplayMode } from '@/types/displayMode'

export interface DisplayModeContextValue {
  displayMode: DisplayMode
  setDisplayMode: (mode: DisplayMode) => void
}

export const DisplayModeContext = createContext<DisplayModeContextValue | null>(null)
