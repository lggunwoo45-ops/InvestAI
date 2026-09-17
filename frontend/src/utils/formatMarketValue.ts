import type { MarketInstrument, QuoteCurrency } from '@/types/market'

const currencySymbols: Record<string, string> = {
  KRW: '₩',
  USD: '$',
  USDT: '',
}

export function formatMarketPrice(instrument: MarketInstrument): string {
  const { lastPrice, quoteCurrency } = instrument
  const fractionDigits = quoteCurrency === 'KRW' ? 0
    : quoteCurrency === 'BTC' || lastPrice < 0.0001 ? 8
      : lastPrice < 1 ? 6 : 2
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(lastPrice)

  const prefix = currencySymbols[quoteCurrency] ?? ''
  const suffix = prefix ? '' : ` ${quoteCurrency}`
  return `${prefix}${amount}${suffix}`
}

export function formatMarketChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatMarketVolume(value: number, currency: QuoteCurrency): string {
  const unit = currency === 'KRW' ? 'KRW' : currency
  return `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} ${unit}`
}
