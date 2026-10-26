export const calendarSources = [
  { id: 'bls', name: '미국 노동통계국 BLS', url: 'https://www.bls.gov/schedule/news_release/bls.ics' },
  { id: 'fed', name: '미국 연방준비제도 FOMC', url: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm' },
]
const day = 86_400_000
const eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const parts = at => Object.fromEntries(eastern.formatToParts(at).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)]))
const titles = {
  'Consumer Price Index': '미국 소비자물가지수 (CPI)', 'Employment Situation': '미국 고용보고서',
  'Producer Price Index': '미국 생산자물가지수 (PPI)', 'Job Openings and Labor Turnover Survey': '미국 구인·이직 보고서 (JOLTS)',
  'Employment Cost Index': '미국 고용비용지수', 'Productivity and Costs': '미국 생산성·비용',
  'U.S. Import and Export Price Indexes': '미국 수출입물가지수', 'Real Earnings': '미국 실질소득',
  'Quarterly Data Series on Business Employment Dynamics': '미국 기업 고용 변동 (분기)',
  'Metropolitan Area Employment and Unemployment (Monthly)': '미국 대도시 고용·실업 (월간)',
  'Consumer Expenditures': '미국 소비 지출 조사', 'State Employment and Unemployment (Monthly)': '미국 주별 고용·실업 (월간)',
  'Employer-Reported Workplace Injuries and Illnesses (Annual)': '미국 사업장 산업재해 (연간)',
  'County Employment and Wages': '미국 카운티별 고용·임금', 'Census of Fatal Occupational Injuries': '미국 업무상 사망재해 조사',
  'Employer Costs for Employee Compensation': '미국 고용주 보상 비용', 'Work Experience of the Population (Annual)': '미국 인구의 취업 경험 (연간)',
  'State Job Openings and Labor Turnover': '미국 주별 구인·이직', 'Usual Weekly Earnings of Wage and Salary Workers': '미국 임금근로자 주간 소득',
  'Union Membership (Annual)': '미국 노동조합 가입 현황 (연간)',
}
const unescapeIcs = text => text.replace(/\\[nN]/g, ' ').replace(/\\([,;\\])/g, '$1').trim()
function validDate(y, m, d) { const value = new Date(Date.UTC(y, m - 1, d)); return value.getUTCFullYear() === y && value.getUTCMonth() === m - 1 && value.getUTCDate() === d }
function parseStart(key, value) {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value)
  if (!match) return null
  const [, yr, mo, dt, hr, mi, se, utc] = match, [y, m, d, h, minute, s] = [yr, mo, dt, hr, mi, se].map(Number)
  if (!validDate(y, m, d) || h > 23 || minute > 59 || s > 59) return null
  const wall = Date.UTC(y, m - 1, d, h, minute, s)
  if (utc && key === 'DTSTART') return wall
  if (utc || !/^DTSTART;TZID=(?:US-Eastern|US\/Eastern|America\/New_York)$/.test(key)) return null
  // Try both offsets and require exactly one match (reject DST gaps/ambiguity).
  const candidates = [4, 5].map(offset => wall + offset * 3_600_000).filter(at => {
    const p = parts(at)
    return p.year === y && p.month === m && p.day === d && p.hour === h && p.minute === minute && p.second === s
  })
  return candidates.length === 1 ? candidates[0] : null
}

export function parseBlsCalendar(text) {
  if (text.length > 1_000_000 || !text.includes('BEGIN:VCALENDAR')) throw new Error('invalid_calendar')
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const records = new Map()
  for (const match of unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)\r?\nEND:VEVENT/g)) {
    const fields = new Map(), lines = match[1].split(/\r?\n/)
    let nested = false
    for (const line of lines) {
      if (line.startsWith('BEGIN:')) { nested = true; continue }
      if (line.startsWith('END:')) { nested = false; continue }
      const colon = line.indexOf(':')
      if (!nested && colon > 0) fields.set(line.slice(0, colon), line.slice(colon + 1))
    }
    const uid = fields.get('UID'), summary = unescapeIcs(fields.get('SUMMARY') ?? '')
    const sequence = Number(fields.get('SEQUENCE') ?? 0)
    if (!uid || uid.length > 200 || !Number.isSafeInteger(sequence) || sequence < 0) continue
    const start = [...fields].find(([key]) => key === 'DTSTART' || key.startsWith('DTSTART;'))
    const at = start ? parseStart(...start) : null
    const record = { sequence, event: fields.get('STATUS') === 'CANCELLED' || at === null || !summary || summary.length > 300 || fields.has('RRULE') || fields.has('RECURRENCE-ID') ? null : {
      id: `bls:${uid}`, source: 'bls', title: titles[summary] ?? summary, originalTitle: summary, at, date: null, endDate: null, timeZone: 'America/New_York', kind: 'release',
    } }
    if (!records.has(uid) || records.get(uid).sequence <= sequence) records.set(uid, record)
  }
  return [...records.values()].flatMap(record => record.event ? [record.event] : [])
}

