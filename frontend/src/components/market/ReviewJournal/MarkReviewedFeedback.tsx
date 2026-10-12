import { useEffect, useState } from 'react'
import type { Language } from '@/i18n/translations'

export function MarkReviewedFeedback({ language, onReview }: { language: Language; onReview: () => void }) {
  const [confirmation, setConfirmation] = useState(0)
  useEffect(() => {
    if (!confirmation) return
    const timer = window.setTimeout(() => setConfirmation(0), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmation])
  const label = language === 'ko' ? '확인 완료' : 'Mark reviewed'
  return <>
    <button type="button" aria-label={label} onClick={() => { onReview(); setConfirmation(value => value + 1) }}>{label}</button>
    {confirmation > 0 && <small role="status" aria-live="polite">
      <strong>{language === 'ko' ? '확인 완료됨' : 'Marked reviewed'}</strong>{' · '}
      {language === 'ko' ? '현재 분석이 다음 비교 기준으로 저장되었습니다.' : 'Current analysis was saved as the next comparison baseline.'}
    </small>}
  </>
}
