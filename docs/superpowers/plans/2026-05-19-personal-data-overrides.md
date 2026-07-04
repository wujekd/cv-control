# Personal Data Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make personal contact data feel like a first-class part of the tool by keeping one canonical profile, allowing CV versions to override contact fields, and improving the editor UI around that workflow.

**Architecture:** Keep canonical personal data in `CvProfile.basics` because this is a single-user local tool and the current render contract already uses `BasicsSection`. Add `contentOverrides.basics` to `CvVersion`, resolve it in shared inheritance logic, and expose the behavior in the existing editor with a clearer personal-data panel.

**Tech Stack:** TypeScript, React, Vite, Zustand, Express, SQLite JSON persistence, Vitest, CSS modules.

---

## File Structure

- Modify `packages/shared/src/types/version.ts`
  - Add `basics?: Partial<BasicsSection>` to `CvVersionContentOverrides`.
  - Add `basics?: boolean` to `CvVersionInheritanceState`.
- Modify `packages/shared/src/logic/versionInheritance.ts`
  - Initialize `basics: false` in inherited local overrides.
  - Add `markBasicsLocal(version)`.
  - Merge parent/canonical basics with version override basics in `resolveCvProfileForVersion(...)`.
- Modify `packages/shared/src/__tests__/versionInheritance.test.ts`
  - Add tests for inherited basics, partial basics overrides, and clearing override behavior.
- Modify `packages/shared/src/index.ts`
  - Export `markBasicsLocal`.
- Modify `apps/web/src/stores/editorStore.ts`
  - Add `updateCanonicalBasicsField`, `updateVersionBasicsField`, and `clearVersionBasicsOverrides`.
  - Keep `updateBasicsField` as a compatibility wrapper only if needed by current component props.
  - Make personal-info dirty state respond to canonical and version override changes.
- Modify `apps/web/src/views/EditorView/EditorView.tsx`
  - Pass both canonical profile and effective profile into the personal data editor.
  - Compute personal-info source state from `localOverrides.basics`.
- Modify `apps/web/src/components/editor/MasterContentEditor.tsx`
  - Replace the current simple personal-info grid with a clearer canonical/override workflow.
  - Keep all controls labelled, named, typed, and accessible.
- Modify `apps/web/src/components/editor/MasterContentEditor.module.css`
  - Add restrained two-zone personal data styling without nested cards.
- Modify `spec/design-cv-control-system.md`
  - Keep decisions synchronized with final behavior.

## UI Design Decisions

- Personal data remains available from the `Personal Info` section because it maps directly to the rendered header.
- The panel shows two compact zones:
  - `Profile Defaults`: canonical fields shared by all CV versions.
  - `This CV`: override controls for the active CV version.
- Baseline versions can edit profile defaults but do not need override controls.
- Branch versions show an override toggle per field. When off, the field inherits the profile default. When on, the version-specific input becomes editable.
- A single `Use Profile Defaults` button clears all personal-data overrides for the active branch.
- Field set for this milestone:
  - Full name
  - Location
  - Email
  - Phone number
  - LinkedIn
  - Web address
- Validation should be lightweight:
  - Email inputs use `type="email"` and `spellCheck={false}`.
  - Phone uses `type="tel"`.
  - LinkedIn and website use `type="url"`.
  - Empty optional fields are valid.

## Task 1: Shared Version Contract

**Files:**
- Modify: `packages/shared/src/types/version.ts`
- Modify: `packages/shared/src/logic/versionInheritance.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/__tests__/versionInheritance.test.ts`

- [ ] **Step 1: Write the failing basics inheritance tests**

Add these tests to `packages/shared/src/__tests__/versionInheritance.test.ts`:

