import type { IncomingMessage, ServerResponse } from 'node:http'
export function createMarketHandler(options?: { origins?: string[]; local?: boolean }): ((req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>) & { close(): void }
