export const portfolioNumber = (value: number) => value.toLocaleString(undefined, { maximumSignificantDigits: 12 })
export const portfolioPercent = (value: number) => `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`
