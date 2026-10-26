import { test } from 'node:test'
import assert from 'node:assert/strict'
import { collectCalendar, parseNyFedCalendar, publishCalendar } from './collectCalendar.mjs'
import { createEconomicCalendar } from './economicCalendar.mjs'
import { createSavedCalendarReader, nyFedCalendarUrl, savedCalendarUrl, validateCalendarSnapshot } from './calendarSnapshot.mjs'

const at = Date.parse('2026-10-26T00:00:00Z')
const release = (title = 'Consumer Price Index', time = '08:30', host = 'www.bls.gov') => `<a href="https://${host}/news.release/cpi.toc.htm">${title}</a><br />(${time})<br />`
const month = (name = 'October', date = '30', rows = release()) => `all Eastern Time<div>${name} 2026</div><table><td><div>${date}<br /><span>${rows}</span></div></td></table>`
const snapshot = () => ({ version: 1, provider: 'nyfed', sourceUrl: nyFedCalendarUrl, collectedAt: at, coverageStart: Date.parse('2026-10-01T04:00:00Z'), coverageEnd: Date.parse('2026-12-01T05:00:00Z') - 1, events: parseNyFedCalendar(month(), 2026, 10) })
const fed = '<h4>2026 FOMC Meetings</h4><div class="fomc-meeting__month">October</div><div class="fomc-meeting__date">27-28</div>'

