import type { IncomingMessage, ServerResponse } from 'node:http'
export function createMonitorHandler(options?: { directory?: string }): ((req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>) & { close(): Promise<void> }
