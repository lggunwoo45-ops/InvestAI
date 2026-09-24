import type { DartDisclosureResult } from '@/types/dart'

/** Deterministic UI/test fixture. It is never used as a live fallback. */
export const dartMockResult = Object.freeze({
  status: 'ready', sourceMode: 'mock', message: 'Mock DART disclosures for interface testing.', fetchedAt: '2026-09-24T00:00:00.000Z', disclosures: [
    { id: 'dart-mock-periodic', receiptNo: 'mock-periodic', corpCode: 'mock', stockCode: '005930', corpName: 'Demo Corporation', reportName: '분기보고서 (모의 자료)', submittedAt: '2026-09-20', disclosureType: 'periodic', detailUrl: null, source: 'mock', isCorrection: false, isMaterial: false, isPeriodic: true },
    { id: 'dart-mock-correction', receiptNo: 'mock-correction', corpCode: 'mock', stockCode: '005930', corpName: 'Demo Corporation', reportName: '[기재정정] 기업설명회 (모의 자료)', submittedAt: '2026-09-18', disclosureType: 'correction', detailUrl: null, source: 'mock', isCorrection: true, isMaterial: false, isPeriodic: false },
  ],
} satisfies DartDisclosureResult)