```ts
it("inherits canonical basics when a branch has no basics override", () => {
  const parent: CvVersion = {
    ...SAMPLE_VERSION,
    id: "parent",
    name: "Parent"
  };
  const child: CvVersion = {
    ...SAMPLE_VERSION,
    id: "child",
    name: "Child",
    parentVersionId: parent.id,
    localOverrides: createInheritedLocalOverrides(),
    contentOverrides: {
      basics: {
        email: "branch@example.com"
      }
    }
  };

  const resolvedVersion = resolveCvVersionInheritance([parent, child], child.id);
  if (!resolvedVersion) {
    throw new Error("Version missing");
  }

  const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, resolvedVersion);

  expect(resolvedProfile.basics.email).toBe(SAMPLE_PROFILE.basics.email);
});

it("applies partial basics overrides when a branch marks basics local", () => {
  const parent: CvVersion = {
    ...SAMPLE_VERSION,
    id: "parent",
    name: "Parent"
  };
  const child: CvVersion = markBasicsLocal({
    ...SAMPLE_VERSION,
    id: "child",
    name: "Child",
    parentVersionId: parent.id,
    localOverrides: createInheritedLocalOverrides(),
    contentOverrides: {
      basics: {
        email: "branch@example.com",
        website: "branch.example.com"
      }
    }
  });

  const resolvedVersion = resolveCvVersionInheritance([parent, child], child.id);
  if (!resolvedVersion) {
    throw new Error("Version missing");
  }

  const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, resolvedVersion);

  expect(resolvedProfile.basics.fullName).toBe(SAMPLE_PROFILE.basics.fullName);
  expect(resolvedProfile.basics.email).toBe("branch@example.com");
  expect(resolvedProfile.basics.website).toBe("branch.example.com");
});
```

- [ ] **Step 2: Run the shared test and verify it fails**

Run:

```bash
npm run test --workspace @cv-control/shared -- versionInheritance
```

Expected: fail because `markBasicsLocal` is not exported and `contentOverrides.basics` is not typed/resolved.

- [ ] **Step 3: Add basics override types**

In `packages/shared/src/types/version.ts`, change the imports and interfaces:

```ts
import type { BasicsSection, SummarySection } from "./cv";
```

```ts
export interface CvVersionInheritanceState {
  documentTemplateId?: boolean;
  documentStyleOverrides?: boolean;
  sectionOrder?: boolean;
  summary?: boolean;
  basics?: boolean;
  sections?: Partial<Record<SectionType, boolean>>;
}

export interface CvVersionContentOverrides {
  summary?: SummarySection | null;
  basics?: Partial<BasicsSection>;
}
```

- [ ] **Step 4: Implement basics override resolution**

In `packages/shared/src/logic/versionInheritance.ts`, update `createInheritedLocalOverrides()`:

```ts
export function createInheritedLocalOverrides(): CvVersion["localOverrides"] {
  return {
    documentTemplateId: false,
    documentStyleOverrides: false,
    sectionOrder: false,
    summary: false,
    basics: false,
    sections: SECTION_TYPES.reduce<NonNullable<CvVersion["localOverrides"]>["sections"]>(
      (sections, sectionType) => ({
        ...sections,
        [sectionType]: false
      }),
      {}
    )
  };
}
```

Add:

```ts
export function markBasicsLocal(version: CvVersion): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      basics: true
    }
  };
}
```

Update the inherited `contentOverrides` merge:

```ts
contentOverrides: {
  ...inherited.contentOverrides,
  ...(localOverrides?.summary === true
    ? { summary: current.contentOverrides?.summary ?? null }
    : {}),
  ...(localOverrides?.basics === true
    ? { basics: current.contentOverrides?.basics ?? {} }
    : {})
},
```

Update `resolveCvProfileForVersion(...)`:

```ts
export function resolveCvProfileForVersion(profile: CvProfile, version: CvVersion): CvProfile {
  const hasSummaryOverride = Boolean(version.contentOverrides && "summary" in version.contentOverrides);
  const hasBasicsOverride = Boolean(version.contentOverrides && "basics" in version.contentOverrides);

  if (!hasSummaryOverride && !hasBasicsOverride) {
    return profile;
  }

  return {
    ...profile,
    ...(hasSummaryOverride ? { summary: version.contentOverrides?.summary ?? null } : {}),
    ...(hasBasicsOverride
      ? {
          basics: {
            ...profile.basics,
            ...version.contentOverrides?.basics
          }
        }
      : {})
  };
}
```

- [ ] **Step 5: Export the helper**

In `packages/shared/src/index.ts`, ensure `markBasicsLocal` is exported via the existing version-inheritance export line.

- [ ] **Step 6: Run the shared tests**

Run:

```bash
npm run test --workspace @cv-control/shared
```

Expected: pass.

## Task 2: Store Actions for Canonical and Version Personal Data

**Files:**
- Modify: `apps/web/src/stores/editorStore.ts`

- [ ] **Step 1: Import `markBasicsLocal`**

Update the shared import block in `apps/web/src/stores/editorStore.ts` to include:

```ts
markBasicsLocal,
```

- [ ] **Step 2: Extend the store interface**

Replace the existing basics updater signature:

```ts
updateBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
```

with:

```ts
updateCanonicalBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
updateVersionBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
clearVersionBasicsOverrides: () => void;
```

- [ ] **Step 3: Rename canonical update implementation**

