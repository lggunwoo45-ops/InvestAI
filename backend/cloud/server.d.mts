import type { IncomingMessage, ServerResponse } from 'node:http'
export function createCloudHandler(options?: { directory?: string; origins?: string[] }): ((req: IncomingMessage,res: ServerResponse,next?:()=>void)=>Promise<void>) & { close():Promise<void> }
