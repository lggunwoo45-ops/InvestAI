import { useSyncExternalStore } from 'react'
const query = '(max-width: 760px)'
const snapshot = () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
const subscribe = (notify: () => void) => {
  if (typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia(query)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
export const useCompactLayout = () => useSyncExternalStore(subscribe, snapshot, () => false)
