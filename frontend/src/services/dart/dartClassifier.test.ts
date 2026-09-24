import { describe, expect, it } from 'vitest'

import { classifyDartDisclosure } from './dartClassifier'

describe('classifyDartDisclosure', () => {
  it('classifies periodic, correction, and material titles neutrally', () => {
    expect(classifyDartDisclosure('사업보고서 (2025.12)')).toBe('periodic')
    expect(classifyDartDisclosure('[기재정정] 분기보고서')).toBe('correction')
    expect(classifyDartDisclosure('주요사항보고서(유상증자결정)')).toBe('material')
  })

  it('leaves unknown titles as other', () => {
    expect(classifyDartDisclosure('기업설명회(IR) 개최')).toBe('other')
  })
})
