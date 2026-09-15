import { createContext } from 'react'

export interface UiState {
  isSidebarCollapsed: boolean
  isAiCopilotOpen: boolean
}

export type UiAction =
  | { type: 'toggle-sidebar' }
  | { type: 'toggle-ai-copilot' }

export interface UiStoreValue extends UiState {
  toggleSidebar: () => void
  toggleAiCopilot: () => void
}

export const initialUiState: UiState = {
  isSidebarCollapsed: false,
  isAiCopilotOpen: true,
}

export const UiStoreContext = createContext<UiStoreValue | null>(null)
