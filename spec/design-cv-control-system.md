---
title: CV Control System Design
version: 0.2-personal-data-decisions
date_created: 2026-05-19
last_updated: 2026-05-19
owner: TBD
tags: [design, architecture, app, cv-control, draft]
---

# Introduction

This specification defines the current and target design for CV Control, a structured CV builder that separates reusable career content from tailored CV versions and deterministic document rendering.

This draft is based on static analysis of the repository as of 2026-05-19 and the owner decisions captured on 2026-05-19.

## 1. Purpose & Scope

The purpose of this specification is to provide a complete, AI-readable design for extending CV Control while preserving its current architecture:

- A shared TypeScript domain package defines profile, version, template, and render contracts.
- A React frontend provides structured editing, version branching, section selection, and preview.
- A Node/Express API persists data in SQLite and performs PDF preview rendering.
- A render pipeline derives HTML and LaTeX-ready documents from structured data.

This specification covers:

- Current system architecture.
- Current data contracts and storage model.
- Gaps in personal data, profile settings, persistence boundaries, and version management.
- Target requirements for upcoming features.
- Interfaces, acceptance criteria, and test strategy.

This specification does not define:

- Multi-user authentication.
- Cloud sync.
- Production deployment topology.
- AI-assisted rewriting workflows.

Those topics may be added after owner decisions.

## 2. Definitions

- **CV Control**: The application being specified.
- **Profile**: The reusable master data set for one person, currently represented by `CvProfile`.
- **Personal Data**: Identity and contact data about the person: full name, location, email, phone number, LinkedIn URL, and web address.
- **Basics**: The current `CvProfile.basics` object rendered in the personal information section.
- **Version**: A tailored CV configuration represented by `CvVersion`. Versions select sections, items, bullets, order, document style, and summary overrides.
- **Baseline Version**: A version with no `parentVersionId`.
- **Branch Version**: A version cloned from another version with inherited settings until local overrides are applied.
- **Renderable CV**: The derived model returned by `buildRenderableCv(...)` and consumed by HTML/PDF preview renderers.
- **Template**: A document layout contract represented by `DocumentTemplate`.
- **Local Override**: A branch-specific change tracked by `CvVersion.localOverrides`.
- **Personal Data Override**: A version-specific personal data patch. It is empty by default, so the version uses canonical profile personal data.

## 3. Requirements, Constraints & Guidelines

### Current System Observations

- **OBS-001**: The repository is a TypeScript monorepo with `apps/web`, `apps/api`, and `packages/shared`.
- **OBS-002**: The web app uses React, Vite, CSS modules, and Zustand.
- **OBS-003**: The API uses Express and `better-sqlite3`.
- **OBS-004**: SQLite tables are `cv_profiles` and `cv_versions`; both store the complete JSON payload in `data_json`.
- **OBS-005**: The API bootstraps a sample profile/version if no stored profile/version exists.
- **OBS-006**: `CvProfile.basics` already contains `fullName`, `location`, `email`, `phone`, `linkedIn`, and `website`.
- **OBS-007**: The current UI exposes `CvProfile.basics` in the `Personal Info` section editor.
- **OBS-008**: There is no separate account/settings/profile page for personal data.
- **OBS-009**: Personal data is currently part of CV content, not a separate identity/settings model.
- **OBS-010**: Version inheritance currently supports summary content overrides but not personal-info overrides.
- **OBS-011**: `buildRenderableCv(...)` is the central shared transformation used by preview/export paths.
- **OBS-012**: The current application appears oriented around a single local user and one active profile.

### Target Requirements

- **REQ-001**: The system shall maintain one canonical source of personal data for the current person.
- **REQ-002**: The system shall provide a dedicated UI area for viewing and editing personal data.
- **REQ-003**: The personal data UI shall support full name, location, email, phone number, LinkedIn URL, and web address.
- **REQ-004**: The system shall persist personal data across app restarts.
- **REQ-005**: The system shall validate email and URL fields before saving or rendering.
- **REQ-006**: The system shall allow personal data to flow into CV rendering without duplicating values across versions.
- **REQ-007**: The system shall allow a CV version to override personal data, but a version shall use canonical personal data by default.
- **REQ-008**: The system shall support exactly one local profile/person for now and shall not introduce users, accounts, authentication, or multi-profile switching.
- **REQ-009**: The system shall preserve existing master content/version/render architecture unless a decision explicitly changes it.
- **REQ-010**: The system shall keep HTML preview and PDF preview downstream of the same shared render contract.
- **REQ-011**: The system shall expose clear unsaved/saved/error states for personal data edits.
- **REQ-012**: The system shall protect against accidentally losing personal data when importing or bootstrapping content.
- **REQ-013**: The system shall provide migrations or compatible bootstrapping for existing SQLite databases.
- **REQ-014**: The system shall keep personal data schema changes backward-compatible for existing `CvProfile.basics` payloads.

