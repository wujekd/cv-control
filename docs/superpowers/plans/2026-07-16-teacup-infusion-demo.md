# Teacup Infusion Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the tray scene with a teacup whose falling ingredients disappear below the water surface while the water gradually becomes pale yellow-green.

**Architecture:** Particle generation gains a cup layout that targets positions beneath a fixed water plane. Three.js clipping removes geometry below that plane, while a private water component reads the existing scroll-progress ref each frame and interpolates its material colour without causing React renders.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, GSAP ScrollTrigger, Vitest, Firebase Hosting

---

### Task 1: Add cup-specific particle targets

**Files:**
- Modify: `gui-experiments-temp/src/animation/particles.ts`
- Modify: `gui-experiments-temp/src/animation/particles.test.ts`

- [x] **Step 1: Add a failing cup-layout test**

Call `createParticles(80, 12, 'cup')` and assert every landing point is below `-0.18` and has radial distance below `1.05`.

- [x] **Step 2: Add the cup layout**

Add `type ParticleLayout = 'pile' | 'cup'` and a defaulted third argument. For cup particles, sample a circular landing point inside radius `0.98` and a final Y between `-0.75` and `-0.45`; retain the pile layout for existing tests.

- [x] **Step 3: Run the particle tests**

Run: `npm test`

Expected: all particle and contact tests pass.

### Task 2: Replace the tray renderer with an infusion scene

**Files:**
- Modify: `gui-experiments-temp/src/components/IngredientScene.tsx`

- [x] **Step 1: Clip ingredients below the water plane**

Create one memoized `THREE.Plane(new THREE.Vector3(0, 1, 0), 0.18)`, pass it to ingredient materials, enable local clipping on the renderer, remove tray-contact clamping, and generate both ingredient groups with the cup layout.

- [x] **Step 2: Add animated water**

Create a private `WaterSurface` component with a material ref. In `useFrame`, interpolate from `#e7e1c6` to `#b8bd68` using normalized story progress and update opacity from `0.68` to `0.88`.

- [x] **Step 3: Build the teacup**

Replace the tray and its shadow with an open tapered ceramic cylinder, raised rim, visible handle, water disc, saucer, and compact contact shadow. Keep the water plane slightly below the rim so particles visibly enter before being clipped.

### Task 3: Update narrative copy and verify React quality

**Files:**
- Modify: `gui-experiments-temp/src/components/IngredientStory.tsx`

- [x] **Step 1: Update tea-specific copy**

Describe the first leaves, second aromatic tea, and the final pale infusion. Change the scene label to “A reversible infusion study.”

- [x] **Step 2: Run the React checklist**

Confirm named exports, private helpers, stable memoized Three.js resources, no per-frame React state, complete effect cleanup, semantic copy, and stable list keys.

### Task 4: Test and deploy

**Files:**
- Verify: `gui-experiments-temp/dist/index.html`

- [x] **Step 1: Run verification**

Run: `npm test && npm run lint && npm run build`

Expected: tests and lint pass and Vite produces the lazy-loaded scene chunk.

- [x] **Step 2: Deploy**

Run: `firebase deploy --only hosting --non-interactive --json`

Expected: Firebase reports a successful new Hosting version.

- [x] **Step 3: Verify the released asset**

Fetch the cache-busted Hosting URL and confirm it references the new index asset.