test('official monthly HTML preserves BLS release times across DST, ignoring unrelated reports and hosts', () => {
  const oct = parseNyFedCalendar(month('October', '30', release() + release('GDP') + release('Employment Situation', '08:30', 'example.com') + release('JOLTS', '10:00')), 2026, 10)
  assert.equal(oct.length, 2)
  assert.equal(oct[0].at, Date.parse('2026-10-30T12:30:00Z'))
  assert.equal(oct[1].at, Date.parse('2026-10-30T14:00:00Z'))
  const nov = parseNyFedCalendar(month('November', '06', release('Employment Situation')), 2026, 11)
  assert.equal(nov[0].at, Date.parse('2026-11-06T13:30:00Z'))
  assert.throws(() => parseNyFedCalendar(month('November', '01', release('JOLTS', '01:30')), 2026, 11), /invalid_release_time/)
  assert.throws(() => parseNyFedCalendar(month('November'), 2026, 10), /invalid_calendar_month/)
  assert.throws(() => parseNyFedCalendar(month('October', '30', release().replace('(08:30)', 'TBA')), 2026, 10), /invalid_release_time/)
})
test('collection stops at the official unpublished-month response and reports exact Eastern coverage', async () => {
  const urls = []
  const result = await collectCalendar({ now: () => at, fetchImpl: async (url, options) => {
    urls.push(url); assert.equal(options.redirect, 'manual')
    return url.includes('oct26') ? new Response(month()) : url.includes('nov26') ? new Response(month('November', '06', release('Employment Situation'))) : new Response(null, { status: 302, headers: { location: '/errors/404' } })
  } })
  assert.equal(urls.length, 3); assert.equal(result.events.length, 2)
  assert.equal(result.coverageEnd, Date.parse('2026-12-01T05:00:00Z') - 1)
  assert.equal(result.collectedAt, at)
  await assert.rejects(collectCalendar({ now: () => at, fetchImpl: async () => new Response(null, { status: 302, headers: { location: 'https://elsewhere.test' } }) }), /official_calendar_http_302/)
  await assert.rejects(collectCalendar({ now: () => at, fetchImpl: async () => new Response('blocked', { status: 403 }) }), /official_calendar_http_403/)
})
test('saved snapshots reject expired, future, mismatched and duplicate records', () => {
  assert.equal(validateCalendarSnapshot(snapshot(), at).events.length, 1)
  assert.throws(() => validateCalendarSnapshot(snapshot(), at + 86_400_001), /invalid_saved_calendar/)
  for (const change of [s => { s.collectedAt += 300_001 }, s => { s.sourceUrl = 'https://other.test' }, s => { s.events.push(s.events[0]) }, s => { s.events[0].title = 'invented' }, s => { s.events[0].at = s.coverageEnd + 1 }, s => { s.events[0].releaseKey = 'constructor' }]) {
    const value = snapshot(); change(value)
    assert.throws(() => validateCalendarSnapshot(value, at), /invalid_saved_calendar/)
  }
})
test('saved reader uses only the public fixed address and rejects large or invalid bodies', async () => {
  const reader = createSavedCalendarReader({ now: () => at, fetchImpl: async (url, options) => {
    assert.equal(url, savedCalendarUrl); assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, undefined)
    return new Response(JSON.stringify(snapshot()))
  } })
  assert.equal((await reader()).collectedAt, at)
  await assert.rejects(createSavedCalendarReader({ fetchImpl: async () => new Response('x'.repeat(100_001)) })(), /too_large/)
})
test('BLS 403 falls back independently, keeping collection time and expiring the snapshot', async () => {
  let clock = at, reads = 0
  const calendar = createEconomicCalendar({ now: () => clock, onIssue: () => {}, readSavedCalendar: async () => { reads++; return snapshot() }, fetchImpl: async url => url.endsWith('.ics') ? new Response('blocked', { status: 403 }) : new Response(fed) })
  const [first, second] = await Promise.all([calendar.snapshot(), calendar.snapshot()])
  assert.equal(reads, 1); assert.deepEqual(first, second)
  assert.equal(first.sources[0].via, 'nyfed'); assert.equal(first.sources[0].status, 'available')
  clock += 13 * 3_600_000
  const old = await calendar.snapshot()
  assert.equal(old.sources[0].status, 'stale'); assert.equal(old.sources[0].fetchedAt, at)
  assert.equal(old.sources[1].status, 'available')
  clock += 12 * 3_600_000
  const expired = await calendar.snapshot()
  assert.equal(expired.sources[0].status, 'unavailable'); assert.ok(expired.events.every(e => e.source === 'fed'))
  calendar.close()
})
test('a failed collection cannot erase or replace a newer cached schedule', async () => {
  let clock = at, saved = snapshot()
  const calendar = createEconomicCalendar({ now: () => clock, onIssue: () => {}, readSavedCalendar: async () => saved, fetchImpl: async url => url.endsWith('.ics') ? new Response('blocked', { status: 403 }) : new Response(fed) })
  await calendar.snapshot()
  clock += 3_600_001; saved = { ...snapshot(), collectedAt: at - 1 }
  const older = await calendar.snapshot()
  assert.equal(older.sources[0].fetchedAt, at); assert.equal(older.sources[0].status, 'stale')
  clock += 60_001; saved = { ...snapshot(), events: [] }
  assert.equal((await calendar.snapshot()).sources[0].eventCount, 1)
  calendar.close()
})
test('publisher writes only a validated public calendar branch with a non-forced update', async () => {
  const calls = []
  const sha = await publishCalendar(snapshot(), { token: 'test-token', now: () => at, fetchImpl: async (url, options) => {
    calls.push({ url, ...options, body: options.body ? JSON.parse(options.body) : undefined })
    const body = url.endsWith('/InvestAI') ? { private: false } : url.endsWith('/git/ref/heads/calendar-data') ? { object: { sha: 'parent' } } : { sha: 'new' }
    return Response.json(body)
  } })
  assert.equal(sha, 'new')
  assert.ok(calls.every(c => c.url.startsWith('https://api.github.com/repos/lggunwoo45-ops/InvestAI')))
  assert.deepEqual(calls.find(c => c.url.endsWith('/git/trees')).body.tree, [{ path: 'bls.json', mode: '100644', type: 'blob', sha: 'new' }])
  assert.deepEqual(calls.find(c => c.url.endsWith('/git/commits')).body.parents, ['parent'])
  assert.deepEqual(calls.at(-1).body, { sha: 'new', force: false })
  let attempts = 0
  const privateRepo = async () => { attempts++; return Response.json({ private: true }) }
  await assert.rejects(publishCalendar(snapshot(), { token: 'test-token', now: () => at, fetchImpl: privateRepo }), /public_repository_required/)
  assert.equal(attempts, 1)
  await assert.rejects(publishCalendar({ ...snapshot(), events: [] }, { token: 'test-token', now: () => at, fetchImpl: privateRepo }), /invalid_saved_calendar/)
  assert.equal(attempts, 1)
})
test('initial publication creates an orphan data branch; a denied update is not forced or retried', async () => {
  const calls = []
  await publishCalendar(snapshot(), { token: 'test-token', now: () => at, fetchImpl: async (url, options) => {
    calls.push({ url, body: options.body ? JSON.parse(options.body) : undefined })
    return url.endsWith('/git/ref/heads/calendar-data') ? new Response(null, { status: 404 }) : Response.json(url.endsWith('/InvestAI') ? { private: false } : { sha: 'new' })
  } })
  assert.deepEqual(calls.find(c => c.url.endsWith('/git/commits')).body.parents, [])
  assert.deepEqual(calls.at(-1).body, { ref: 'refs/heads/calendar-data', sha: 'new' })
  await assert.rejects(publishCalendar(snapshot(), { token: 'test-token', now: () => at, fetchImpl: async url => url.endsWith('/InvestAI') ? Response.json({ private: false }) : new Response(null, { status: 403 }) }), /calendar_publish_http_403/)
})
