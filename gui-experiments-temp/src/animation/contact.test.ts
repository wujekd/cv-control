import { describe, expect, it } from 'vitest'
import { resolveContactY } from './contact'

describe('contact boundary', () => {
  it('lifts a particle whose lowest point crosses the boundary', () => {
    expect(resolveContactY(-0.4, -0.63, -0.57)).toBeCloseTo(-0.34)
  })

  it('does not move a particle that remains above the boundary', () => {
    expect(resolveContactY(-0.4, -0.52, -0.57)).toBe(-0.4)
  })
})
