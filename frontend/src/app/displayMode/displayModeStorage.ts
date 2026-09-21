import type { DisplayMode } from '@/types/displayMode'

export const DISPLAY_MODE_STORAGE_KEY = 'market-copilot.displayMode.v1'

export function isDisplayMode(value: unknown): value is DisplayMode {
  return value === 'simple' || value === 'expert'
}

export function readDisplayMode(storage: Pick<Storage, 'getItem'> = window.localStorage): DisplayMode {
  try {
    const stored = storage.getItem(DISPLAY_MODE_STORAGE_KEY)
    return isDisplayMode(stored) ? stored : 'expert'
  } catch {
    return 'expert'
  }
}

export function writeDisplayMode(mode: DisplayMode, storage: Pick<Storage, 'setItem'> = window.localStorage) {
  try {
    storage.setItem(DISPLAY_MODE_STORAGE_KEY, mode)
  } catch {
    // Private or blocked storage must not prevent the display mode from changing in memory.
  }
}
