import type { Language } from '@/i18n/translations'
import type { CandidateHorizonProfile, WatchCandidateHorizon } from '@/types/watchCandidate'

const profiles: Record<Language, Record<WatchCandidateHorizon, CandidateHorizonProfile>> = {
  en: {
    short: { horizon: 'short', label: 'Short-term', description: 'Tight, caution-heavy review of immediate market conditions.', reviewCadence: 'Review daily or intraday', evidenceFocus: ['Momentum', 'Volume', 'Volatility', 'Immediate news'], scoreAdjustmentNote: 'Higher momentum and volume weight; stronger extreme-move penalty.' },
    swing: { horizon: 'swing', label: 'Swing', description: 'Multi-day review of trend continuation and pullback quality.', reviewCadence: 'Review every 2–3 days', evidenceFocus: ['Trend', 'Volume continuation', 'News context', 'Pullback quality'], scoreAdjustmentNote: 'Balanced momentum, volume, context, and moderate risk penalty.' },
    long: { horizon: 'long', label: 'Long-term', description: 'Weekly review focused on major, liquid assets and market stability.', reviewCadence: 'Review weekly', evidenceFocus: ['Liquidity', 'Major asset context', 'Market stability', 'Thesis risk'], scoreAdjustmentNote: 'Higher liquidity and major-asset weight; less sensitivity to short-term noise.' },
  },
  ko: {
    short: { horizon: 'short', label: '단기', description: '즉각적인 시장 조건을 좁고 보수적으로 검토합니다.', reviewCadence: '당일 또는 하루 단위 검토', evidenceFocus: ['모멘텀', '거래량', '변동성', '즉시성 뉴스'], scoreAdjustmentNote: '모멘텀·거래량 비중과 급격한 변동 감점이 큽니다.' },
    swing: { horizon: 'swing', label: '스윙', description: '추세 지속성과 되돌림 품질을 수일 단위로 검토합니다.', reviewCadence: '2~3일 단위 검토', evidenceFocus: ['추세', '거래량 지속', '뉴스 맥락', '되돌림 품질'], scoreAdjustmentNote: '모멘텀·거래량·맥락과 위험 감점을 균형 있게 반영합니다.' },
    long: { horizon: 'long', label: '장기', description: '주요 유동성 자산과 시장 안정성을 주간 단위로 검토합니다.', reviewCadence: '주간 단위 검토', evidenceFocus: ['유동성', '주요 자산 맥락', '시장 안정성', '논리 훼손 위험'], scoreAdjustmentNote: '유동성과 주요 자산 비중이 높고 단기 잡음 민감도는 낮습니다.' },
  },
}

export const candidateHorizons: readonly WatchCandidateHorizon[] = ['short', 'swing', 'long']
export const getCandidateHorizonProfile = (horizon: WatchCandidateHorizon, language: Language): CandidateHorizonProfile => profiles[language][horizon]
