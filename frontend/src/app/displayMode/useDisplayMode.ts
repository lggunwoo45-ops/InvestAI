import { useContext } from 'react'

import { DisplayModeContext } from './displayModeContext'

export function useDisplayMode() {
  const value = useContext(DisplayModeContext)
  if (!value) throw new Error('DisplayModeProvider is missing')
  return value
}
