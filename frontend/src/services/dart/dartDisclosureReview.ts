import type { Language } from '@/i18n/translations'
import type { DartDisclosureCounts, DartDisclosureResult, DartDisclosureReview } from '@/types/dart'

const emptyCounts: DartDisclosureCounts = Object.freeze({ total: 0, periodic: 0, material: 0, correction: 0, other: 0 })

const copy = {
  en: {
    disabled: 'DART API key is not configured, so disclosures could not be loaded.', mapping: 'This instrument does not yet have a DART corporation-code mapping.', noData: 'Disclosure evidence is not available yet.', noRecent: 'No recent disclosures were loaded.', available: 'Recent disclosures available', needed: 'Disclosure review needed',
    summaryAvailable: 'Recent disclosure evidence is available for source review.', summaryNeeded: 'Correction or material disclosures are included, so source review is needed.', correction: 'Correction disclosures are included.', material: 'Material disclosures are included.', periodic: 'Periodic reports are included.', other: 'Other disclosure types are included.', caution: 'This is source evidence that should be reviewed in the original disclosure.',
  },
  ko: {
    disabled: 'DART API 키가 없어 공시를 불러오지 못했습니다.', mapping: '이 종목은 아직 DART 고유번호 매핑이 없어 공시를 불러오지 못했습니다.', noData: '공시 근거를 아직 사용할 수 없습니다.', noRecent: '조회된 최근 공시가 없습니다.', available: '최근 공시 확인', needed: '공시 확인 필요',
    summaryAvailable: '최근 공시 근거가 있어 원문 확인이 필요합니다.', summaryNeeded: '정정 또는 주요사항 관련 공시가 포함되어 있어 원문 확인이 필요합니다.', correction: '정정공시가 포함되어 있습니다.', material: '주요사항 관련 공시가 포함되어 있습니다.', periodic: '정기보고서가 포함되어 있습니다.', other: '기타 공시 유형이 포함되어 있습니다.', caution: '원문 확인이 필요한 근거 자료입니다.',
  },
} as const

function base(status: DartDisclosureReview['status'], headline: string, summary: string, result: DartDisclosureResult): DartDisclosureReview {
  return { status, headline, summary, reviewPoints: [], caution: copy.en.caution, counts: emptyCounts, mostRecentSubmittedAt: null, sourceMode: result.sourceMode }
}

/** Converts transport data into neutral review guidance without interpreting disclosure impact. */
export function buildDartDisclosureReview(result: DartDisclosureResult, language: Language): DartDisclosureReview {
  const t = copy[language]
  if (result.status === 'disabled') return { ...base('disabled', language === 'ko' ? '공시 점검' : 'Disclosure review', t.disabled, result), caution: t.caution }
  if (result.status === 'mapping_unavailable') return { ...base('mapping_unavailable', language === 'ko' ? '공시 점검' : 'Disclosure review', t.mapping, result), caution: t.caution }
  if (result.status !== 'ready') return { ...base('no_data', language === 'ko' ? '공시 점검' : 'Disclosure review', t.noData, result), caution: t.caution }
  if (result.disclosures.length === 0) return { ...base('no_recent_disclosures', language === 'ko' ? '공시 점검' : 'Disclosure review', t.noRecent, result), caution: t.caution }

  const counts = result.disclosures.reduce<DartDisclosureCounts>((current, disclosure) => ({
    ...current,
    total: current.total + 1,
    [disclosure.disclosureType]: current[disclosure.disclosureType] + 1,
  }), { total: 0, periodic: 0, material: 0, correction: 0, other: 0 })
  const reviewNeeded = counts.correction > 0 || counts.material > 0
  const reviewPoints: string[] = []
  if (counts.correction > 0) reviewPoints.push(t.correction)
  if (counts.material > 0) reviewPoints.push(t.material)
  if (counts.periodic > 0) reviewPoints.push(t.periodic)
  if (counts.other > 0) reviewPoints.push(t.other)
  const submittedDates = result.disclosures.map((disclosure) => disclosure.submittedAt).filter(Boolean).sort()

  return {
    status: reviewNeeded ? 'review_needed' : 'review_available',
    headline: reviewNeeded ? t.needed : t.available,
    summary: reviewNeeded ? t.summaryNeeded : t.summaryAvailable,
    reviewPoints,
    caution: t.caution,
    counts,
    mostRecentSubmittedAt: submittedDates.at(-1) ?? null,
    sourceMode: result.sourceMode,
  }
}
