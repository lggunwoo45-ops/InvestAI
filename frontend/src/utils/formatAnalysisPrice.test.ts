import { expect, it } from 'vitest'
import { formatAnalysisPrice } from './formatAnalysisPrice'
it('does not collapse distinct stablecoin prices to the same rounded value', () => {
  expect(formatAnalysisPrice(1.00014, 'ko')).toBe('1.00014')
  expect(formatAnalysisPrice(1.00028, 'ko')).toBe('1.00028')
  expect(formatAnalysisPrice(107798120, 'ko')).toBe('107,798,120')
  expect(formatAnalysisPrice(0.00000397224, 'en')).toBe('0.00000397224')
})
