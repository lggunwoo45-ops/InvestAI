import type { AnalysisDataQuality } from './myAnalysis'

export type TechnicalLevelStatus = 'ready' | 'unavailable'
export type TechnicalLevelKind = 'support' | 'resistance' | 'reboundWatch' | 'breakdownCheck' | 'movingAverage' | 'fibonacci' | 'currentPrice' | 'unavailable'
export type TechnicalLevelStrength = 'weak' | 'moderate' | 'strong'
export type TechnicalLevelSource = 'candlePivot' | 'candleRange' | 'movingAverage' | 'fibonacciRange' | 'currentPrice' | 'unavailable'
export type TechnicalLevelsUnavailableReason = 'insufficientCandles' | 'invalidCurrentPrice' | 'insufficientRange' | 'unavailableData'
export type MovingAveragePeriod = 5 | 20 | 60
export type FibonacciRatio = 0.382 | 0.5 | 0.618
export type PricePosition = 'above' | 'below' | 'mixed' | 'unavailable'
export type ChartOverlayStyle = 'solid' | 'dashed' | 'dotted'

export interface TechnicalLevel {
  id: string
  kind: TechnicalLevelKind
  label: string
  price: number | null
  priceLabel: string
  strength: TechnicalLevelStrength
  reason: string
  source: TechnicalLevelSource
  distanceFromCurrentPercent: number | null
  isAboveCurrent: boolean
  isBelowCurrent: boolean
}

export interface ChartOverlayLine {
  id: string
  label: string
  price: number
  kind: TechnicalLevelKind
  strength: TechnicalLevelStrength
  style: ChartOverlayStyle
  visibleByDefault: boolean
}

export interface MovingAverageContext {
  available: boolean
  nearestAverage: TechnicalLevel | null
  shortAverage: TechnicalLevel | null
  mediumAverage: TechnicalLevel | null
  longAverage: TechnicalLevel | null
  pricePosition: PricePosition
  summary: string
}

export interface TechnicalLevelSet {
  status: TechnicalLevelStatus
  instrumentId: string
  symbol: string
  currentPrice: number | null
  currentPriceLevel: TechnicalLevel | null
  asOfTimestamp: number | null
  candleCount: number
  firstSupport: TechnicalLevel | null
  secondSupport: TechnicalLevel | null
  firstResistance: TechnicalLevel | null
  secondResistance: TechnicalLevel | null
  reboundWatchZone: TechnicalLevel | null
  breakdownCheckZone: TechnicalLevel | null
  movingAverages: readonly TechnicalLevel[]
  fibonacciLevels: readonly TechnicalLevel[]
  summary: string
  cautions: readonly string[]
  dataQuality: AnalysisDataQuality
  unavailableReason: TechnicalLevelsUnavailableReason | null
}

export interface TechnicalLevelAnalysis {
  levelSet: TechnicalLevelSet
  movingAverageContext: MovingAverageContext
  overlayLines: readonly ChartOverlayLine[]
}
