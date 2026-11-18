import { fail } from './accounts.mjs'

// Old price rules were Binance USDT futures only. Never reinterpret them as spot.
export function priceInstrument(input) {
  const i = input.instrument ?? { venue: 'binance-futures', asset: input.asset, quote: 'USDT' }
  if (!i || !['upbit', 'binance-spot', 'binance-futures'].includes(i.venue)
    || typeof i.asset !== 'string' || !/^[A-Z0-9]{1,30}$/.test(i.asset)
    || !(i.venue === 'upbit' ? ['KRW', 'BTC', 'USDT'] : ['USDT']).includes(i.quote)
    || i.asset === i.quote) fail(400, '지원하는 거래소와 거래쌍을 확인해주세요.')
  const symbol = i.venue === 'upbit' ? `${i.quote}-${i.asset}` : `${i.asset}${i.quote}`
  if (i.symbol !== undefined && i.symbol !== symbol) fail(400, '거래소·종목·통화가 일치하지 않습니다.')
  return { venue: i.venue, asset: i.asset, quote: i.quote, symbol }
}
export const priceInstrumentKey = input => { const i = priceInstrument(input); return `${i.venue}:${i.symbol}` }