### Constraints

- **CON-001**: The project shall remain TypeScript-first.
- **CON-002**: The shared package shall remain the source of domain and render types.
- **CON-003**: The current local SQLite backend shall remain supported.
- **CON-004**: The app shall not rely on browser local storage as the canonical persistence layer.
- **CON-005**: Rendering shall not read directly from frontend UI state; it shall consume resolved domain data.
- **CON-006**: Existing branch/version behavior shall not regress.

### Guidelines

- **GUD-001**: Prefer explicit data contracts over implicit JSON blob assumptions.
- **GUD-002**: Treat personal data as identity/settings data, not merely a rendered section.
- **GUD-003**: Keep canonical personal data separate from per-version override patches.
- **GUD-004**: Add migrations in the API persistence layer before changing stored schema.
- **GUD-005**: Keep UX copy direct and operational; this is a work-focused editor, not a marketing surface.

## 4. Interfaces & Data Contracts

### Current `CvProfile`

```ts
interface CvProfile {
  id: ID;
  name: string;
  basics: BasicsSection;
  summary: SummarySection | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  metadata: CvMetadata;
}
```

### Current `BasicsSection`

```ts
interface BasicsSection {
  fullName: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  website?: string;
}
```

### Proposed Personal Data Contract

For the first implementation, personal data remains shaped as `BasicsSection` because the target fields exactly match the current render contract. The system adds explicit version-level override support rather than introducing users, accounts, or multiple profiles.

```ts
interface BasicsSection {
  fullName: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  website?: string;
}

type PersonalDataOverride = Partial<BasicsSection>;

interface CvVersionContentOverrides {
  summary?: SummarySection | null;
  basics?: PersonalDataOverride;
}
```

### Proposed Storage Options

| Option | Decision | Description | Reason |
| --- | --- | --- | --- |
| A | Selected | Keep canonical personal data inside `CvProfile.basics` and add version override patches in `CvVersion.contentOverrides.basics` | Smallest smooth implementation for a one-person local tool |
| B | Deferred | Add `person_identity` table later if settings grow beyond CV contact fields | Avoids unnecessary persistence complexity now |
| C | Rejected for now | Support multiple profiles/personas | The owner wants one local user/profile only |

### Current API Interfaces

- `GET /api/bootstrap`: returns profile, versions, templates, and active version ID.
- `PUT /api/profile`: saves the full profile JSON.
- `PUT /api/versions/:id`: saves a full version JSON.
- `POST /api/versions`: creates a version.
- `POST /api/versions/:id/clone`: branches a version.
- `POST /api/render/pdf-preview`: renders a PDF preview from supplied profile/version/template.
- `POST /api/render/html-preview`: renders a HTML-ready model from supplied profile/version/template.

### Proposed API Interfaces

No new API route is required for the first implementation.

- `GET /api/bootstrap` shall continue returning `profile` and `versions`.
- `PUT /api/profile` shall persist canonical `profile.basics`.
- `PUT /api/versions/:id` shall persist `version.contentOverrides.basics` when a version has personal data overrides.
- Render requests shall receive the resolved profile produced by shared inheritance logic.

## 5. Acceptance Criteria

- **AC-001**: Given a fresh database, When the app starts, Then the user sees seeded personal data and can edit it.
- **AC-002**: Given edited email data, When the user saves and restarts the app, Then the edited email remains visible.
- **AC-003**: Given an invalid email, When the user saves, Then the app blocks or clearly reports the validation error.
- **AC-004**: Given a valid LinkedIn/GitHub/website URL, When the CV is rendered, Then the link appears consistently in HTML and PDF preview where supported.
- **AC-005**: Given an existing database with only `CvProfile.basics`, When the app starts after migration, Then existing basics data is preserved.
- **AC-006**: Given a branch version with no personal data override, When canonical personal data changes, Then the branch reflects the canonical value.
- **AC-009**: Given a branch version with a personal data override, When canonical personal data changes, Then the overridden fields remain version-specific and non-overridden fields still inherit canonical values.
- **AC-010**: Given a branch version with personal data overrides, When the user clears those overrides, Then the version returns to using canonical personal data.
- **AC-007**: Given personal data is changed, When the preview refreshes, Then HTML preview and PDF preview use the same resolved data.
- **AC-008**: Given the user has unsaved personal data changes, When navigating between CV versions, Then changes are not silently lost.

