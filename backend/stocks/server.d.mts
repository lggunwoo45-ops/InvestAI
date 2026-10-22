import type { IncomingMessage, ServerResponse } from 'node:http'
export function createStockHandler(options?: { origins?: string[]; local?: boolean; publicEnabled?: boolean }): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>
