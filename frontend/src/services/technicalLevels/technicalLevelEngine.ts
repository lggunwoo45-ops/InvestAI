import type { Language } from '@/i18n/translations'
import type { MarketInstrument } from '@/types/market'
import type { Candle } from '@/types/marketDetail'
import type { AnalysisDataQuality } from '@/types/myAnalysis'
import type {
  ChartOverlayLine,
  FibonacciRatio,
  MovingAverageContext,
  MovingAveragePeriod,
  TechnicalLevel,
  TechnicalLevelAnalysis,
  TechnicalLevelKind,
  TechnicalLevelSet,
  TechnicalLevelSource,
  TechnicalLevelStrength,
  TechnicalLevelsUnavailableReason,
} from '@/types/technicalLevels'

export const MIN_TECHNICAL_LEVEL_CANDLES = 20
export const TECHNICAL_LEVEL_LOOKBACK = 60

const movingAveragePeriods: readonly MovingAveragePeriod[] = [5, 20, 60]
const fibonacciRatios: readonly FibonacciRatio[] = [0.382, 0.5, 0.618]

const copy = {
  en: {
    labels: { support: ['First support', 'Second support'], resistance: ['First resistance', 'Second resistance'], reboundWatch: 'Rebound watch zone', breakdownCheck: 'Breakdown check zone', currentPrice: 'Current price' },
    movingAverage: (period: number) => `MA ${period}`,
    fibonacci: (ratio: number) => `Fibonacci ${(ratio * 100).toFixed(1)}%`,
    reasons: {
      support: 'Observed low reference from the loaded candle range.',
      resistance: 'Observed high reference from the loaded candle range.',
      reboundWatch: 'Nearest observed support used only to review whether price behavior stabilizes.',
      breakdownCheck: 'Secondary observed support used only to review whether the prior range weakens.',
      movingAverage: (period: number) => `Average close of the latest ${period} valid candles.`,
      fibonacci: 'Relative position within the observed high-low candle range.',
      currentPrice: 'Latest valid market or candle price used as the comparison reference.',
    },
    ready: (count: number) => `Rule-based technical references calculated from ${count} recent valid candles.`,
    unavailable: {
      insufficientCandles: 'Technical references are unavailable because there is not enough valid candle history.',
      invalidCurrentPrice: 'Technical references are unavailable because a valid current price could not be determined.',
      insufficientRange: 'Technical references are unavailable because the loaded candles do not contain a usable price range.',
      unavailableData: 'Technical references are unavailable because the current data source is unavailable.',
    },
    averageSummary: { above: 'Current price is above the short moving average.', below: 'Current price is below major moving averages.', mixed: 'Current price is positioned between the moving averages.', clustered: 'Moving averages are clustered around the current price.', unavailable: 'Moving-average context is unavailable.' },
    safety: 'Technical levels are historical, rule-based reference areas. They are not order prices, trade instructions, or forecasts.',
    quality: { mock: 'Mock data limits the reliability of these references.', limited: 'Limited data may make these references incomplete.', unavailable: 'Unavailable data prevents technical level calculation.' },
  },
  ko: {
    labels: { support: ['1차 지지', '2차 지지'], resistance: ['1차 저항', '2차 저항'], reboundWatch: '반등 관찰 구간', breakdownCheck: '이탈 확인 구간', currentPrice: '현재가' },
    movingAverage: (period: number) => `이동평균 ${period}`,
    fibonacci: (ratio: number) => `피보나치 ${(ratio * 100).toFixed(1)}%`,
    reasons: {
      support: '불러온 캔들 범위에서 확인된 저가 참고 수준입니다.',
      resistance: '불러온 캔들 범위에서 확인된 고가 참고 수준입니다.',
      reboundWatch: '가격 흐름의 안정 여부를 살펴보기 위한 가장 가까운 지지 참고 수준입니다.',
      breakdownCheck: '기존 범위가 약해지는지 살펴보기 위한 두 번째 지지 참고 수준입니다.',
      movingAverage: (period: number) => `최근 유효 캔들 ${period}개의 종가 평균입니다.`,
      fibonacci: '관찰된 캔들 고가·저가 범위 안의 상대적 위치입니다.',
      currentPrice: '비교 기준으로 사용한 최신 유효 시장가 또는 캔들 종가입니다.',
    },
    ready: (count: number) => `최근 유효 캔들 ${count}개로 규칙 기반 기술 참고 수준을 계산했습니다.`,
    unavailable: {
      insufficientCandles: '유효한 캔들 이력이 부족해 기술 참고 수준을 계산할 수 없습니다.',
      invalidCurrentPrice: '유효한 현재 가격을 확인할 수 없어 기술 참고 수준을 계산할 수 없습니다.',
      insufficientRange: '불러온 캔들에 유효한 가격 범위가 없어 기술 참고 수준을 계산할 수 없습니다.',
      unavailableData: '현재 데이터 소스를 사용할 수 없어 기술 참고 수준을 계산할 수 없습니다.',
    },
    averageSummary: { above: '현재가는 단기 이동평균 위에 있습니다.', below: '현재가는 주요 이동평균 아래에 있습니다.', mixed: '현재가는 이동평균선 사이에 있습니다.', clustered: '이동평균선이 현재가 주변에 밀집되어 있습니다.', unavailable: '이동평균 맥락을 확인할 수 없습니다.' },
    safety: '기술적 수준은 과거 데이터 기반의 규칙형 참고 구간이며, 주문 가격이나 거래 지시 또는 예측이 아닙니다.',
    quality: { mock: '모의 데이터이므로 참고 수준의 신뢰가 제한됩니다.', limited: '제한된 데이터이므로 참고 수준이 불완전할 수 있습니다.', unavailable: '데이터를 사용할 수 없어 기술 참고 수준을 계산하지 않습니다.' },
  },
} as const

