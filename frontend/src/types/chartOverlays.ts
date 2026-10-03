export type ChartOverlayGroup = 'supportResistance' | 'movingAverage' | 'fibonacci' | 'user'

export interface ChartOverlayVisibility {
  supportResistance: boolean
  movingAverage: boolean
  fibonacci: boolean
  user: boolean
}

export interface UserChartLine {
  id: string
  instrumentId: string
  label: string
  price: number
  createdAt: string
  updatedAt: string
  visible: boolean
}

export interface UserChartLineInput {
  label: string
  price: number
}
