# Scroll Ingredient Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deployment placeholder with a responsive scroll-controlled demo in which two groups of 3D ingredient pieces fall into a bowl while synchronized ingredient copy changes beside it.

**Architecture:** A CSS-sticky story section provides native scrolling while GSAP ScrollTrigger writes normalized progress into a mutable ref. React Three Fiber reads that ref each render frame and applies deterministic transforms to instanced meshes; React state changes only when the active copy chapter changes. Pure particle generation and sampling functions are tested independently from WebGL.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, GSAP ScrollTrigger, Vitest, Vite, Firebase Hosting

---

### Task 1: Add animation dependencies and deterministic particle tests

**Files:**
- Modify: `gui-experiments-temp/package.json`
- Create: `gui-experiments-temp/src/animation/particles.test.ts`
- Create: `gui-experiments-temp/src/animation/particles.ts`

- [x] **Step 1: Install runtime and test dependencies**

Run:

```bash
npm install three @react-three/fiber gsap
npm install --save-dev vitest
```

Expected: `package.json` lists the three runtime libraries and Vitest, and the lockfile resolves without vulnerabilities.

- [x] **Step 2: Add the test script and failing deterministic-animation tests**

Add `"test": "vitest run"` to `scripts`. Test that two calls to `createParticles(4, 7)` return equal arrays, that `clamp01` clamps both boundaries, and that `sampleParticle` returns its final landing coordinates after progress reaches one:

```ts
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
    expect(sampleParticle(particle, 2)).toMatchObject({
      x: particle.landingX,
      y: particle.landingY,
      z: particle.landingZ,
    })
  })
})
```

Run: `npm test`

Expected: FAIL because `particles.ts` does not exist.

- [x] **Step 3: Implement seeded generation and reversible sampling**

Define a `Particle` type containing start, landing, delay, drift, rotation, and scale values. Implement a small seeded pseudorandom generator, `clamp01`, `createParticles`, and `sampleParticle`. Sampling uses clamped local progress, eased interpolation, and a decaying sinusoidal flutter; at progress one it returns the exact landing position.

- [x] **Step 4: Run the tests**

Run: `npm test`

Expected: all three particle-animation tests pass.

### Task 2: Build the scroll controller and Three.js scene

**Files:**
- Create: `gui-experiments-temp/src/hooks/useReducedMotion.ts`
- Create: `gui-experiments-temp/src/hooks/useScrollStory.ts`
- Create: `gui-experiments-temp/src/components/IngredientScene.tsx`
- Create: `gui-experiments-temp/src/components/IngredientStory.tsx`

- [x] **Step 1: Implement motion preference and scroll progress hooks**

`useReducedMotion` reads `matchMedia('(prefers-reduced-motion: reduce)')`, subscribes to changes, and removes the listener on cleanup. `useScrollStory` registers ScrollTrigger against the story section, writes `self.progress` to a ref, maps progress below `0.45` to chapter zero, below `0.82` to chapter one, and the remainder to chapter two, and reverts the GSAP context on cleanup. Reduced motion fixes progress at one and skips ScrollTrigger.

- [x] **Step 2: Render deterministic instanced ingredient groups**

Create an `IngredientInstances` component local to `IngredientScene.tsx`. It creates seeded particle data once, then uses `useFrame` and one reusable `Object3D` to update each instance matrix from `sampleParticle`. Render one green group active over progress `0.04–0.48` and one amber group active over `0.43–0.86`, along with a shallow stoneware bowl, rim, lights, and a shadow plane.

- [x] **Step 3: Compose the pinned story and copy chapters**

`IngredientStory` owns the story ref and active chapter. Its sticky viewport contains a decorative React Three Fiber `Canvas`, a three-card copy region, a progress marker, and a visible “Scroll to blend” cue. Only the current copy card is exposed visually; all ingredient content remains semantic HTML.

### Task 3: Apply the experimental visual system and page narrative

**Files:**
- Modify: `gui-experiments-temp/src/App.tsx`
- Modify: `gui-experiments-temp/src/App.css`
- Modify: `gui-experiments-temp/src/index.css`

- [x] **Step 1: Replace the placeholder page structure**

Render a compact introductory header, the `IngredientStory`, and a concluding section that labels the work as “Prototype 01” and explains that it is testing reversible particles, text timing, and visual layering.

- [x] **Step 2: Implement responsive styling**

Use a dark botanical palette, oversized editorial headings, a 400vh story section, a 100svh sticky stage, responsive two-column composition on desktop, and a stacked visual/copy composition below 760px. Ensure focus-visible styles, safe text contrast, and no horizontal overflow.

- [x] **Step 3: Add the reduced-motion presentation**

Under `@media (prefers-reduced-motion: reduce)`, remove nonessential CSS transitions, shorten the story to one viewport, hide the scroll cue and progress rail, and present the finished blend with the final copy.

### Task 4: Verify and deploy the iteration

**Files:**
- Verify: `gui-experiments-temp/dist/index.html`
- Verify: `gui-experiments-temp/firebase.json`

- [x] **Step 1: Run automated verification**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: tests and lint pass, TypeScript compiles, and Vite creates production assets in `dist/`.

- [x] **Step 2: Review the changed TSX files against React best practices**

Confirm one exported component per file, named exports, complete effect cleanup, stable particle arrays, semantic content, and no per-frame React state updates. Apply only the minimal fixes required by the review.

- [x] **Step 3: Deploy the new Hosting version**

Run: `firebase deploy --only hosting --non-interactive`

Expected: Firebase publishes to `https://gui-experiments-dw-20260716.web.app/`.

- [x] **Step 4: Verify the deployed experience**

Open the Hosting URL in the browser, confirm the title and three copy chapters render, scroll through the story in both directions, and confirm there are no console errors.