## 6. Test Automation Strategy

- **Test Levels**: Unit, integration, and focused UI/component tests.
- **Frameworks**: Vitest for shared logic. Existing React/Vite stack should be used for UI tests if added.
- **Shared Unit Tests**:
  - Validate personal data normalization.
  - Validate legacy `BasicsSection` to target personal data migration.
  - Validate renderable personal-info mapping.
- **API Integration Tests**:
  - Bootstrap with empty database.
  - Bootstrap with legacy profile JSON.
  - Save and retrieve personal data.
  - Reject invalid personal data where validation is API-owned.
- **Frontend Tests**:
  - Edit personal data fields.
  - Dirty state after changes.
  - Save success/error behavior.
  - Preview receives updated personal data.
- **Regression Tests**:
  - Existing version inheritance tests must continue passing.
  - Existing renderable CV tests must continue passing.

## 7. Rationale & Context

CV Control already has the correct foundation: reusable structured profile content, version-specific selection, and shared renderable contracts. The main risk in adding features is collapsing settings, identity data, and CV content into one mutable blob.

The user-visible complaint is that personal data has no obvious place to live or be managed. Although current `basics` data is editable and persisted through `PUT /api/profile`, it is presented as a rendered CV section rather than as canonical profile contact data. The first implementation keeps the storage model small, but clarifies the UX and inheritance behavior.

- Email, phone, location, LinkedIn, and website are canonical profile contact fields.
- The system has one local profile and no account/user layer.
- A CV version may override contact fields, but it inherits canonical contact fields by default.
- Personal links remain fixed fields for now.

## 8. Dependencies & External Integrations

### External Systems

- **EXT-001**: None required for the current local-first system.

### Third-Party Services

- **SVC-001**: None required for personal data storage.

### Infrastructure Dependencies

- **INF-001**: SQLite database stored under `apps/api/data`.
- **INF-002**: Local Node API server.

### Data Dependencies

- **DAT-001**: Existing `cv_profiles.data_json` records may contain legacy `basics` data.
- **DAT-002**: Existing `cv_versions.data_json` records may contain version selections referencing existing profile item IDs.

### Technology Platform Dependencies

- **PLT-001**: TypeScript shared package for contracts.
- **PLT-002**: React/Vite frontend.
- **PLT-003**: Express API.
- **PLT-004**: Tectonic PDF renderer for final preview.

### Compliance Dependencies

- **COM-001**: Personal data should be treated as sensitive local user data even if the app is currently single-user and local-only.

## 9. Examples & Edge Cases

### Legacy Migration Example

```ts
const legacyBasics = {
  fullName: "Dominik Wujek",
  location: "London, UK",
  email: "dominik@example.com",
  phone: "+44 7000 000000",
  linkedIn: "linkedin.com/in/dominikwujek",
  website: "dominikwujek.dev"
};
```

If migrating to `PersonIdentity`, the system should map:

- `fullName` to `displayName`.
- `location` to `location`.
- `email` to `email`.
- `phone` to `phone`.
- `linkedIn` to a `PersonLink` with `kind: "linkedin"`.
- `website` to a `PersonLink` with `kind: "website"`.

### Edge Cases

- Empty email should be allowed if the user does not want email rendered.
- Invalid URL should be reported before save or before render.
- Duplicate personal links should be allowed only if labels or URLs differ intentionally.
- Removing a link used by a template should not crash rendering.
- A branch version may need different contact details for public portfolio vs private application workflows. This is a product decision.

## 10. Validation Criteria

- All TypeScript builds pass.
- Existing shared tests pass.
- New personal data tests pass.
- Existing saved databases bootstrap without data loss.
- HTML and PDF previews show consistent contact data.
- No render path directly depends on frontend-only state.
- The UI exposes personal data management in a place users can discover without selecting the rendered personal-info section first.

## 11. Related Specifications / Further Reading

- `tests/docz/structured-cv-builder-idea.md`
- `tests/docz/structured-cv-builder-implementation.md`
- `packages/shared/src/types/cv.ts`
- `packages/shared/src/types/version.ts`
- `packages/shared/src/logic/buildRenderableCv.ts`
- `apps/api/src/db/sqlite.ts`
- `apps/web/src/stores/editorStore.ts`

## 12. Open Product Questions

- **Q-001**: Should personal data live in a dedicated settings/profile panel, in the existing editor, or both?
- **Q-002**: Should saves remain manual for the whole editor, or should personal data autosave separately from CV content?
- **Q-003**: How should future imports handle contact data conflicts?
