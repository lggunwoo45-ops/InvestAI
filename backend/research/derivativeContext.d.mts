export interface DerivativeFilters { funding?: 'any' | 'positive' | 'negative'; openInterest?: 'any' | 'rising' | 'falling' }
export interface KnownDerivative { at: number; knownAt: number; value: number }
export interface KnownOpenInterest extends KnownDerivative { change24h: number; previousAt: number; previousKnownAt: number; previousValue: number }
export interface DerivativeContextPoint { at: number; funding: KnownDerivative | null; openInterest: KnownOpenInterest | null }
export declare const DERIVATIVE_FILTER_VERSION: 'investai-derivatives-asof-1'
export declare function hasDerivativeFilters(config: DerivativeFilters): boolean
export declare function validDerivativeFilters(config: DerivativeFilters): boolean
export declare function derivativeMatch(config: DerivativeFilters, context: DerivativeContextPoint | undefined, decisionAt: number): 'match' | 'miss' | 'unknown'
export declare function buildDerivativeContext(observations: (KnownDerivative & { metric: 'funding' | 'openInterest' })[], from: number, to: number, step: number): DerivativeContextPoint[]