export interface BuildTechnicalLevelsInput {
  instrument: MarketInstrument
  candles: readonly Candle[]
  language?: Language
  dataQuality?: AnalysisDataQuality
}

function isFinitePositive(value: number) {
  return Number.isFinite(value) && value > 0
}

function isValidCandle(candle: Candle) {
  return Number.isFinite(candle.timestamp)
    && isFinitePositive(candle.open)
    && isFinitePositive(candle.high)
    && isFinitePositive(candle.low)
    && isFinitePositive(candle.close)
    && Number.isFinite(candle.volume)
    && candle.volume >= 0
    && candle.high >= Math.max(candle.open, candle.close, candle.low)
    && candle.low <= Math.min(candle.open, candle.close, candle.high)
}

function normalizeCandles(candles: readonly Candle[]) {
  const byTimestamp = new Map<number, Candle>()
  candles.forEach((candle) => {
    if (isValidCandle(candle)) byTimestamp.set(candle.timestamp, candle)
  })
  return [...byTimestamp.values()].sort((left, right) => left.timestamp - right.timestamp)
}

function formatPrice(price: number, instrument: MarketInstrument, language: Language) {
  const absolute = Math.abs(price)
  const baseDigits = instrument.quoteCurrency === 'BTC' || instrument.quoteCurrency === 'ETH' ? 8 : 4
  const meaningfulDigits = absolute > 0 && absolute < 1
    ? Math.max(baseDigits, Math.ceil(-Math.log10(absolute)) + 2)
    : baseDigits
  const value = absolute > 0 && absolute < 1e-12
    ? price.toExponential(2)
    : new Intl.NumberFormat(language === 'ko' ? 'ko-KR' : 'en-US', { maximumFractionDigits: Math.min(12, meaningfulDigits) }).format(price)
  return `${value} ${instrument.quoteCurrency}`.trim()
}

function roundedPercent(value: number) {
  return Math.round(value * 10_000) / 10_000
}

interface LevelInput {
  id: string
  kind: TechnicalLevelKind
  label: string
  price: number
  strength: TechnicalLevelStrength
  reason: string
  source: TechnicalLevelSource
}

function makeLevel(input: LevelInput, currentPrice: number, instrument: MarketInstrument, language: Language): TechnicalLevel {
  const distance = roundedPercent(((input.price - currentPrice) / currentPrice) * 100)
  return {
    ...input,
    priceLabel: formatPrice(input.price, instrument, language),
    distanceFromCurrentPercent: distance,
    isAboveCurrent: input.price > currentPrice,
    isBelowCurrent: input.price < currentPrice,
  }
}

