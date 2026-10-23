import type { IncomingMessage, ServerResponse } from 'node:http'
export function createResearchHandler(options?: { origins?: string[]; local?: boolean }): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>
