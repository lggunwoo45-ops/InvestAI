import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DerivativeContextReader } from '../research/server.mjs'
export function createMonitorHandler(options?: { derivativeContextReader?: DerivativeContextReader | null; directory?: string }): ((req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>) & { close(): Promise<void> }
