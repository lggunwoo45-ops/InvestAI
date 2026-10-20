import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sources } from './news.mjs'
import { verifyNews } from './verify-news.mjs'
const at = new Date().toISOString(), origin = 'https://example.test'
const feed = { version: 1, source: 'public-rss', fallbackUsed: false, status: 'ready', checkedAt: at,
  sources: sources.map(source => ({ id: source.id, state: 'ready', fetchedAt: at, count: 1 })),
  articles: sources.map(source => ({ source: source.label, title: 'A source headline', summary: '', isMock: false, sentiment: 'unassessed', importance: 'unassessed', url: `https://${source.host}/story`, publishedAt: at })) }
const response = (data = feed, allowed = origin) => new Response(JSON.stringify(data), { headers: { 'access-control-allow-origin': allowed } })
test('deployment verification requires both real sources and browser CORS', async () => {
  assert.equal((await verifyNews({ base: 'https://news.test', origin, fetchImpl: async () => response() })).articles, 2)
  for (const data of [{ ...feed, fallbackUsed: true }, { ...feed, status: 'partial' }, { ...feed, articles: [] }]) {
    await assert.rejects(verifyNews({ base: 'https://news.test', origin, fetchImpl: async () => response(data) }))
  }
  await assert.rejects(verifyNews({ base: 'https://news.test', origin, fetchImpl: async () => response(feed, 'https://other.test') }))
})
test('deployment verification rejects unsafe server addresses before a request', async () => {
  for (const base of ['http://external.test', 'https://secret@news.test', 'https://news.test?url=external', 'https://news.test/api']) {
    await assert.rejects(verifyNews({ base, origin, fetchImpl: async () => { throw new Error('must not request') } }), /HTTPS/)
  }
})
