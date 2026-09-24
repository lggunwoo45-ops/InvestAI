import { useEffect, useState } from 'react'

import { dartClient } from '@/services/dart/dartClient'
import { getDartCorpCodeForStock } from '@/services/dart/dartCorpCodeMap'
import type { DartDisclosureResult } from '@/types/dart'

const inactive: DartDisclosureResult = { status: 'unavailable', sourceMode: 'disabled', message: 'DART is available for Korean stock instruments only.', disclosures: [], fetchedAt: null }

export function useDartDisclosures(stockCode: string | null): DartDisclosureResult {
  const corpCode = stockCode ? getDartCorpCodeForStock(stockCode) : null
  const requestKey = stockCode && corpCode ? `${stockCode}:${corpCode}` : null
  const [request, setRequest] = useState<{ key: string | null; result: DartDisclosureResult }>({ key: null, result: inactive })

  useEffect(() => {
    let active = true
    if (!stockCode || !corpCode || !requestKey) return () => { active = false }
    dartClient.loadDisclosures(stockCode, corpCode).then((result) => {
      if (active) setRequest({ key: requestKey, result })
    })
    return () => { active = false }
  }, [corpCode, requestKey, stockCode])

  if (!stockCode) return inactive
  if (!corpCode) return { status: 'mapping_unavailable', sourceMode: 'disabled', message: 'DART corporation code mapping is not available for this instrument.', disclosures: [], fetchedAt: null }
  if (request.key !== requestKey) return { status: 'loading', sourceMode: 'disabled', message: 'Loading DART disclosures.', disclosures: [], fetchedAt: null }
  return request.result
}
