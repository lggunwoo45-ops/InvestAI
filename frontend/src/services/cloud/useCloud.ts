import { useSyncExternalStore } from 'react'
import { cloudSnapshot,subscribeCloud } from './cloudClient'
export const useCloud=()=>useSyncExternalStore(subscribeCloud,cloudSnapshot,cloudSnapshot)
