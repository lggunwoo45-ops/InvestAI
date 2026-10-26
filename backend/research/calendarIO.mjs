export async function boundedCalendarText(response, limit = 1_000_000) {
  if (!response.body?.getReader) { const text = await response.text(); if (text.length > limit) throw new Error('too_large'); return text }
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let text = '', size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) throw new Error('too_large')
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}