Rename `updateBasicsField(field, value)` to `updateCanonicalBasicsField(field, value)` and keep the body updating `state.profile.basics`.

- [ ] **Step 4: Add version override update implementation**

Add this store action after `updateCanonicalBasicsField`:

```ts
updateVersionBasicsField(field, value) {
  set((state) => {
    const activeVersion = findActiveVersion(state);
    if (!activeVersion) {
      return {};
    }

    return {
      ...updateActiveVersion(state, (version) =>
        markBasicsLocal({
          ...version,
          contentOverrides: {
            ...version.contentOverrides,
            basics: {
              ...version.contentOverrides?.basics,
              [field]: value
            }
          }
        })
      ),
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["personalInfo"]),
      saveState: "idle"
    };
  });
},
```

- [ ] **Step 5: Add clear overrides implementation**

Add:

```ts
clearVersionBasicsOverrides() {
  set((state) => {
    const activeVersion = findActiveVersion(state);
    if (!activeVersion) {
      return {};
    }

    return {
      ...updateActiveVersion(state, (version) => ({
        ...version,
        localOverrides: {
          ...version.localOverrides,
          basics: false
        },
        contentOverrides: {
          ...version.contentOverrides,
          basics: undefined
        }
      })),
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["personalInfo"]),
      saveState: "idle"
    };
  });
},
```

- [ ] **Step 6: Run typecheck/build**

Run:

```bash
npm run build --workspace @cv-control/web
```

Expected: fail until component props are updated in Task 3.

## Task 3: Personal Info UI Flow

**Files:**
- Modify: `apps/web/src/views/EditorView/EditorView.tsx`
- Modify: `apps/web/src/components/editor/MasterContentEditor.tsx`
- Modify: `apps/web/src/components/editor/MasterContentEditor.module.css`

- [ ] **Step 1: Update editor view store bindings**

In `apps/web/src/views/EditorView/EditorView.tsx`, replace:

```ts
updateBasicsField,
```

with:

```ts
updateCanonicalBasicsField,
updateVersionBasicsField,
clearVersionBasicsOverrides,
```

Update `inheritanceState.personalInfo` so it uses `localOverrides.basics`:

```ts
personalInfo: activeStoredVersion?.parentVersionId
  ? activeStoredVersion.localOverrides?.basics
    ? "custom"
    : "inherited"
  : "baseline",
```

- [ ] **Step 2: Pass canonical and override props**

Update `MasterContentEditor` usage:

```tsx
<MasterContentEditor
  canonicalProfile={profile}
  profile={effectiveProfile}
  version={activeVersion}
  sectionType={selectedSidebarKey}
  sourceState={inheritanceState[selectedSidebarKey] ?? "baseline"}
  dirtyItemIds={...}
  onUpdateCanonicalBasicsField={updateCanonicalBasicsField}
  onUpdateVersionBasicsField={updateVersionBasicsField}
  onClearVersionBasicsOverrides={clearVersionBasicsOverrides}
  ...
/>
```

- [ ] **Step 3: Update component props**

In `MasterContentEditor.tsx`, add:

```ts
canonicalProfile: CvProfile;
onUpdateCanonicalBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
onUpdateVersionBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
onClearVersionBasicsOverrides: () => void;
```

Remove:

```ts
onUpdateBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
```

- [ ] **Step 4: Replace personal-info render block**

Replace the `sectionType === "personalInfo"` block with a two-zone panel:

