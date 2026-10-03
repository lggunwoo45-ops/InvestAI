import { createContext } from 'react'

export interface UiState {
  isSidebarPinned: boolean
  isAiCopilotOpen: boolean
}

export type UiAction =
  | { type: 'toggle-sidebar-pin' }
  | { type: 'toggle-ai-copilot' }

export interface UiStoreValue extends UiState {
  toggleSidebarPin: () => void
  toggleAiCopilot: () => void
}

export const initialUiState: UiState = {
  isSidebarPinned: true,
  isAiCopilotOpen: true,
}

export const UiStoreContext = createContext<UiStoreValue | null>(null)