export function parseFomcCalendar(html) {
  if (html.length > 1_000_000) throw new Error('invalid_calendar')
  const headings = [...html.matchAll(/<h4[^>]*>\s*(?:<a[^>]*>)?\s*(20\d{2}) FOMC Meetings\s*(?:<\/a>)?\s*<\/h4>/gi)]
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const events = new Map()
  for (let i = 0; i < headings.length; i++) {
    const year = Number(headings[i][1]), section = html.slice(headings[i].index, headings[i + 1]?.index ?? html.length)
    for (const match of section.matchAll(/<div[^>]*class="[^"]*fomc-meeting__month[^\"]*"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="[^"]*fomc-meeting__date[^\"]*"[^>]*>([\s\S]*?)<\/div>/g)) {
      const month = months.indexOf(match[1].replace(/<[^>]*>/g, '').trim()) + 1
      const dates = /^(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\*?$/.exec(match[2].replace(/<[^>]*>/g, '').trim())
      if (!month || !dates) continue
      const first = Number(dates[1]), last = Number(dates[2] ?? dates[1])
      if (last < first || !validDate(year, month, first) || !validDate(year, month, last)) continue
      const date = `${year}-${String(month).padStart(2, '0')}-${String(first).padStart(2, '0')}`, endDate = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
      events.set(date, { id: `fed:${date}`, source: 'fed', title: '미국 FOMC 회의', originalTitle: 'FOMC meeting', at: null, date, endDate, timeZone: 'America/New_York', kind: 'meeting' })
    }
  }
  return [...events.values()]
}

async function boundedText(response) {
  if (!response.body?.getReader) { const text = await response.text(); if (text.length > 1_000_000) throw new Error('too_large'); return text }
  const reader = response.body.getReader(), decoder = new TextDecoder()
  let text = '', size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > 1_000_000) throw new Error('too_large')
      text += decoder.decode(value, { stream: true })
    }
    return text + decoder.decode()
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
}

export function createEconomicCalendar({ fetchImpl = fetch, now = Date.now } = {}) {
  const cache = new Map(), pending = new Map(), attempted = new Map(), shutdown = new AbortController()
  async function load(source) {
    const previous = cache.get(source.id)
    if (attempted.has(source.id) && now() - attempted.get(source.id) < (previous?.ok ? 3_600_000 : 60_000)) return
    if (pending.has(source.id)) return pending.get(source.id)
    const work = (async () => {
      try {
        const response = await fetchImpl(source.url, { redirect: 'error', signal: AbortSignal.any([shutdown.signal, AbortSignal.timeout(10_000)]), headers: { Accept: source.id === 'bls' ? 'text/calendar' : 'text/html' } })
        if (!response.ok) throw new Error('source_unavailable')
        const text = await boundedText(response), events = source.id === 'bls' ? parseBlsCalendar(text) : parseFomcCalendar(text)
        if (!events.length) throw new Error('schedule_not_found')
        cache.set(source.id, { events, fetchedAt: now(), ok: true })
      } catch { cache.set(source.id, { ...previous, ok: false }) }
      finally { attempted.set(source.id, now()) }
    })().finally(() => pending.delete(source.id))
    pending.set(source.id, work)
    return work
  }
  return {
    async snapshot() {
      await Promise.all(calendarSources.map(load))
      const at = now(), windowStart = at - day, windowEnd = at + 90 * day, events = [], sources = []
      for (const source of calendarSources) {
        const result = cache.get(source.id), usable = result?.fetchedAt !== undefined && at - result.fetchedAt <= day
        const rows = usable ? result.events.filter(event => {
          const end = event.at ?? Date.parse(`${event.endDate}T23:59:59-05:00`)
          const start = event.at ?? Date.parse(`${event.date}T00:00:00-04:00`)
          return end >= windowStart && start <= windowEnd
        }) : []
        sources.push({ ...source, status: !usable ? 'unavailable' : result.ok ? 'available' : 'stale', fetchedAt: result?.fetchedAt ?? null, eventCount: rows.length })
        events.push(...rows)
      }
      events.sort((a, b) => (a.at ?? Date.parse(a.date)) - (b.at ?? Date.parse(b.date)))
      return { version: 1, fetchedAt: at, windowStart, windowEnd, sources, events: events.slice(0, 300) }
    },
    close() { shutdown.abort() },
  }
}