function currentPriceLevel(currentPrice: number | null, instrument: MarketInstrument, language: Language): TechnicalLevel | null {
  if (currentPrice === null) return null
  const t = copy[language]
  return makeLevel({ id: 'current-price', kind: 'currentPrice', label: t.labels.currentPrice, price: currentPrice, strength: 'moderate', reason: t.reasons.currentPrice, source: 'currentPrice' }, currentPrice, instrument, language)
}

function unavailableAverageContext(language: Language): MovingAverageContext {
  return { available: false, nearestAverage: null, shortAverage: null, mediumAverage: null, longAverage: null, pricePosition: 'unavailable', summary: copy[language].averageSummary.unavailable }
}

function qualityCautions(language: Language, dataQuality: AnalysisDataQuality) {
  const t = copy[language]
  if (dataQuality === 'live') return [t.safety]
  return [t.safety, t.quality[dataQuality]]
}

function unavailableAnalysis(input: BuildTechnicalLevelsInput, candleCount: number, currentPrice: number | null, asOfTimestamp: number | null, reason: TechnicalLevelsUnavailableReason, language: Language, dataQuality: AnalysisDataQuality): TechnicalLevelAnalysis {
  const t = copy[language]
  const levelSet: TechnicalLevelSet = {
    status: 'unavailable',
    instrumentId: input.instrument.id,
    symbol: input.instrument.displaySymbol ?? input.instrument.symbol,
    currentPrice,
    currentPriceLevel: currentPriceLevel(currentPrice, input.instrument, language),
    asOfTimestamp,
    candleCount,
    firstSupport: null,
    secondSupport: null,
    firstResistance: null,
    secondResistance: null,
    reboundWatchZone: null,
    breakdownCheckZone: null,
    movingAverages: [],
    fibonacciLevels: [],
    summary: t.unavailable[reason],
    cautions: qualityCautions(language, dataQuality),
    dataQuality,
    unavailableReason: reason,
  }
  return { levelSet, movingAverageContext: unavailableAverageContext(language), overlayLines: [] }
}

function nearestDistinct(values: readonly number[], currentPrice: number, kind: 'support' | 'resistance') {
  const tolerance = Math.max(Math.abs(currentPrice) * 0.0005, Number.EPSILON)
  const ordered = values
    .filter((value) => isFinitePositive(value) && (kind === 'support' ? value < currentPrice : value > currentPrice))
    .sort((left, right) => kind === 'support' ? right - left : left - right)
  const result: number[] = []
  ordered.forEach((value) => {
    if (result.length < 2 && result.every((existing) => Math.abs(existing - value) > tolerance)) result.push(value)
  })
  return result
}

function observedStrength(price: number, observations: readonly number[], pivotPrices: readonly number[], currentPrice: number): TechnicalLevelStrength {
  const tolerance = Math.max(Math.abs(currentPrice) * 0.0005, Number.EPSILON)
  const touches = observations.filter((value) => Math.abs(value - price) <= tolerance).length
  const pivot = pivotPrices.some((value) => Math.abs(value - price) <= tolerance)
  if (touches >= 3 || (pivot && touches >= 2)) return 'strong'
  if (touches >= 2 || pivot) return 'moderate'
  return 'weak'
}

