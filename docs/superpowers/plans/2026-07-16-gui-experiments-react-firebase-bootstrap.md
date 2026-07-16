# GUI Experiments React/Firebase Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create an isolated React sandbox and publish its placeholder screen from a new Firebase Hosting project.

**Architecture:** A standalone Vite React/TypeScript app lives under `gui-experiments-temp`, with no dependency on the parent workspace. Firebase Hosting serves the generated `dist` directory and rewrites unknown routes to the SPA entry point.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Firebase Hosting

---

### Task 1: Scaffold the isolated React application

**Files:**
- Create: `gui-experiments-temp/package.json`
- Create: `gui-experiments-temp/package-lock.json`
- Create: `gui-experiments-temp/index.html`
- Create: `gui-experiments-temp/tsconfig.json`
- Create: `gui-experiments-temp/tsconfig.app.json`
- Create: `gui-experiments-temp/tsconfig.node.json`
- Create: `gui-experiments-temp/vite.config.ts`
- Create: `gui-experiments-temp/eslint.config.js`
- Create: `gui-experiments-temp/src/main.tsx`
- Create: `gui-experiments-temp/src/App.tsx`
- Create: `gui-experiments-temp/src/App.css`
- Create: `gui-experiments-temp/src/index.css`

- [x] **Step 1: Generate the Vite React/TypeScript scaffold**

Run:

```bash
cd gui-experiments-temp
npm create vite@latest . -- --template react-ts
npm install
```

Expected: dependencies install successfully and `package.json` contains `dev`, `build`, `lint`, and `preview` scripts.

- [x] **Step 2: Replace the demo with a neutral deployment placeholder**

Set `src/App.tsx` to render a heading identifying the GUI experiment sandbox, a deployment-success message, and a short note that the first experiment will be added next. Keep the screen free of product functionality.

- [x] **Step 3: Build and lint the scaffold**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit successfully and Vite writes production assets to `dist/`.

### Task 2: Configure a new Firebase Hosting project

**Files:**
- Create: `gui-experiments-temp/firebase.json`
- Create: `gui-experiments-temp/.firebaserc`
- Modify: `gui-experiments-temp/.gitignore`

- [x] **Step 1: Create the Firebase project**

Run with an unused globally unique ID:

```bash
firebase projects:create <unique-project-id> --display-name "GUI Experiments"
```

Expected: Firebase returns a new active project owned by the signed-in account.

- [x] **Step 2: Configure Hosting for the Vite output**

Create `firebase.json` with `dist` as the public directory, ignore dotfiles and dependency folders, enable clean URLs, and rewrite all routes to `/index.html`. Create `.firebaserc` with the new project ID as the default project.

- [x] **Step 3: Exclude local Firebase state**

Add `.firebase` and `firebase-debug.log*` to `.gitignore` so emulator/deployment state is not committed.

### Task 3: Deploy and verify the placeholder

**Files:**
- Verify: `gui-experiments-temp/dist/index.html`

- [x] **Step 1: Deploy Hosting**

Run:

```bash
firebase deploy --only hosting
```

Expected: Firebase reports a successful deployment and prints the public Hosting URL.

- [x] **Step 2: Verify the public response**

Run:

```bash
curl --fail --location <hosting-url>
```

Expected: HTTP succeeds and the response references the built Vite assets.

- [x] **Step 3: Confirm the deployed page content in a browser**

Open the Hosting URL and verify that the placeholder heading and deployment-success message are visible with no console-breaking runtime error.
