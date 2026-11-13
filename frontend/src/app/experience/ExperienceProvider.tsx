import { useState, type PropsWithChildren } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ExperienceContext, parsePreviewTier, type PreviewTier } from './experienceContext'

export function ExperienceProvider({ children }: PropsWithChildren) {
  const location = useLocation(), navigate = useNavigate()
  const requested = parsePreviewTier(new URLSearchParams(location.search).get('planPreview'))
  const [choice, setChoice] = useState<PreviewTier | null>(requested)
  const [lastRequest, setLastRequest] = useState(requested)
  if (requested !== lastRequest) {
    setLastRequest(requested)
    if (requested) setChoice(requested)
  }
  const tier = requested ?? choice ?? 'free'
  const setTier = (next: PreviewTier | null) => {
    setChoice(next)
    const params = new URLSearchParams(location.search)
    if (next) params.set('planPreview', next)
    else params.delete('planPreview')
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true })
  }
  return <ExperienceContext value={{ tier, preview: choice !== null || requested !== null, chartTools: tier === 'premium' && (choice !== null || requested !== null), setTier }}>{children}</ExperienceContext>
}
