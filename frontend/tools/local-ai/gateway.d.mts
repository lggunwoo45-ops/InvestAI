import type { IncomingMessage, ServerResponse } from 'node:http'
export function createLocalAiGateway(options?: { env?: NodeJS.ProcessEnv }): (req: IncomingMessage, res: ServerResponse, next: () => void) => void
