import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import {
  clamp01,
  createParticles,
  sampleParticle,
  type Particle,
} from '../animation/particles'

type IngredientSceneProps = {
  progressRef: MutableRefObject<number>
  reducedMotion: boolean
}

type IngredientInstancesProps = {
  baseColor: string
  baseSize: number
  clipPlane: THREE.Plane
  count: number
  end: number
  geometry: THREE.BufferGeometry
  particles: Particle[]
  progressRef: MutableRefObject<number>
  start: number
}

function IngredientInstances({
  baseColor,
  baseSize,
  clipPlane,
  count,
  end,
  geometry,
  particles,
  progressRef,
  start,
}: IngredientInstancesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const transform = useMemo(() => new THREE.Object3D(), [])
  const clippingPlanes = useMemo(() => [clipPlane], [clipPlane])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    const phaseProgress = clamp01((progressRef.current - start) / (end - start))

    particles.forEach((particle, index) => {
      const sample = sampleParticle(particle, phaseProgress)
      transform.position.set(sample.x, sample.y, sample.z)
      transform.rotation.set(
        sample.rotationX,
        sample.rotationY,
        sample.rotationZ,
      )

      transform.scale.set(
        baseSize * particle.width * sample.scale,
        baseSize * particle.length * sample.scale,
        baseSize * particle.thickness * sample.scale,
      )

      transform.updateMatrix()
      mesh.setMatrixAt(index, transform.matrix)
    })

    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial
        color={baseColor}
        clippingPlanes={clippingPlanes}
        emissive={baseColor}
        emissiveIntensity={0.08}
        roughness={0.74}
        metalness={0}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}

function WaterSurface({
  progressRef,
}: Pick<IngredientSceneProps, 'progressRef'>) {
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null)
  const clearColor = useMemo(() => new THREE.Color('#e8e3c9'), [])
  const steepedColor = useMemo(() => new THREE.Color('#b9bf69'), [])

  useFrame(() => {
    const material = materialRef.current
    if (!material) return

    const progress = clamp01((progressRef.current - 0.03) / 0.87)
    const eased = progress * progress * (3 - 2 * progress)
    material.color.copy(clearColor).lerp(steepedColor, eased)
    material.emissive.copy(clearColor).lerp(steepedColor, eased)
    material.opacity = 0.68 + eased * 0.18
  })

  return (
    <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1.18, 64]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color="#e8e3c9"
        emissive="#e8e3c9"
        emissiveIntensity={0.08}
        roughness={0.18}
        clearcoat={0.6}
        transparent
        opacity={0.68}
        depthWrite
      />
    </mesh>
  )
}

function createLeafGeometry(variant: number): THREE.BufferGeometry {
  const widths = [0.28, 0.35, 0.24]
  const bends = [0.08, -0.1, 0.03]
  const width = widths[variant % widths.length]
  const bend = bends[variant % bends.length]
  const geometry = new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        bend * 0.15, 0, 0.09,
        bend, 0.68, 0,
        -width, 0.2, 0.025,
        -width * 0.58, -0.36, -0.015,
        0, -0.62, 0,
        width * 0.48, -0.34, 0.02,
        width * 0.9, 0.18, -0.025,
      ],
      3,
    ),
  )
  geometry.setIndex([
    0, 1, 2,
    0, 2, 3,
    0, 3, 4,
    0, 4, 5,
    0, 5, 6,
    0, 6, 1,
  ])
  geometry.computeVertexNormals()
  return geometry
}

