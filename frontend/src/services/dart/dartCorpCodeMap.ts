const verifiedCorpCodes: Readonly<Record<string, string>> = Object.freeze({
  // OpenDART corporation code supplied in the approved Sprint 10.12 API example.
  '005930': '00126380',
})

export function getDartCorpCodeForStock(stockCode: string): string | null {
  return verifiedCorpCodes[stockCode.trim()] ?? null
}
