import type { MarketInstrument, QuoteCurrency } from '@/types/market'

const priceFormatters = new Map<number, Intl.NumberFormat>()
const volumeFormatter = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

function priceFormatter(digits: number) {
  let formatter = priceFormatters.get(digits)
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: digits })
    priceFormatters.set(digits, formatter)
  }
  return formatter
}

export function formatMarketPrice(instrument: MarketInstrument): string {
  const { lastPrice, quoteCurrency } = instrument
  if (!Number.isFinite(lastPrice)) return '—'
  const absolute = Math.abs(lastPrice)
  const krwDecimalDigits = quoteCurrency === 'KRW' && !Number.isInteger(lastPrice)
    ? lastPrice.toString().split('.')[1]?.length ?? 2
    : 0
  const normalDigits = quoteCurrency === 'KRW' ? krwDecimalDigits : 2
  const meaningfulDigits = absolute > 0 && absolute < 1
    ? Math.max(quoteCurrency === 'BTC' || quoteCurrency === 'ETH' ? 8 : 4, Math.ceil(-Math.log10(absolute)) + 2)
    : normalDigits
  const digits = Math.min(12, meaningfulDigits)
  let amount = absolute > 0 && absolute < 1e-12
    ? lastPrice.toExponential(2)
    : priceFormatter(digits).format(lastPrice)
  // Retain the source value if a rare high-precision KRW decimal exceeds the display cap.
  if (quoteCurrency === 'KRW' && !Number.isInteger(lastPrice) && Number(amount.replaceAll(',', '')) === Math.trunc(lastPrice)) {
    amount = lastPrice.toString()
  }
  return quoteCurrency === 'KRW' ? `₩${amount}` : quoteCurrency === 'USD' ? `$${amount}` : `${amount} ${quoteCurrency}`
}

export function formatMarketChange(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function formatMarketVolume(value: number, currency: QuoteCurrency): string {
  if (!Number.isFinite(value)) return '—'
  return `${volumeFormatter.format(value)} ${currency}`
}