```tsx
if (sectionType === "personalInfo") {
  const isBranch = Boolean(version.parentVersionId);
  const basicsFields = [
    { field: "fullName", label: "Full Name", type: "text", autoComplete: "name" },
    { field: "location", label: "Location", type: "text", autoComplete: "address-level2" },
    { field: "email", label: "Email", type: "email", autoComplete: "email" },
    { field: "phone", label: "Phone Number", type: "tel", autoComplete: "tel" },
    { field: "linkedIn", label: "LinkedIn", type: "url", autoComplete: "url" },
    { field: "website", label: "Web Address", type: "url", autoComplete: "url" }
  ] as const;
  const basicsOverrides = version.contentOverrides?.basics ?? {};
  const hasBasicsOverrides = Object.values(basicsOverrides).some((value) => value !== undefined);

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h2>Personal Info</h2>
          {sourceBadge}
        </div>
        <p>Profile defaults are shared by every CV. Branches can override contact details when needed.</p>
      </div>

      <div className={styles.personalDataLayout}>
        <section className={styles.personalZone} aria-labelledby="profile-defaults-title">
          <div className={styles.zoneHeader}>
            <h3 id="profile-defaults-title">Profile Defaults</h3>
            <span>Shared</span>
          </div>
          <div className={styles.grid}>
            {basicsFields.map(({ field, label, type, autoComplete }) => (
              <label key={field} className={styles.field}>
                <span>{label}</span>
                <input
                  name={`profile-${field}`}
                  autoComplete={autoComplete}
                  spellCheck={field === "email" ? false : undefined}
                  type={type}
                  value={canonicalProfile.basics[field] ?? ""}
                  onChange={(event) => onUpdateCanonicalBasicsField(field, event.target.value)}
                />
              </label>
            ))}
          </div>
        </section>

        {isBranch ? (
          <section className={styles.personalZone} aria-labelledby="version-overrides-title">
            <div className={styles.zoneHeader}>
              <h3 id="version-overrides-title">This CV</h3>
              <button
                type="button"
                className={styles.textButton}
                disabled={!hasBasicsOverrides}
                onClick={onClearVersionBasicsOverrides}
              >
                Use Profile Defaults
              </button>
            </div>
            <div className={styles.overrideGrid}>
              {basicsFields.map(({ field, label, type, autoComplete }) => {
                const isOverridden = basicsOverrides[field] !== undefined;
                return (
                  <label key={field} className={styles.overrideField}>
                    <span className={styles.overrideToggle}>
                      <input
                        type="checkbox"
                        checked={isOverridden}
                        onChange={(event) => {
                          onUpdateVersionBasicsField(
                            field,
                            event.target.checked ? profile.basics[field] ?? "" : canonicalProfile.basics[field] ?? ""
                          );
                        }}
                      />
                      <span>{label}</span>
                    </span>
                    <input
                      name={`version-${field}`}
                      autoComplete={autoComplete}
                      spellCheck={field === "email" ? false : undefined}
                      type={type}
                      disabled={!isOverridden}
                      value={isOverridden ? basicsOverrides[field] ?? "" : canonicalProfile.basics[field] ?? ""}
                      onChange={(event) => onUpdateVersionBasicsField(field, event.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add CSS for the new layout**

Add to `MasterContentEditor.module.css`:

```css
.personalDataLayout {
  display: grid;
  gap: 1rem;
}

.personalZone {
  display: grid;
  gap: 0.875rem;
  padding-block: 0.25rem;
}

.zoneHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-width: 0;
}

.zoneHeader h3 {
  margin: 0;
  font-size: 0.92rem;
  text-wrap: balance;
}

.zoneHeader span {
  color: var(--color-muted);
  font-size: 0.78rem;
}

.textButton {
  border: 0;
  background: transparent;
  color: var(--color-accent);
  cursor: pointer;
  font: inherit;
  padding: 0.25rem 0;
}

.textButton:disabled {
  color: var(--color-muted);
  cursor: default;
}

.textButton:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
}

.overrideGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.overrideField {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

.overrideToggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-muted);
  font-size: 0.78rem;
}

.overrideToggle input {
  margin: 0;
}