function supportAndResistance(candles: readonly Candle[], currentPrice: number, instrument: MarketInstrument, language: Language) {
  const t = copy[language]
  const lows = candles.map((candle) => candle.low)
  const highs = candles.map((candle) => candle.high)
  const pivotLows: number[] = []
  const pivotHighs: number[] = []
  for (let index = 1; index < candles.length - 1; index += 1) {
    const previous = candles[index - 1]
    const current = candles[index]
    const next = candles[index + 1]
    if (current.low <= previous.low && current.low <= next.low) pivotLows.push(current.low)
    if (current.high >= previous.high && current.high >= next.high) pivotHighs.push(current.high)
  }

  const supports = nearestDistinct([...pivotLows, ...lows], currentPrice, 'support').map((price, index) => makeLevel({
    id: `support-${index + 1}`,
    kind: 'support',
    label: t.labels.support[index],
    price,
    strength: observedStrength(price, lows, pivotLows, currentPrice),
    reason: t.reasons.support,
    source: pivotLows.includes(price) ? 'candlePivot' : 'candleRange',
  }, currentPrice, instrument, language))
  const resistances = nearestDistinct([...pivotHighs, ...highs], currentPrice, 'resistance').map((price, index) => makeLevel({
    id: `resistance-${index + 1}`,
    kind: 'resistance',
    label: t.labels.resistance[index],
    price,
    strength: observedStrength(price, highs, pivotHighs, currentPrice),
    reason: t.reasons.resistance,
    source: pivotHighs.includes(price) ? 'candlePivot' : 'candleRange',
  }, currentPrice, instrument, language))
  return { supports, resistances }
}

function movingAverageLevels(candles: readonly Candle[], currentPrice: number, instrument: MarketInstrument, language: Language): readonly TechnicalLevel[] {
  const t = copy[language]
  return movingAveragePeriods.flatMap((period) => {
    if (candles.length < period) return []
    const closes = candles.slice(-period).map((candle) => candle.close)
    const price = closes.reduce((total, close) => total + close, 0) / period
    const strength: TechnicalLevelStrength = period === 60 ? 'strong' : period === 20 ? 'moderate' : 'weak'
    return [makeLevel({ id: `moving-average-${period}`, kind: 'movingAverage', label: t.movingAverage(period), price, strength, reason: t.reasons.movingAverage(period), source: 'movingAverage' }, currentPrice, instrument, language)]
  })
}

function movingAverageContext(levels: readonly TechnicalLevel[], currentPrice: number, language: Language): MovingAverageContext {
  const byId = new Map(levels.map((level) => [level.id, level]))
  const nearestAverage = [...levels].sort((left, right) => Math.abs((left.price ?? currentPrice) - currentPrice) - Math.abs((right.price ?? currentPrice) - currentPrice))[0] ?? null
  const pricePosition = levels.length === 0 ? 'unavailable' : levels.every((level) => level.isBelowCurrent) ? 'above' : levels.every((level) => level.isAboveCurrent) ? 'below' : 'mixed'
  const averagePrices = levels.flatMap((level) => level.price === null ? [] : [level.price])
  const isClustered = pricePosition === 'mixed'
    && averagePrices.length > 1
    && (Math.max(...averagePrices) - Math.min(...averagePrices)) / currentPrice <= 0.01
  return {
    available: levels.length > 0,
    nearestAverage,
    shortAverage: byId.get('moving-average-5') ?? null,
    mediumAverage: byId.get('moving-average-20') ?? null,
    longAverage: byId.get('moving-average-60') ?? null,
    pricePosition,
    summary: isClustered ? copy[language].averageSummary.clustered : copy[language].averageSummary[pricePosition],
  }
}

function fibonacciLevels(low: number, high: number, currentPrice: number, instrument: MarketInstrument, language: Language): readonly TechnicalLevel[] {
  const t = copy[language]
  const span = high - low
  return fibonacciRatios.map((ratio) => makeLevel({
    id: `fibonacci-${Math.round(ratio * 1000)}`,
    kind: 'fibonacci',
    label: t.fibonacci(ratio),
    price: low + span * ratio,
    strength: ratio === 0.5 ? 'moderate' : 'weak',
    reason: t.reasons.fibonacci,
    source: 'fibonacciRange',
  }, currentPrice, instrument, language))
}

function zoneFromSupport(level: TechnicalLevel | null, kind: 'reboundWatch' | 'breakdownCheck', instrument: MarketInstrument, currentPrice: number, language: Language) {
  if (!level?.price) return null
  const t = copy[language]
  return makeLevel({ id: kind === 'reboundWatch' ? 'rebound-watch' : 'breakdown-check', kind, label: t.labels[kind], price: level.price, strength: level.strength, reason: t.reasons[kind], source: level.source }, currentPrice, instrument, language)
}

