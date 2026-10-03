import { useEffect, useMemo, useReducer, type PropsWithChildren } from 'react'

import {
  initialUiState,
  UiStoreContext,
  type UiAction,
  type UiState,
  type UiStoreValue,
} from './uiStoreContext'

export const SIDEBAR_PINNED_STORAGE_KEY = 'market-copilot.sidebarPinned.v1'

function readSidebarPinned(): boolean {
  try {
    const storedValue = window.localStorage.getItem(SIDEBAR_PINNED_STORAGE_KEY)

    if (storedValue === null || storedValue === 'true') return true
    if (storedValue === 'false') return false

    window.localStorage.removeItem(SIDEBAR_PINNED_STORAGE_KEY)
  } catch {
    // Blocked or unavailable storage must never prevent the workspace from rendering.
  }

  return true
}

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'toggle-sidebar-pin':
      return { ...state, isSidebarPinned: !state.isSidebarPinned }
    case 'toggle-ai-copilot':
      return { ...state, isAiCopilotOpen: !state.isAiCopilotOpen }
  }
}

export function UiStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(uiReducer, {
    ...initialUiState,
    isSidebarPinned: readSidebarPinned(),
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_PINNED_STORAGE_KEY, String(state.isSidebarPinned))
    } catch {
      // Persistence is an enhancement; the in-memory sidebar remains usable without it.
    }
  }, [state.isSidebarPinned])

  const value = useMemo<UiStoreValue>(
    () => ({
      ...state,
      toggleSidebarPin: () => dispatch({ type: 'toggle-sidebar-pin' }),
      toggleAiCopilot: () => dispatch({ type: 'toggle-ai-copilot' }),
    }),
    [state],
  )

  return <UiStoreContext value={value}>{children}</UiStoreContext>
}
