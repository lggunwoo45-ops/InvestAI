export interface PublicPosition { key: string; asset: string; side: 'long' | 'short'; size: number; entryPrice: number; currentPrice: number; liquidationPrice: number | null; unrealizedPnl: number; leverage: number | null; marginType: 'cross' | 'isolated' | 'unknown'; quote: 'USDC' }
export interface PositionThresholds { distance: number | null; loss: number | null; leverage: number | null }
export declare const positionEventLabels: { initial: string; opened: string; closed: string; resized: string; liquidation: string; loss: string; leverage: string; resynced: string }
export declare function positionRiskValues(p: PublicPosition): PositionThresholds
export declare function positionBreaches(p: PublicPosition, thresholds: PositionThresholds): (keyof PositionThresholds)[]
