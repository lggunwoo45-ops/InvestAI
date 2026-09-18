/** News links must be absolute HTTPS URLs without embedded credentials. */
export function safeNewsUrl(value: string | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname && !url.username && !url.password ? url.href : null
  } catch {
    return null
  }
}
