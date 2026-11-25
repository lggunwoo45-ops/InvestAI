import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const cloudflareOrigin = 'https://marketcopilotapp.pages.dev'
const sourceRoot = fileURLToPath(new URL('../site-root/', import.meta.url))
const previousOrigin = 'https://lggunwoo45-ops.github.io'
const verification = '<meta name="bitmedia-site-verification" content="373a5514075b2ef3f0b1775e289ec6b1">'

async function documents(directory, prefix = '') {
  const paths = []
  for (const item of await readdir(directory, { withFileTypes:true })) {
    const path = join(prefix, item.name)
    if (item.isDirectory()) paths.push(...await documents(join(directory, item.name), path))
    else if (item.name.endsWith('.html')) paths.push(path)
  }
  return paths
}

/** Add readable public documents alongside the existing SPA, without replacing its root. */
export async function prepareCloudflarePages(directory) {
  const appHtml = await readFile(join(directory, 'index.html'), 'utf8')
  if (!appHtml.includes('src="/assets/') || !appHtml.includes('id="root"')) throw new Error('Build the app with --base=/ before packaging Cloudflare Pages')
  const files = await documents(sourceRoot)
  for (const path of files) {
    let html = (await readFile(join(sourceRoot, path), 'utf8')).replaceAll(previousOrigin, cloudflareOrigin).replaceAll('/InvestAI/', '/')
    const isLanding = path === 'index.html'
    if (isLanding) html = html.replace(`rel="canonical" href="${cloudflareOrigin}/"`, `rel="canonical" href="${cloudflareOrigin}/start/"`)
    if (!html.includes('name="bitmedia-site-verification"')) html = html.replace('</head>', `${verification}</head>`)
    const target = join(directory, isLanding ? 'start/index.html' : path)
    await mkdir(dirname(target), { recursive:true })
    await writeFile(target, html)
  }
  const sitemap = (await readFile(join(sourceRoot, 'sitemap.xml'), 'utf8'))
    .replaceAll(previousOrigin, cloudflareOrigin).replace(`<loc>${cloudflareOrigin}/</loc>`, `<loc>${cloudflareOrigin}/start/</loc>`)
  await writeFile(join(directory, 'sitemap.xml'), sitemap)
  await writeFile(join(directory, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${cloudflareOrigin}/sitemap.xml\n`)
  return { documents:files.length, appRootPreserved:true }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(await prepareCloudflarePages(resolve(process.argv[2] ?? 'dist-cloudflare')))
}
