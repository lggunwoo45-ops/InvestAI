import { useEffect, useRef, useState } from 'react'
import { fetchResearch } from '@/services/research/researchClient'
import type { ResearchSnapshot } from '@/services/research/researchModel'

/** Retain same-asset observations during refresh; never carry values across assets. */
export function useResearchSnapshot(asset: string, revision: number, auto: boolean) {
  const [state, setState] = useState<{ asset: string; snapshot: ResearchSnapshot | null; loading: boolean; error: string; checkedAt: number }>(() => ({ asset, snapshot: null, loading: true, error: '', checkedAt: Date.now() }))
  const reload = useRef<() => void>(() => {})
  useEffect(() => {
    const controller = new AbortController()
    let busy = false
    const load = async () => {
      if (busy || controller.signal.aborted) return
      busy = true
      setState(previous => ({ asset, snapshot: previous.asset === asset ? previous.snapshot : null, loading: true, error: '', checkedAt: Date.now() }))
      try {
        const snapshot = await fetchResearch(asset, controller.signal)
        if (!controller.signal.aborted) setState({ asset, snapshot, loading: false, error: '', checkedAt: Date.now() })
      } catch (error) {
        if (!controller.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error instanceof Error ? error.message : '자료를 불러오지 못했습니다.' }))
      } finally { busy = false }
    }
    reload.current = () => { void load() }
    void load()
    return () => { controller.abort(); reload.current = () => {} }
  }, [asset, revision])
  useEffect(() => {
    if (!auto) return
    const refreshVisible = () => { if (document.visibilityState === 'visible') reload.current() }
    refreshVisible()
    const timer = window.setInterval(refreshVisible, 60_000)
    document.addEventListener('visibilitychange', refreshVisible)
    window.addEventListener('online', refreshVisible)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refreshVisible); window.removeEventListener('online', refreshVisible) }
  }, [auto])
  return state.asset === asset ? state : { asset, snapshot: null, loading: true, error: '', checkedAt: state.checkedAt }
}
