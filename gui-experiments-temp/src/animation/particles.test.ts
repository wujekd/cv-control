import { describe, expect, it } from 'vitest'
import { clamp01, createParticles, sampleParticle } from './particles'

describe('particle animation', () => {
  it('creates repeatable particle layouts from a seed', () => {
    expect(createParticles(4, 7)).toEqual(createParticles(4, 7))
  })

  it('clamps progress to the available range', () => {
    expect(clamp01(-0.2)).toBe(0)
    expect(clamp01(1.2)).toBe(1)
  })

  it('finishes at the assigned landing position', () => {
    const particle = createParticles(1, 7)[0]
    const sampled = sampleParticle(particle, 2)

    expect(sampled).toMatchObject({
      x: particle.landingX,
      y: particle.landingY,
      z: particle.landingZ,
    })
  })

  it('varies organic proportions and tone within a particle group', () => {
    const particles = createParticles(16, 42)
    const widths = new Set(particles.map(({ width }) => width.toFixed(3)))
    const lengths = new Set(particles.map(({ length }) => length.toFixed(3)))
    const tones = new Set(particles.map(({ tone }) => tone.toFixed(3)))

    expect(widths.size).toBeGreaterThan(6)
    expect(lengths.size).toBeGreaterThan(6)
    expect(tones.size).toBeGreaterThan(6)
  })

  it('settles into a compact, low pile in the middle of the tray', () => {
    const particles = createParticles(120, 81)
    const xValues = particles.map(({ landingX }) => landingX)
    const yValues = particles.map(({ landingY }) => landingY)
    const zValues = particles.map(({ landingZ }) => landingZ)
    const centeredParticles = particles.filter(
      ({ landingX, landingZ }) =>
        Math.abs(landingX) < 0.62 && Math.abs(landingZ) < 0.36,
    )

    expect(centeredParticles.length).toBeGreaterThan(60)
    expect(Math.max(...xValues) - Math.min(...xValues)).toBeLessThan(2.5)
    expect(Math.max(...zValues) - Math.min(...zValues)).toBeLessThan(1.5)
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeLessThan(0.28)
    expect(Math.max(...yValues) - Math.min(...yValues)).toBeGreaterThan(0.16)
  })

  it('targets cup particles beneath the water and inside the cup', () => {
    const particles = createParticles(80, 12, 'cup')

    particles.forEach(({ landingX, landingY, landingZ }) => {
      expect(landingY).toBeLessThan(-0.18)
      expect(Math.hypot(landingX, landingZ)).toBeLessThan(1.05)
    })
  })
})
