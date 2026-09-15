import type { MarketRegion, MarketSessionStatus } from '@/types/dashboard'

interface ZonedTime {
  weekday: string
  hour: number
  minute: number
}

function zonedTime(date: Date, timeZone: string): ZonedTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ''
  return { weekday: read('weekday'), hour: Number(read('hour')), minute: Number(read('minute')) }
}

function isWeekday(weekday: string) {
  return weekday !== 'Sat' && weekday !== 'Sun'
}

export function getMarketSessionStatus(region: MarketRegion, date = new Date()): MarketSessionStatus {
  if (region === 'crypto') return 'always-open'
  const market = region === 'korea'
    ? { timeZone: 'Asia/Seoul', open: 9 * 60, close: 15 * 60 + 30 }
    : { timeZone: 'America/New_York', open: 9 * 60 + 30, close: 16 * 60 }
  const time = zonedTime(date, market.timeZone)
  const minutes = time.hour * 60 + time.minute
  return isWeekday(time.weekday) && minutes >= market.open && minutes < market.close ? 'open' : 'closed'
}

export function marketSessionLabel(status: MarketSessionStatus) {
  if (status === 'always-open') return 'Always open'
  return status === 'open' ? 'Open' : 'Closed'
}
