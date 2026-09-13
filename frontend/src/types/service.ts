export type ServiceHealth = 'online' | 'degraded' | 'offline' | 'unconfigured'

export interface ServiceStatus {
  label: string
  health: ServiceHealth
}
