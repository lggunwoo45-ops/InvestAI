import { use } from 'react'

import { UiStoreContext, type UiStoreValue } from '@/store/uiStoreContext'

export function useUiStore(): UiStoreValue {
  const store = use(UiStoreContext)

  if (!store) {
    throw new Error('useUiStore must be used within UiStoreProvider.')
  }

  return store
}
