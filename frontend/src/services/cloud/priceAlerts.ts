import { cloudRequest } from './cloudClient'
import type { MarketInstrument } from '@/types/market'
import { baseAsset } from '@/services/cryptoAnalysis/opportunityEngine'

export interface AlertInstrument { venue: 'upbit' | 'binance-spot' | 'binance-futures'; asset: string; quote: string; symbol: string }
export interface PriceAlert {
  id: string; asset: string; instrument: AlertInstrument; above: number | null; below: number | null;
  active: boolean; notify: boolean; createdAt: number; checkedAt: number | null; issue: string | null;
  events: { id: string; kind: 'above' | 'below'; at: number; sourceAt: number; price: number; threshold: number; delivery: 'off' | 'pending' | 'sending' | 'sent' | 'uncertain' }[];
}
export function alertInstrument(instrument: MarketInstrument): AlertInstrument | null {
  const venue = instrument.marketId, quote = instrument.quoteCurrency, asset = baseAsset(instrument.symbol, quote)
  if (!['upbit', 'binance-spot', 'binance-futures'].includes(venue) || !(venue === 'upbit' ? ['KRW','BTC','USDT'] : ['USDT']).includes(quote)) return null
  return { venue: venue as AlertInstrument['venue'], asset, quote, symbol: venue === 'upbit' ? `${quote}-${asset}` : `${asset}${quote}` }
}
export function alertInstrumentId(i: AlertInstrument) {
  return i.venue === 'upbit' ? `upbit-${i.quote === 'KRW' ? '' : i.quote.toLowerCase() + '-'}${i.asset.toLowerCase()}`
    : i.venue === 'binance-spot' ? `binance-spot-${i.symbol.toLowerCase()}` : `binance-${i.asset.toLowerCase()}`
}
// Older server revisions stored only asset; those alerts always monitored futures USDT.
// Preserve that meaning during a rolling deployment instead of showing them as spot.
export async function readPriceAlerts() {
  const data = await cloudRequest<{ rules: (Omit<PriceAlert, 'instrument'> & { instrument?: AlertInstrument })[] }>('/prices')
  return { rules: data.rules.map(rule => ({ ...rule, instrument: rule.instrument ?? { venue: 'binance-futures' as const, asset: rule.asset, quote: 'USDT', symbol: `${rule.asset}USDT` } })) }
}
export const savePriceAlert = (input: { instrument: AlertInstrument; above: number | null; below: number | null; notify: boolean; requestId: string }) => cloudRequest<{ rules: PriceAlert[] }>('/prices', input)
export const stopPriceAlert = (id: string) => cloudRequest<{ rules: PriceAlert[] }>('/prices/stop', { id })
export const setPriceAlertNotification = (id: string, notify: boolean) => cloudRequest<{ rules: PriceAlert[] }>('/prices/notification', { id, notify })
export const alertVenueLabel = (i: AlertInstrument, ko: boolean) => i.venue === 'upbit' ? 'Upbit' : i.venue === 'binance-spot' ? 'Binance Spot' : ko ? 'Binance 선물 · 마크가격' : 'Binance Futures · mark price'
