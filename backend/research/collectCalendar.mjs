import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { parseStart } from './economicCalendar.mjs'
import { boundedCalendarText } from './calendarIO.mjs'
import { majorBlsReleases, nyFedCalendarUrl, validateCalendarSnapshot } from './calendarSnapshot.mjs'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const aliases = { 'Consumer Price Index': 'cpi', 'Employment Situation': 'jobs', 'Producer Price Index (PPI)': 'ppi', 'Producer Price Index': 'ppi', 'JOLTS': 'jolts', 'Employment Cost Index': 'eci', 'Productivity & Costs (Preliminary)': 'productivity', 'Productivity & Costs (Revised)': 'productivity', 'Productivity & Costs': 'productivity', 'Imports and Exports': 'tradePrices' }
const plain = text => text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
const monthStart = (year, month) => {
  const date = new Date(Date.UTC(year, month - 1, 1))
  return parseStart('DTSTART;TZID=America/New_York', `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}01T000000`)
}
export function parseNyFedCalendar(html, year, month) {
  if (html.length > 1_000_000 || !html.includes('all Eastern Time') || !new RegExp(`>\\s*${months[month - 1]} ${year}\\s*<`).test(html)) throw new Error('invalid_calendar_month')
  const rows = new Map()
  for (const cell of html.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)) {
    const date = /^\s*<div[^>]*>\s*(\d{1,2})\s*<br\s*\/?>/i.exec(cell[1])
    if (!date) continue
    for (const link of cell[1].matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>((?:(?!<a\b)[\s\S])*?)(?=<a\b|$)/gi)) {
      const releaseKey = aliases[plain(link[2])]
      if (!releaseKey) continue
      let url
      try { url = new URL(link[1]) } catch { continue }
      // Only the seven BLS series. No third-party reports or inferred publication times.
      if (url.protocol !== 'https:' || !['www.bls.gov', 'bls.gov'].includes(url.hostname) || url.username || url.password) continue
      const times = [...plain(link[3]).matchAll(/\((\d{2}):(\d{2})\)/g)]
      if (times.length !== 1) throw new Error('invalid_release_time')
      const at = parseStart('DTSTART;TZID=America/New_York', `${year}${String(month).padStart(2, '0')}${date[1].padStart(2, '0')}T${times[0][1]}${times[0][2]}00`)
      if (at === null) throw new Error('invalid_release_time')
      const [originalTitle, title] = majorBlsReleases[releaseKey], id = `bls:nyfed:${releaseKey}:${at}`
      rows.set(id, { id, releaseKey, source: 'bls', title, originalTitle, at, date: null, endDate: null, timeZone: 'America/New_York', kind: 'release' })
    }
  }
  if (!rows.size) throw new Error('calendar_releases_missing')
  return [...rows.values()]
}
export async function collectCalendar({ fetchImpl = fetch, now = Date.now } = {}) {
  const collectedAt = now(), eastern = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit' }).formatToParts(collectedAt)
  const year = Number(eastern.find(p => p.type === 'year').value), month = Number(eastern.find(p => p.type === 'month').value)
  const events = [], coverageStart = monthStart(year, month)
  let coverageEnd = coverageStart
  for (let offset = 0; offset < 4; offset++) {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1)), y = date.getUTCFullYear(), m = date.getUTCMonth() + 1
    const url = `https://www.newyorkfed.org/research/calendars/i-${months[m - 1].slice(0, 3).toLowerCase()}${String(y).slice(-2)}.html`
    const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: { Accept: 'text/html' } })
    const unpublished = response.status === 404 || (response.status === 302 && response.headers.get('location') === '/errors/404')
    if (unpublished && offset > 0) break // NY Fed sends unpublished months to its fixed 404 page; do not follow redirects.
    if (!response.ok) throw new Error(`official_calendar_http_${response.status}`)
    events.push(...parseNyFedCalendar(await boundedCalendarText(response), y, m))
    coverageEnd = monthStart(y, m + 1) - 1
  }
  return validateCalendarSnapshot({ version: 1, provider: 'nyfed', sourceUrl: nyFedCalendarUrl, collectedAt, coverageStart, coverageEnd, events: events.filter(e => e.at >= collectedAt - 86_400_000 && e.at <= collectedAt + 90 * 86_400_000).sort((a, b) => a.at - b.at) }, collectedAt)
}

export async function publishCalendar(snapshot, { token, fetchImpl = fetch, now = Date.now } = {}) {
  validateCalendarSnapshot(snapshot, now())
  if (typeof token !== 'string' || !token) throw new Error('publish_token_missing')
  const base = 'https://api.github.com/repos/lggunwoo45-ops/InvestAI'
  async function api(path, method = 'GET', body, allowMissing = false) {
    const response = await fetchImpl(`${base}${path}`, { method, redirect: 'error', signal: AbortSignal.timeout(15_000), headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    if (allowMissing && response.status === 404) return null
    if (!response.ok) throw new Error(`calendar_publish_http_${response.status}`)
    return response.json()
  }
  const repo = await api('')
  if (repo.private !== false) throw new Error('public_repository_required')
  const ref = await api('/git/ref/heads/calendar-data', 'GET', undefined, true)
  const blob = await api('/git/blobs', 'POST', { content: JSON.stringify(snapshot), encoding: 'utf-8' })
  const tree = await api('/git/trees', 'POST', { tree: [{ path: 'bls.json', mode: '100644', type: 'blob', sha: blob.sha }] })
  const commit = await api('/git/commits', 'POST', { message: 'Refresh official BLS release calendar via New York Fed', tree: tree.sha, parents: ref ? [ref.object.sha] : [] })
  if (ref) await api('/git/refs/heads/calendar-data', 'PATCH', { sha: commit.sha, force: false })
  else await api('/git/refs', 'POST', { ref: 'refs/heads/calendar-data', sha: commit.sha })
  return commit.sha
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const snapshot = await collectCalendar()
    const published = process.argv.includes('--publish') ? await publishCalendar(snapshot, { token: process.env.GH_TOKEN }) : null
    console.log(JSON.stringify({ source: 'New York Fed / BLS releases', events: snapshot.events.length, collectedAt: snapshot.collectedAt, coverageEnd: snapshot.coverageEnd, published }))
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
