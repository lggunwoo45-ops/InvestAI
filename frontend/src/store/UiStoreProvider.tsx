import { useMemo, useReducer, type PropsWithChildren } from 'react'

import {
  initialUiState,
  UiStoreContext,
  type UiAction,
  type UiState,
  type UiStoreValue,
} from './uiStoreContext'

function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'toggle-sidebar':
      return { ...state, isSidebarCollapsed: !state.isSidebarCollapsed }
    case 'toggle-ai-copilot':
      return { ...state, isAiCopilotOpen: !state.isAiCopilotOpen }
  }
}

export function UiStoreProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(uiReducer, initialUiState)
  const value = useMemo<UiStoreValue>(
    () => ({
      ...state,
      toggleSidebar: () => dispatch({ type: 'toggle-sidebar' }),
      toggleAiCopilot: () => dispatch({ type: 'toggle-ai-copilot' }),
    }),
    [state],
  )

  return <UiStoreContext value={value}>{children}</UiStoreContext>
}
