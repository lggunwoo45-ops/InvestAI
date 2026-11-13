import { describe, expect, it } from 'vitest'
import { movingAverageSeries } from './movingAverageSeries'
const bar = (hour: number, close: number) => ({ timestamp: hour * 3_600_000, close, open: close, high: close, low: close, volume: 10 })
describe('moving-average curves', () => {
  it('uses only closed bars and computes a rolling average, not a flat latest value', () => {
    expect(movingAverageSeries([bar(0, 10), bar(1, 20), bar(2, 30), bar(3, 50)], 2, '1H', 3.5 * 3_600_000)).toEqual([{ time: 3600, value: 15 }, { time: 7200, value: 25 }])
  })
  it('breaks the calculation window at missing or invalid prices', () => {
    const points = movingAverageSeries([bar(0, 10), bar(1, 20), bar(3, 30), bar(4, 40), bar(5, NaN), bar(6, 60), bar(7, 70)], 2, '1H', 9 * 3_600_000)
    expect(points.filter(p => p.value !== undefined)).toEqual([{ time: 3600, value: 15 }, { time: 14400, value: 35 }, { time: 25200, value: 65 }])
    expect(points).toContainEqual({time:7200})
    expect(points).toContainEqual({time:18000})
  })
  it('normalizes order and uses the latest correction for a duplicate bar', () => {
    expect(movingAverageSeries([bar(1, 20), bar(0, 10), bar(1, 40)], 2, '1H', 9 * 3_600_000)).toEqual([{ time: 3600, value: 25 }])
  })
})
