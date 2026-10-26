import { test } from 'node:test'
import assert from 'node:assert/strict'
import { calendarSources, createEconomicCalendar, parseBlsCalendar, parseFomcCalendar } from './economicCalendar.mjs'

const event = (uid, start, extra = '', title = 'Consumer Price Index') => `BEGIN:VEVENT\nUID:${uid}\nDTSTART;TZID=US-Eastern:${start}\nSUMMARY:${title}\n${extra}\nEND:VEVENT`
const ics = (...events) => `BEGIN:VCALENDAR\n${events.join('\n')}\nEND:VCALENDAR`
const meeting = (month, dates) => `<div class="row fomc-meeting" "><div class="fomc-meeting__month col-xs-5"><strong>${month}</strong></div><div class="fomc-meeting--shaded fomc-meeting__date col-xs-4">${dates}</div></div>`
const fed = `<h4><a id="example">2026 FOMC Meetings</a></h4>${meeting('October', '27-28')}${meeting('December', '8-9*')}<h4><a>2027 FOMC Meetings</a></h4>${meeting('January', '26-27')}`

test('BLS converts Eastern DST and standard time, unfolds text and ignores nested alarms', () => {
  const rows = parseBlsCalendar(ics(event('summer', '20261030T083000', 'BEGIN:VALARM\nSUMMARY:wrong\nEND:VALARM'), event('winter', '20261106T083000', '', 'Employment Situa\n tion'), event('utc', '20261106T083000').replace('DTSTART;TZID=US-Eastern:20261106T083000', 'DTSTART:20261106T133000Z')))
  assert.equal(rows[0].at, Date.parse('2026-10-30T12:30:00Z')); assert.equal(rows[0].title, '미국 소비자물가지수 (CPI)')
  assert.equal(rows[1].at, Date.parse('2026-11-06T13:30:00Z')); assert.equal(rows[1].originalTitle, 'Employment Situation')
  assert.equal(rows[2].at, rows[1].at)
})
test('BLS cancellation/revisions win; invalid/ambiguous/unsupported timestamps are omitted', () => {
  const rows = parseBlsCalendar(ics(event('cancel', '20261101T100000', 'SEQUENCE:1'), event('cancel', '20261101T100000', 'SEQUENCE:2\nSTATUS:CANCELLED'), event('cancel', '20261101T100000', 'SEQUENCE:0'), event('gap', '20260308T023000'), event('ambiguous', '20261101T013000'), event('invalid', '20260230T100000'), event('tz', '20261101T100000').replace('US-Eastern', 'Pacific'), event('repeat', '20261101T100000', 'RRULE:FREQ=DAILY')))
  assert.deepEqual(rows, [])
})
test('FOMC preserves meeting date ranges without inventing announcement times; ignores unparseable ranges', () => {
  const rows = parseFomcCalendar(fed + meeting('February', '30-31') + meeting('April/May', '30-1'))
  assert.equal(rows.length, 3); assert.equal(rows[0].date, '2026-10-27'); assert.equal(rows[0].endDate, '2026-10-28')
  assert.equal(rows[0].at, null); assert.equal(rows[2].date, '2027-01-26')
})
test('sources cache and coalesce independently, retain visibly stale data then expire after 24 hours', async () => {
  let at = Date.parse('2026-10-26T00:00:00Z'), calls = 0, fail = false
  const calendar = createEconomicCalendar({ now: () => at, fetchImpl: async (url, options) => {
    calls++; assert.ok(calendarSources.some(s => s.url === url)); assert.equal(options.redirect, 'error')
    if (fail && url.endsWith('.ics')) throw new Error('offline')
    return new Response(url.endsWith('.ics') ? ics(event('cpi', '20261110T083000')) : fed)
  } })
  const [first, same] = await Promise.all([calendar.snapshot(), calendar.snapshot()])
  assert.equal(calls, 2); assert.equal(first.events.length, 3); assert.deepEqual(first, same)
  await calendar.snapshot(); assert.equal(calls, 2)
  at += 3_600_001; fail = true
  const stale = await calendar.snapshot(); assert.equal(stale.sources[0].status, 'stale'); assert.equal(stale.sources[1].status, 'available'); assert.equal(stale.sources[0].fetchedAt, first.sources[0].fetchedAt)
  await calendar.snapshot(); assert.equal(calls, 4)
  at += 24 * 3_600_000
  const expired = await calendar.snapshot(); assert.equal(expired.sources[0].status, 'unavailable'); assert.ok(expired.events.every(e => e.source === 'fed'))
  calendar.close()
})
test('invalid provider content fails closed and failed sources retry no more than once a minute', async () => {
  let calls = 0
  const calendar = createEconomicCalendar({ fetchImpl: async () => { calls++; return new Response('BLOCKED') } })
  const result = await calendar.snapshot(); assert.equal(result.events.length, 0); assert.ok(result.sources.every(s => s.status === 'unavailable'))
  await calendar.snapshot(); assert.equal(calls, 2); calendar.close()
})
