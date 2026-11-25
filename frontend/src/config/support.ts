export const supportEmail = 'info.marketcop@gmail.com'
export const supportMailto = `mailto:${supportEmail}`
export function serviceOriginForHost(hostname: string) {
  return hostname === 'marketcopilotapp.pages.dev' || hostname.endsWith('.marketcopilotapp.pages.dev')
    ? 'https://marketcopilotapp.pages.dev' : 'https://lggunwoo45-ops.github.io'
}
export const publicServiceOrigin = serviceOriginForHost(typeof window === 'undefined' ? '' : window.location.hostname)
