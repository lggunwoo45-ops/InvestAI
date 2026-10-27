import { researchSourceState, type ResearchSnapshot, type ResearchSourceState } from '@/services/research/researchModel'
import type { ResearchMode } from './researchExperience'

export const researchSourceInfo: Record<string, { title: string; mode: ResearchMode; cadence: string }> = {
  mark: { title: '기준 가격·현재 펀딩', mode: 'overview', cadence: '현재 선물 가격·다음 정산 예상값' },
  candles: { title: '시간별 가격·거래량', mode: 'overview', cadence: '완료된 1시간봉' },
  interest: { title: '미결제약정', mode: 'indicators', cadence: '현재 계약 수량' },
  interestHistory: { title: '미결제약정 이력', mode: 'indicators', cadence: '1시간 집계' },
  ratios: { title: '롱/숏 계정 비율', mode: 'indicators', cadence: '1시간 집계·계정 수' },
  taker: { title: '매수/매도 거래량', mode: 'indicators', cadence: '1시간 집계·테이커 체결' },
  sentiment: { title: '공포·탐욕 지수', mode: 'indicators', cadence: '일일 발표·전체 코인 시장' },
  global: { title: '시가총액 비중', mode: 'indicators', cadence: '제공처 발표 시각 기준·전체 시장' },
  fundingInfo: { title: '펀딩 정산 간격', mode: 'costs', cadence: '종목별 조정 정보·비어 있으면 확정 이력에서 확인' },
  fundingHistory: { title: '확정 펀딩 이력', mode: 'costs', cadence: '정산 완료 시 갱신·최근 100회' },
  spot: { title: '해외 현물 가격', mode: 'premium', cadence: '현재 시세·24시간 거래대금' },
  futures: { title: '해외 선물 거래대금', mode: 'indicators', cadence: '최근 24시간 거래대금' },
  korea: { title: '업비트 가격', mode: 'premium', cadence: '국내 시세·USDT 원화 기준' },
  bybit: { title: 'Bybit 펀딩', mode: 'costs', cadence: '다음 정산 예상값' },
  okx: { title: 'OKX 펀딩', mode: 'costs', cadence: '다음 정산 예상값' },
  bitget: { title: 'Bitget 펀딩', mode: 'costs', cadence: '종목별 요율·정산 간격' },
  hyperliquid: { title: 'Hyperliquid 펀딩', mode: 'costs', cadence: 'USDC 계약·시간별 펀딩 기준' },
  koreaAll: { title: '국내 가격 비교', mode: 'premium', cadence: '지원하는 업비트 원화 종목' },
  spotAll: { title: '해외 가격 비교', mode: 'premium', cadence: '비교 가능한 Binance 현물 종목' },
}
const messages: Record<ResearchSourceState, { label: string; reason: string; next: string }> = {
  ready: { label: '최신 응답 확인', reason: '수집 시각과 해당 자료의 시간 기준을 통과했습니다.', next: '개별 지표에 필요한 값과 표본은 각 카드에서 추가 확인합니다.' },
  missing: { label: '응답 대기', reason: '이번 종목에 대한 자료 응답이 아직 없습니다.', next: '조회를 마친 뒤에도 계속되면 다시 불러오세요.' },
  unavailable: { label: '제공처 조회 실패', reason: '자료 제공처의 응답을 확보하지 못했습니다. 제한·지연·미지원 중 정확한 원인은 응답에 포함되지 않았습니다.', next: '다시 불러오거나 다른 지표를 확인하세요. 이 항목은 계산에서 제외합니다.' },
  expired: { label: '수집 자료 만료', reason: '마지막 수집 이후 유효 시간이 지나 현재 계산에서 제외했습니다.', next: '자동 갱신을 켜거나 새로고침해 최신 자료를 받으세요.' },
  timeInvalid: { label: '자료 시각 확인 불가', reason: '계산에 필요한 시각이 없거나 시간 순서가 맞지 않습니다.', next: '다시 불러와도 같으면 제공처 자료의 시각 확인이 필요합니다.' },
  providerDelayed: { label: '원자료 갱신 지연', reason: '응답은 받았지만 안에 담긴 가격·집계 시각이 기준보다 오래됐습니다.', next: '제공처가 새 값을 발표해야 계산을 다시 시작할 수 있습니다.' },
  empty: { label: '제공된 값 없음', reason: '응답에 계산할 값이나 완료된 기록이 없습니다.', next: '지원 종목·확보 기간을 확인하세요. 없는 값을 0으로 계산하지 않습니다.' },
}
export function sourceMessage(snapshot: ResearchSnapshot | null, sourceKey: string, now: number) {
  const state = researchSourceState(snapshot, sourceKey, now)
  if (state === 'empty' && sourceKey === 'fundingInfo') return { state, label: '개별 조정 정보 없음', reason: '별도로 조정된 펀딩 간격 목록이 비어 있습니다.', next: '확정 펀딩 이력의 정산 간격을 추가로 확인합니다.' }
  return { state, ...messages[state] }
}
