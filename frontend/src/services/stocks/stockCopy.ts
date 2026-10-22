export const stockMoney = (value: number) => `₩${value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}`
export function stockErrorText(code: string, ko: boolean) {
  if (['stock_setup_required', 'stock_public_disabled'].includes(code)) return ko ? '국내 주식 시세 연결 설정이 필요해요. 지금은 종목 검색과 보유 기록 저장을 사용할 수 있어요.' : 'Stock data setup is required. Search and saved holdings are available.'
  if (['stock_busy', 'busy', 'provider_limit', 'provider_wait', 'authentication_wait'].includes(code)) return ko ? '조회가 몰려 잠시 쉬고 있어요. 잠시 후 다시 확인해 주세요.' : 'Requests are temporarily limited. Please retry shortly.'
  return ko ? '주식 자료를 가져오지 못했어요. 연결 설정이나 시세 제공사의 응답을 확인해야 해요.' : 'Stock data could not be loaded. Check the connection or provider response.'
}
