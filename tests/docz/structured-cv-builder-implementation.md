# Building a Structured CV Builder: The Implementation Behind the Hybrid Editor

## The implementation goal

The product idea sounds simple on the surface:

keep a master CV, build tailored versions, render them cleanly

But implementing it cleanly requires a strict boundary between editing, selection, persistence, and rendering.

This project was built around that boundary from day one.

## The stack

The current implementation uses:

- React + Vite + TypeScript on the frontend
- plain CSS, not Tailwind
- Node on the backend
- SQLite for persistence
- Tectonic as the LaTeX compiler backend

That combination supports both a fast editing workflow and a stronger final PDF pipeline.

## The core model split

The application is built around a few explicit layers.

### 1. Master CV

The master profile stores the complete structured content set:

- personal basics
- summary
- education
- experience
- projects
- skills

Every entry and bullet is typed and addressable.

### 2. CV version

A version does not duplicate content.

It stores version-specific selection state:

- which sections are enabled
- section order
- selected item IDs
- selected bullet IDs

That lets one profile branch into many tailored versions without content drift.

### 3. Document template

The template controls page-level rendering rules:

- page size
- margins
- section slot heights
- layout spacing
- typography defaults

The current implementation is built around a single fixed one-page template, but the model leaves room for additional templates later.

### 4. Renderable document

The frontend and backend do not render directly from raw profile data.

Everything goes through a derived render model built by the shared pipeline.

That renderable layer is the bridge between:

- editor state
- HTML preview
- LaTeX rendering
- fit diagnostics

## Shared rendering logic

One of the most important implementation decisions was putting the transformation logic in the shared package.

The `buildRenderableCv(...)` pipeline:

- validates the version against the master profile
- resolves enabled sections
- orders content
- filters selected items and bullets
- returns a clean render-ready document plus diagnostics

That keeps both renderers honest.

The browser preview and the LaTeX preview are not inventing their own versions of the document.

They are both downstream of the same render contract.

## Why the frontend is HTML-first

The frontend uses HTML/CSS as the live editing preview because it is:

- immediate
- interactive
- easy to measure in the browser
- much better suited to direct editing than a PDF loop

The right-hand preview pane can switch between:

- HTML preview for fast visual feedback
- LaTeX-backed PDF preview for final output checking

That is the core hybrid model in practice.

## Why the backend still matters

The app is not just a frontend editor.

The backend owns the parts that benefit from stronger control:

- SQLite persistence through repositories
- PDF preview rendering
- LaTeX compilation
- compiled page-count validation

Using SQLite now keeps the storage layer simple while still allowing the repository boundary to evolve later.

That also makes a future move to another persistence backend much less disruptive.

## The PDF preview path

The PDF preview is generated on the backend through Tectonic.

The pipeline is:

1. frontend sends the draft profile and version
2. shared logic builds the renderable document
3. backend generates LaTeX from that document
4. Tectonic compiles it to PDF
5. frontend receives the compiled preview and metadata

This gives the app a final rendering pass that is much closer to export reality than browser print emulation.

The compiled page count is also measured, so PDF overflow can be flagged as a real diagnostic instead of a guess.

## Layout strategy

The current template is intentionally opinionated.

It uses:

- fixed section slots
- controlled vertical spacing
- fixed one-page A4 constraints
- dynamic content alignment within slots

That makes the editor more rigid than a generic page builder, but it is exactly what gives the system reliable fit behavior.

The implementation is trading freedom for predictability on purpose.

## State management on the frontend

The editor state lives in a focused Zustand store.

That store coordinates:

- the active profile
- the available versions
- the active version
- selected section
- save state
- PDF preview state
- diagnostics panel visibility

The React view layer stays mostly orchestration-oriented, while domain actions remain in store logic and shared transformation code.

That keeps the UI from becoming the place where business rules leak out.

## How the editing UI is structured

The editor is currently split into three main columns:

- a left rail for version and section controls
- a middle column for section settings plus master content editing
- a right column for preview

Recent refinements pushed version-specific item selection and ordering into the middle content editor itself, next to the content rows they affect.

That reduced duplication and made the UI more coherent:

- edit content where the content lives
- select visible items where the items are shown
- preview output in parallel

## Why this architecture scales

The implementation was designed for future extension without rebuilding the core model.

This foundation can support:

- more section settings
- multiple document templates
- alternate section layouts
- richer diagnostics
- AI-assisted bullet rewriting
- version branching workflows

The reason that remains possible is simple:

the app never treats the CV as a single mutable document blob

Instead, it treats the CV as structured data with derived rendering.

## Closing thought

The hardest part of building this kind of application is resisting shortcuts that feel productive early but collapse later.

Rendering directly from UI state, storing rich text blobs, or letting each preview path invent its own layout logic would all be faster at first.

They would also make the system brittle.

The current implementation is more disciplined than that.

It is built so the editor, the version model, and the rendering pipeline stay aligned even as the product grows.
