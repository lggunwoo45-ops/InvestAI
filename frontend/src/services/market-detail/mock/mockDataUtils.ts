import type { MarketInstrument } from '@/types/market'

export function createSeed(value: string): number {
  return [...value].reduce((seed, character) => ((seed * 31) + character.charCodeAt(0)) >>> 0, 2166136261)
}

export function createRandom(seed: number): () => number {
  let state = seed || 1
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

export function priceStep(instrument: MarketInstrument): number {
  if (instrument.quoteCurrency === 'KRW') return instrument.lastPrice >= 100_000 ? 100 : 1
  if (instrument.lastPrice < 1) return 0.0001
  return instrument.lastPrice >= 10_000 ? 0.1 : 0.01
}

export function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}
