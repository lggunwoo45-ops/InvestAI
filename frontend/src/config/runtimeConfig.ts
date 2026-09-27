export interface RuntimeConfig {
  appEnv: string
  newsProxyUrl: string
  dartProxyUrl: string
  isProductionLike: boolean
  isLocal: boolean
}

export interface RuntimeConfigEnvironment {
  VITE_APP_ENV?: string
  VITE_NEWS_PROXY_URL?: string
  VITE_DART_PROXY_URL?: string
}

const defaults = {
  appEnv: 'local',
  newsProxyUrl: 'http://localhost:8787',
  dartProxyUrl: 'http://localhost:8788',
} as const

function clean(value: string | undefined, fallback: string): string {
  const normalized = value?.trim()
  return normalized ? normalized.replace(/\/$/, '') : fallback
}

/** Only public, build-time values belong here. Secrets must remain in server processes. */
export function createRuntimeConfig(environment: RuntimeConfigEnvironment = {
  VITE_APP_ENV: import.meta.env.VITE_APP_ENV,
  VITE_NEWS_PROXY_URL: import.meta.env.VITE_NEWS_PROXY_URL,
  VITE_DART_PROXY_URL: import.meta.env.VITE_DART_PROXY_URL,
}): RuntimeConfig {
  const appEnv = clean(environment.VITE_APP_ENV, defaults.appEnv).toLowerCase()
  return {
    appEnv,
    newsProxyUrl: clean(environment.VITE_NEWS_PROXY_URL, defaults.newsProxyUrl),
    dartProxyUrl: clean(environment.VITE_DART_PROXY_URL, defaults.dartProxyUrl),
    isProductionLike: ['production', 'preview', 'staging'].includes(appEnv),
    isLocal: appEnv === 'local',
  }
}

export const runtimeConfig = createRuntimeConfig()
