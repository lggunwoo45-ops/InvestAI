import { createContext, useContext } from 'react'

export type PreviewTier = 'free' | 'adfree' | 'premium'
export const parsePreviewTier = (value: string | null): PreviewTier | null => value === 'free' || value === 'adfree' || value === 'premium' ? value : null
// A UI preview is deliberately not a billing entitlement or an AI authorization.
export const ExperienceContext = createContext({ tier: 'free' as PreviewTier, preview: false, chartTools: false, setTier: (_tier: PreviewTier | null) => {} })
export const useExperience = () => useContext(ExperienceContext)
