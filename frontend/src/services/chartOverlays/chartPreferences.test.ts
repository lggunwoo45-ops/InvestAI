import { beforeEach, expect, it } from 'vitest'
import { defaultChartPreferences, readChartPreferences, saveChartPreferences } from './chartPreferences'
beforeEach(() => localStorage.clear())
it('isolates settings by asset/timeframe and validates saved values', () => {
  const value = defaultChartPreferences(); value.averages[5] = false; value.visibility.supportResistance = false
  saveChartPreferences('btc:1H', value)
  expect(readChartPreferences('btc:1H')).toEqual(value)
  expect(readChartPreferences('eth:1H')).toEqual(defaultChartPreferences())
  expect(readChartPreferences('btc:1D')).toEqual(defaultChartPreferences())
  localStorage.setItem('broken', '{')
  expect(readChartPreferences('broken')).toEqual(defaultChartPreferences())
  localStorage.setItem('invalid', '{"averages":{"5":"false"}}')
  expect(readChartPreferences('invalid').averages[5]).toBe(true)
})
