export const researchModes = [
  ['overview', '시장 컨디션'], ['indicators', '시장 지표'], ['position', '포지션 위험'], ['costs', '수수료·펀딩'],
  ['premium', '김치프리미엄'], ['setups', '신호 조합 검증'], ['journal', '검토·변화 기록'], ['alerts', '조건 알림·결과'], ['guide', '가이드·방법론'],
] as const
export type ResearchMode = typeof researchModes[number][0]
