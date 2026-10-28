import type { DerivativeFilters, DerivativeContextPoint } from './derivativeContext.mjs';
export { derivativeMatch, hasDerivativeFilters, DERIVATIVE_FILTER_VERSION } from './derivativeContext.mjs';
export type { DerivativeContextPoint } from './derivativeContext.mjs';
export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}
export declare const timeframes: {
    readonly '1m': 60000;
    readonly '3m': 180000;
    readonly '5m': 300000;
    readonly '10m': 600000;
    readonly '15m': 900000;
    readonly '30m': 1800000;
    readonly '1h': 3600000;
    readonly '4h': 14400000;
    readonly '1d': 86400000;
};
export type ResearchTimeframe = keyof typeof timeframes;
export type SignalFamily = 'momentum' | 'trend' | 'volatility' | 'candle';
export interface ExplorerSignal {
    id: string;
    name: string;
    side: 'long' | 'short';
    family: SignalFamily;
    description: string;
    rule: string;
    limit: string;
}
export declare const explorerSignals: ExplorerSignal[];
export declare const ENGINE_VERSION = "investai-signals-1";
export interface SignalFrame {
    at: number;
    signals: string[];
    rsi: number | null;
    ema50: number;
    volumeRatio: number | null;
    ready: boolean;
}
/** Sequential, closed-bar-only features. Gaps reset indicator seeds and warm-up. */
export declare function signalFrames(candles: readonly Candle[], timeframe: ResearchTimeframe): SignalFrame[];
export interface ExplorerConfig extends DerivativeFilters {
    timeframe: ResearchTimeframe;
    signals: string[];
    window: 1 | 3 | 6 | 12;
    horizon: number;
    target: number;
    cost: number;
    side: 'long' | 'short';
    regime: 'any' | 'above' | 'below' | 'volume';
    bars: 1000 | 3000 | 5000 | 20000;
}
export declare const defaultExplorerConfig: ExplorerConfig;
export declare function validExplorerConfig(c: ExplorerConfig): boolean;
export declare function matchesFrame(frames: readonly SignalFrame[], candles: readonly Candle[], i: number, config: ExplorerConfig, contexts?: ReadonlyMap<number, DerivativeContextPoint>): boolean;
export interface ExplorerSample {
    derivatives?: DerivativeContextPoint;
    at: number;
    enteredAt: number;
    exitAt: number;
    entry: number;
    exit: number | null;
    outcome: 'up' | 'down' | 'timeout' | 'ambiguous';
    net: number | null;
}
export interface ExplorerResult {
    derivativeCoverage?: { candidates: number; available: number; unknown: number; excluded: number; matched: number };
    records: ExplorerSample[];
    samples: number;
    hits: number;
    proportion: number | null;
    interval: number[] | null;
    meanNet: number | null;
    skippedGaps: number;
    pending: number;
    up: number;
    down: number;
    timeout: number;
    ambiguous: number;
    splits: {
        samples: number;
        meanNet: number | null;
    }[];
}
export declare function exploreHistory(candles: readonly Candle[], config: ExplorerConfig, frames?: SignalFrame[], contexts?: ReadonlyMap<number, DerivativeContextPoint>): ExplorerResult | null;
