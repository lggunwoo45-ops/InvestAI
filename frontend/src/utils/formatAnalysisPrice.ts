/** Keep small quote-price differences visible (e.g. USDC/USDT support vs resistance). */
export function formatAnalysisPrice(value: number, language: 'ko' | 'en') {
  return value.toLocaleString(language === 'ko' ? 'ko-KR' : 'en-US',
    Math.abs(value) >= 10000 ? { maximumFractionDigits: 0 }
      : Math.abs(value) >= 100 ? { maximumFractionDigits: 2 } : { maximumSignificantDigits: 8 })
}
