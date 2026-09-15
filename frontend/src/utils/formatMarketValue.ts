import type { MarketInstrument, QuoteCurrency } from '@/types/market'

const currencySymbols: Record<QuoteCurrency, string> = {
  KRW: '₩',
  USD: '$',
  USDT: '',
}

export function formatMarketPrice(instrument: MarketInstrument): string {
  const { lastPrice, quoteCurrency } = instrument
  const fractionDigits = quoteCurrency === 'KRW' ? 0 : lastPrice < 1 ? 4 : 2
  const amount = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(lastPrice)

  return `${currencySymbols[quoteCurrency]}${amount}${quoteCurrency === 'USDT' ? ' USDT' : ''}`
}

export function formatMarketChange(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatMarketVolume(value: number, currency: QuoteCurrency): string {
  const unit = currency === 'KRW' ? 'KRW' : currency
  return `${new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value)} ${unit}`
}