@media (max-width: 860px) {
  .overrideGrid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 6: Run web build**

Run:

```bash
npm run build --workspace @cv-control/web
```

Expected: pass or expose remaining prop/type mismatches to fix in this task.

## Task 4: Remove Empty Override Keys Correctly

**Files:**
- Modify: `apps/web/src/stores/editorStore.ts`
- Test: `packages/shared/src/__tests__/versionInheritance.test.ts`

- [ ] **Step 1: Add test for clearing a single override field**

Add:

```ts
it("removes a basics field override by omitting that field from the override object", () => {
  const child = markBasicsLocal({
    ...SAMPLE_VERSION,
    id: "child",
    name: "Child",
    parentVersionId: "parent",
    localOverrides: createInheritedLocalOverrides(),
    contentOverrides: {
      basics: {
        email: undefined,
        website: "branch.example.com"
      }
    }
  });

  const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, child);

  expect(resolvedProfile.basics.email).toBe(SAMPLE_PROFILE.basics.email);
  expect(resolvedProfile.basics.website).toBe("branch.example.com");
});
```

- [ ] **Step 2: Update resolver to ignore undefined override values**

In `resolveCvProfileForVersion(...)`, replace the basics merge with:

```ts
const definedBasicsOverrides = Object.fromEntries(
  Object.entries(version.contentOverrides?.basics ?? {}).filter(([, value]) => value !== undefined)
) as Partial<CvProfile["basics"]>;
```

and:

```ts
basics: {
  ...profile.basics,
  ...definedBasicsOverrides
}
```

- [ ] **Step 3: Update checkbox off behavior**

In `MasterContentEditor.tsx`, when a version override checkbox is unchecked, call:

```ts
onUpdateVersionBasicsField(field, undefined as unknown as string);
```

Then immediately refactor the store action signature from `value: string` to `value: string | undefined` so the cast is removed:

```ts
updateVersionBasicsField: (field: keyof CvProfile["basics"], value: string | undefined) => void;
```

and the component prop:

```ts
onUpdateVersionBasicsField: (field: keyof CvProfile["basics"], value: string | undefined) => void;
```

Use this checkbox handler:

```tsx
onChange={(event) => {
  onUpdateVersionBasicsField(
    field,
    event.target.checked ? profile.basics[field] ?? "" : undefined
  );
}}
```

- [ ] **Step 4: Normalize empty override objects**

In `updateVersionBasicsField`, after building the next basics object, remove keys with `undefined` and set `localOverrides.basics` based on whether any keys remain:

```ts
const nextBasics = {
  ...version.contentOverrides?.basics,
  [field]: value
};
const normalizedBasics = Object.fromEntries(
  Object.entries(nextBasics).filter(([, entryValue]) => entryValue !== undefined)
) as Partial<CvProfile["basics"]>;
const hasBasicsOverrides = Object.keys(normalizedBasics).length > 0;
```

Return:

```ts
{
  ...version,
  localOverrides: {
    ...version.localOverrides,
    basics: hasBasicsOverrides
  },
  contentOverrides: {
    ...version.contentOverrides,
    basics: hasBasicsOverrides ? normalizedBasics : undefined
  }
}
```

- [ ] **Step 5: Run tests and build**

Run:

```bash
npm run test --workspace @cv-control/shared
npm run build --workspace @cv-control/web
```

Expected: both pass.

## Task 5: UI Guideline Review and Polish

**Files:**
- Review: `apps/web/src/components/editor/MasterContentEditor.tsx`
- Review: `apps/web/src/components/editor/MasterContentEditor.module.css`
- Review: `apps/web/src/views/EditorView/EditorView.tsx`

- [ ] **Step 1: Check accessibility rules**

Confirm:

- Every personal data input is inside a clickable `<label>`.
- Every input has a meaningful `name`.
- Email has `type="email"` and `spellCheck={false}`.
- Phone has `type="tel"`.
- URL fields have `type="url"`.
- Buttons use `type="button"`.
- Focus states are visible.

- [ ] **Step 2: Check layout and content rules**

Confirm:

- Long email, URL, or location text does not overflow the panel.
- Responsive layout collapses override fields to one column under `860px`.
- The panel does not use nested cards.
- Copy is direct: `Profile Defaults`, `This CV`, `Use Profile Defaults`.
- No `transition: all` is introduced.

- [ ] **Step 3: Run a local build**

Run:

```bash
npm run build
```

Expected: pass.

## Task 6: Manual Verification

**Files:**
- No source changes expected unless verification exposes defects.

- [ ] **Step 1: Start the API**

Run:

```bash
npm run dev:api
```

Expected: API listens on `http://localhost:4000`.

- [ ] **Step 2: Start the web app**

Run:

```bash
npm run dev:web
```

Expected: web app listens on Vite’s local URL.

- [ ] **Step 3: Verify canonical personal data**

In the app:

- Open the editor.
- Select `Personal Info`.
- Change `Email` in `Profile Defaults`.
- Save.
- Refresh the page.

Expected:

- The changed email remains.
- The preview header uses the changed email.

- [ ] **Step 4: Verify branch override behavior**

In the app:

- Branch the active CV.
- Open `Personal Info`.
- Enable the email override under `This CV`.
- Enter a different email.
- Save.
- Switch back to the baseline version.

Expected:

- The branch preview shows the branch email.
- The baseline preview shows the profile default email.

- [ ] **Step 5: Verify clearing overrides**

In the branch:

- Click `Use Profile Defaults`.
- Save.

Expected:

- The branch preview returns to the profile default contact data.
- The `Personal Info` source badge returns to inherited state.

## Self-Review

- Spec coverage: The plan implements single local profile behavior, canonical personal data, per-version override support, persistence through existing profile/version saves, render resolution through shared logic, and UI guideline-driven polish.
- Placeholder scan: The plan does not include unresolved implementation placeholders.
- Type consistency: `BasicsSection`, `CvVersionContentOverrides.basics`, `localOverrides.basics`, and `markBasicsLocal` are used consistently across shared logic, web store, and UI.

