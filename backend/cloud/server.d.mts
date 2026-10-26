import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DerivativeContextReader } from '../research/server.mjs'
export function createCloudHandler(options?: { derivativeContextReader?: DerivativeContextReader | null; directory?: string; origins?: string[] }): ((req: IncomingMessage,res: ServerResponse,next?:()=>void)=>Promise<void>) & { close():Promise<void> }
