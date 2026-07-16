export type Particle = {
  delay: number
  drift: number
  flutter: number
  landingX: number
  landingY: number
  landingZ: number
  length: number
  phase: number
  rotation: number
  scale: number
  settleTilt: number
  settleYaw: number
  startX: number
  startY: number
  startZ: number
  thickness: number
  tone: number
  width: number
}

export type ParticleSample = {
  rotationX: number
  rotationY: number
  rotationZ: number
  scale: number
  x: number
  y: number
  z: number
}

export type ParticleLayout = 'pile' | 'cup'

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

export function createParticles(
  count: number,
  seed: number,
  layout: ParticleLayout = 'pile',
): Particle[] {
  const random = mulberry32(seed)

  return Array.from({ length: count }, () => {
    const landingAngle = random() * Math.PI * 2
    const radialSample = random()
    const variationSample = random()
    const pileRadius =
      Math.pow(radialSample, 2.1) * (0.92 + variationSample * 0.16)
    const cupRadius = Math.sqrt(radialSample) * 0.92
    const landingRadius = layout === 'cup' ? cupRadius : pileRadius
    const landingX =
      Math.cos(landingAngle) * landingRadius * (layout === 'cup' ? 1 : 1.18)
    const landingZ =
      Math.sin(landingAngle) * landingRadius * (layout === 'cup' ? 1 : 0.66)
    const moundHeight =
      Math.pow(1 - Math.min(1, pileRadius), 1.6) * 0.21
    const landingY =
      layout === 'cup'
        ? -0.48 - variationSample * 0.32
        : -0.49 + moundHeight + random() * 0.025

    return {
      delay: random() * 0.68,
      drift: 0.12 + random() * 0.35,
      flutter: 2.5 + random() * 4,
      landingX,
      landingY,
      landingZ,
      length: 0.72 + random() * 0.62,
      phase: random() * Math.PI * 2,
      rotation: (random() - 0.5) * Math.PI * 8,
      scale: 0.62 + random() * 0.72,
      settleTilt: (random() - 0.5) * 0.34,
      settleYaw: random() * Math.PI * 2,
      startX: (random() - 0.5) * 4.6,
      startY: 5.4 + random() * 2.4,
      startZ: (random() - 0.5) * 2.4,
      thickness: 0.65 + random() * 0.7,
      tone: random(),
      width: 0.58 + random() * 0.7,
    }
  })
}

export function sampleParticle(
  particle: Particle,
  progress: number,
): ParticleSample {
  const localProgress = clamp01(
    (progress - particle.delay) / (1 - particle.delay),
  )
  const eased = 1 - Math.pow(1 - localProgress, 3)
  const flutterStrength = Math.sin(localProgress * Math.PI) * (1 - eased)
  const settleProgress = clamp01((localProgress - 0.55) / 0.37)
  const settledEase = 1 - Math.pow(1 - settleProgress, 2)
  const horizontalWave =
    Math.sin(localProgress * particle.flutter * Math.PI + particle.phase) *
    particle.drift *
    flutterStrength
  const x =
    localProgress === 1
      ? particle.landingX
      : particle.startX +
        (particle.landingX - particle.startX) * eased +
        horizontalWave
  const y =
    localProgress === 1
      ? particle.landingY
      : particle.startY + (particle.landingY - particle.startY) * eased
  const z =
    localProgress === 1
      ? particle.landingZ
      : particle.startZ +
        (particle.landingZ - particle.startZ) * eased +
        horizontalWave * 0.35
  const tumblingX = particle.phase + particle.rotation * localProgress
  const tumblingY = particle.rotation * 0.45 * localProgress
  const tumblingZ =
    particle.phase * 0.4 + particle.rotation * 0.7 * localProgress

  return {
    x,
    y,
    z,
    rotationX:
      tumblingX +
      (Math.PI / 2 + particle.settleTilt - tumblingX) * settledEase,
    rotationY:
      tumblingY + (particle.settleYaw - tumblingY) * settledEase,
    rotationZ:
      tumblingZ + (particle.settleTilt * 0.35 - tumblingZ) * settledEase,
    scale: particle.scale * (0.84 + eased * 0.16),
  }
}