function createFlakeGeometry(variant: number): THREE.BufferGeometry {
  const radiusSets = [
    [0.82, 0.56, 0.94, 0.62, 0.78, 0.52],
    [0.62, 0.9, 0.5, 0.82, 0.58, 0.95],
    [0.92, 0.64, 0.7, 0.48, 0.88, 0.6],
  ]
  const radii = radiusSets[variant % radiusSets.length]
  const positions = [0, 0, 0.12]

  radii.forEach((radius, index) => {
    const angle = (index / radii.length) * Math.PI * 2
    positions.push(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.68,
      index % 2 === 0 ? 0.02 : -0.025,
    )
  })

  const geometry = new THREE.BufferGeometry()
  const indices: number[] = []
  radii.forEach((_, index) => {
    indices.push(0, index + 1, ((index + 1) % radii.length) + 1)
  })
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3),
  )
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function SceneContents({ progressRef }: Pick<IngredientSceneProps, 'progressRef'>) {
  const leafGroups = useMemo(
    () => [
      createParticles(72, 1847, 'cup'),
      createParticles(68, 3011, 'cup'),
      createParticles(64, 4877, 'cup'),
    ],
    [],
  )
  const spiceGroups = useMemo(
    () => [
      createParticles(62, 9281, 'cup'),
      createParticles(58, 7127, 'cup'),
      createParticles(54, 6101, 'cup'),
    ],
    [],
  )
  const leafGeometries = useMemo(
    () => [0, 1, 2].map(createLeafGeometry),
    [],
  )
  const flakeGeometries = useMemo(
    () => [0, 1, 2].map(createFlakeGeometry),
    [],
  )
  const leafColors = ['#486f35', '#6f8f46', '#3f6338'] as const
  const spiceColors = ['#c66d2c', '#9f4b25', '#d58a3c'] as const
  const waterClipPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.18),
    [],
  )

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[-4, 7, 5]} intensity={2.8} color="#fff2cf" />
      <pointLight position={[4, 2, 3]} intensity={14} color="#e67d3e" distance={10} />

      {leafGroups.map((particles, index) => (
        <IngredientInstances
          baseColor={leafColors[index]}
          baseSize={0.24}
          clipPlane={waterClipPlane}
          count={particles.length}
          end={0.52}
          geometry={leafGeometries[index]}
          key={leafColors[index]}
          particles={particles}
          progressRef={progressRef}
          start={0.03}
        />
      ))}
      {spiceGroups.map((particles, index) => (
        <IngredientInstances
          baseColor={spiceColors[index]}
          baseSize={0.075}
          clipPlane={waterClipPlane}
          count={particles.length}
          end={0.9}
          geometry={flakeGeometries[index]}
          key={spiceColors[index]}
          particles={particles}
          progressRef={progressRef}
          start={0.4}
        />
      ))}

      <group>
        <mesh position={[0, -0.79, 0]}>
          <cylinderGeometry args={[1.3, 1.08, 1.2, 64, 1, true]} />
          <meshPhysicalMaterial
            color="#e5d5b5"
            roughness={0.5}
            clearcoat={0.24}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.3, 0.085, 16, 64]} />
          <meshPhysicalMaterial color="#f0e2c7" roughness={0.42} clearcoat={0.32} />
        </mesh>
        <mesh position={[1.5, -0.76, 0]}>
          <torusGeometry args={[0.52, 0.14, 16, 48]} />
          <meshPhysicalMaterial color="#dfccaa" roughness={0.54} clearcoat={0.22} />
        </mesh>
        <mesh position={[0, -1.42, 0]}>
          <cylinderGeometry args={[1.75, 1.82, 0.1, 64]} />
          <meshPhysicalMaterial color="#d8c39d" roughness={0.6} clearcoat={0.18} />
        </mesh>
        <WaterSurface progressRef={progressRef} />
      </group>

      <mesh
        position={[0, -1.49, 0.1]}
        rotation={[-Math.PI / 2, 0, 0]}
        scale={[1.2, 0.6, 1]}
      >
        <circleGeometry args={[1.85, 64]} />
        <meshBasicMaterial
          color="#050a07"
          transparent
          opacity={0.28}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

export function IngredientScene({
  progressRef,
  reducedMotion,
}: IngredientSceneProps) {
  return (
    <Canvas
      camera={{
        fov: 38,
        near: 0.1,
        far: 50,
        position: [0, 2.3, 8.4],
        rotation: [-0.29, 0, 0],
      }}
      dpr={[1, 1.6]}
      frameloop={reducedMotion ? 'demand' : 'always'}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0)
        gl.localClippingEnabled = true
      }}
    >
      <SceneContents progressRef={progressRef} />
    </Canvas>
  )
}
