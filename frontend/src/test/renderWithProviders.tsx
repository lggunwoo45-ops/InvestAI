import { render, type RenderOptions } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'
import { MemoryRouter } from 'react-router-dom'

import { DisplayModeProvider } from '@/app/displayMode/DisplayModeProvider'
import { LanguageProvider } from '@/i18n/LanguageProvider'
import { MarketWorkspaceProvider } from '@/store/MarketWorkspaceProvider'
import { NewsProviderModeContext } from '@/store/newsProviderModeContext'
import { UiStoreProvider } from '@/store/UiStoreProvider'
import { WatchlistProvider } from '@/store/WatchlistProvider'

// No news loader is mounted: saved RSS preferences cannot start requests here.
function TestProviders({ children }: PropsWithChildren) {
  return <MemoryRouter><LanguageProvider><DisplayModeProvider><UiStoreProvider><WatchlistProvider><MarketWorkspaceProvider>
    <NewsProviderModeContext value={{ mode: 'mock', result: null, setMode: () => {} }}>{children}</NewsProviderModeContext>
  </MarketWorkspaceProvider></WatchlistProvider></UiStoreProvider></DisplayModeProvider></LanguageProvider></MemoryRouter>
}

/** For isolated components; App tests already own their router and providers. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { ...options, wrapper: TestProviders })
}