function overlay(level: TechnicalLevel, visibleByDefault: boolean): ChartOverlayLine | null {
  if (level.price === null) return null
  const style = level.kind === 'movingAverage' ? 'dashed' : level.kind === 'fibonacci' ? 'dotted' : 'solid'
  return { id: level.id, label: level.label, price: level.price, kind: level.kind, strength: level.strength, style, visibleByDefault }
}

export function buildTechnicalLevelAnalysis(input: BuildTechnicalLevelsInput): TechnicalLevelAnalysis {
  const language = input.language ?? 'en'
  const dataQuality = input.dataQuality ?? 'limited'
  const normalized = normalizeCandles(input.candles)
  const latest = normalized.at(-1) ?? null
  const currentPrice = isFinitePositive(input.instrument.lastPrice) ? input.instrument.lastPrice : latest?.close && isFinitePositive(latest.close) ? latest.close : null
  const asOfTimestamp = latest?.timestamp ?? null

  if (dataQuality === 'unavailable') return unavailableAnalysis(input, normalized.length, currentPrice, asOfTimestamp, 'unavailableData', language, dataQuality)
  if (normalized.length < MIN_TECHNICAL_LEVEL_CANDLES) return unavailableAnalysis(input, normalized.length, currentPrice, asOfTimestamp, 'insufficientCandles', language, dataQuality)
  if (currentPrice === null) return unavailableAnalysis(input, normalized.length, null, asOfTimestamp, 'invalidCurrentPrice', language, dataQuality)

  const recent = normalized.slice(-TECHNICAL_LEVEL_LOOKBACK)
  const low = Math.min(...recent.map((candle) => candle.low))
  const high = Math.max(...recent.map((candle) => candle.high))
  if (!isFinitePositive(low) || !isFinitePositive(high) || high <= low) return unavailableAnalysis(input, recent.length, currentPrice, asOfTimestamp, 'insufficientRange', language, dataQuality)

  const { supports, resistances } = supportAndResistance(recent, currentPrice, input.instrument, language)
  const averages = movingAverageLevels(recent, currentPrice, input.instrument, language)
  const fibonacci = fibonacciLevels(low, high, currentPrice, input.instrument, language)
  const firstSupport = supports[0] ?? null
  const secondSupport = supports[1] ?? null
  const firstResistance = resistances[0] ?? null
  const secondResistance = resistances[1] ?? null
  const current = currentPriceLevel(currentPrice, input.instrument, language)
  const averageContext = movingAverageContext(averages, currentPrice, language)
  const overlays = [
    current ? overlay(current, true) : null,
    firstSupport ? overlay(firstSupport, true) : null,
    secondSupport ? overlay(secondSupport, false) : null,
    firstResistance ? overlay(firstResistance, true) : null,
    secondResistance ? overlay(secondResistance, false) : null,
    ...averages.map((level) => overlay(level, level.id === averageContext.nearestAverage?.id)),
    ...fibonacci.map((level) => overlay(level, false)),
  ].filter((line): line is ChartOverlayLine => line !== null)
  const levelSet: TechnicalLevelSet = {
    status: 'ready',
    instrumentId: input.instrument.id,
    symbol: input.instrument.displaySymbol ?? input.instrument.symbol,
    currentPrice,
    currentPriceLevel: current,
    asOfTimestamp,
    candleCount: recent.length,
    firstSupport,
    secondSupport,
    firstResistance,
    secondResistance,
    reboundWatchZone: zoneFromSupport(firstSupport, 'reboundWatch', input.instrument, currentPrice, language),
    breakdownCheckZone: zoneFromSupport(secondSupport, 'breakdownCheck', input.instrument, currentPrice, language),
    movingAverages: averages,
    fibonacciLevels: fibonacci,
    summary: copy[language].ready(recent.length),
    cautions: qualityCautions(language, dataQuality),
    dataQuality,
    unavailableReason: null,
  }
  return { levelSet, movingAverageContext: averageContext, overlayLines: overlays }
}

export function buildTechnicalLevels(input: BuildTechnicalLevelsInput): TechnicalLevelSet {
  return buildTechnicalLevelAnalysis(input).levelSet
}
