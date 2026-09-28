import type { MarketInstrument } from '@/types/market'
import type { MarketBucketId } from '@/types/marketBucket'
import type { WatchCandidate } from '@/types/watchCandidate'

export interface DailyBucketCandidateSelection {
  candidate: WatchCandidate
  instrument: MarketInstrument
}

function belongsToBucket(instrument: MarketInstrument, bucketId: MarketBucketId): boolean {
  if (bucketId === 'upbit') return instrument.marketId === 'upbit'
  if (bucketId === 'binance') return instrument.marketId === 'binance-spot' || instrument.marketId === 'binance-futures'
  if (bucketId === 'kospi') return instrument.marketId === 'korea-stock' && instrument.marketType === 'kospi'
  if (bucketId === 'kosdaq') return instrument.marketId === 'korea-stock' && instrument.marketType === 'kosdaq'
  return instrument.marketId === 'us-stock'
}

function isBitcoinAnchor(instrument: MarketInstrument, bucketId: MarketBucketId) {
  if (bucketId !== 'upbit' && bucketId !== 'binance') return false
  const symbols = [instrument.symbol, instrument.displaySymbol, instrument.providerSymbol].filter(Boolean).map((value) => String(value).toUpperCase().replace(/[^A-Z0-9]/g, ''))
  const quote = bucketId === 'upbit' ? 'KRW' : 'USDT'
  return instrument.quoteCurrency.toUpperCase() === quote && symbols.some((symbol) => symbol === `BTC${quote}` || symbol === `${quote}BTC`)
}

/** Reuses the existing candidate order and only applies bucket/data-validity boundaries. */
export function selectDailyBucketCandidates(bucketId: MarketBucketId, candidates: readonly WatchCandidate[], instruments: readonly MarketInstrument[], limit = 5): readonly DailyBucketCandidateSelection[] {
  const byId = new Map(instruments.filter((instrument) => belongsToBucket(instrument, bucketId) && !isBitcoinAnchor(instrument, bucketId)).map((instrument) => [instrument.id, instrument]))
  return candidates.flatMap((candidate) => {
    const instrument = byId.get(candidate.instrumentId)
    if (!instrument || !Number.isFinite(instrument.lastPrice) || instrument.lastPrice <= 0) return []
    return [{ candidate, instrument }]
  }).slice(0, Math.max(0, Math.min(5, Math.trunc(limit))))
}
