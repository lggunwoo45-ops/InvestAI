import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DerivativeContextPoint } from './derivativeContext.mjs'
export type DerivativeContextReader = (asset: string, timeframe: string, from: number, to: number) => { method: string; asset: string; timeframe: string; from: number; to: number; points: DerivativeContextPoint[] }
export function createResearchHandler(options?: { origins?: string[]; local?: boolean }): ((req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>) & { derivativeContextReader: DerivativeContextReader | null; close(): void | Promise<void> }
