import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Pages has no SPA rewrite server. Give every entry route a real index file.
export async function preparePages(directory) {
  const html = await readFile(join(directory, 'index.html'), 'utf8')
  if (!html.includes('/InvestAI/assets/')) throw new Error('Build with --base=/InvestAI/ before packaging Pages')
  for (const route of ['market', 'research', 'dashboard', 'briefing', 'markets', 'simple', 'discover', 'demo', 'portfolio', 'trading', 'ai-analysis', 'my-analysis', 'strategies', 'news', 'settings']) {
    await mkdir(join(directory, route), { recursive: true })
    await writeFile(join(directory, route, 'index.html'), html)
  }
  await writeFile(join(directory, '404.html'), html)
  await writeFile(join(directory, '.nojekyll'), '')
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await preparePages(resolve(process.argv[2] ?? 'dist'))
