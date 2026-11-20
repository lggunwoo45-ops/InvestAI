import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { SimpleBacktestOutcome } from './SimpleBacktestOutcome'
import type { BacktestResult } from '@/services/cryptoAnalysis/strategyLab'

it('shows losses honestly even when a strategy loses less than holding', () => {
  const result: BacktestResult = { starting: 1000, equity: 900, returnPercent: -10, buyHoldPercent: -20, drawdownPercent: 25, trades: [], from: 1700000000000, to: 1701000000000, bars: 100, feePercent: .05, slippagePercent: .1 }
  const view = render(<SimpleBacktestOutcome result={result} currency="KRW" language="ko" />)
  expect(screen.getByText('900 KRW')).toBeTruthy()
  expect(screen.getByText('계속 보유한 것보다 100 KRW 더 남았어요.')).toBeTruthy()
  expect(screen.getByText('이 규칙의 결과도 시작 금액보다 줄었어요.')).toBeTruthy()
  expect(screen.getByText(/하루 안의 급락은 더 클 수/)).toBeTruthy()
  view.rerender(<SimpleBacktestOutcome result={{ ...result, equity: 700, returnPercent: -30 }} currency="KRW" language="ko" />)
  expect(screen.getByText('계속 보유한 것보다 100 KRW 덜 남았어요.')).toBeTruthy()
})
