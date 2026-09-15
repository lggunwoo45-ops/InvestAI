const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: '2-digit',
  year: 'numeric',
})

export function formatTime(value: Date): string {
  return timeFormatter.format(value)
}

export function formatDate(value: Date): string {
  return dateFormatter.format(value)
}
