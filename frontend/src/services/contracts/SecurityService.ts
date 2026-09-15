export interface OperatorSession {
  operatorId: string
  permissions: readonly string[]
  expiresAt: string
}

export interface SecurityService {
  getSession(): Promise<OperatorSession | null>
  can(permission: string): Promise<boolean>
  /** Security-sensitive actions must be auditable outside the browser runtime. */
  recordAuditEvent(event: string, metadata: Readonly<Record<string, string>>): Promise<void>
}
