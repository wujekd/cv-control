import type { CvProfile } from "@cv-control/shared";
import { useEditorStore } from "../../stores/editorStore";
import styles from "./MyDataView.module.css";

const BASICS_FIELDS = [
  { field: "fullName", label: "Full Name", type: "text", autoComplete: "name" },
  { field: "location", label: "Location", type: "text", autoComplete: "address-level2" },
  { field: "email", label: "Email", type: "email", autoComplete: "email" },
  { field: "phone", label: "Phone Number", type: "tel", autoComplete: "tel" },
  { field: "linkedIn", label: "LinkedIn", type: "url", autoComplete: "url" },
  { field: "github", label: "GitHub", type: "url", autoComplete: "url" },
  { field: "website", label: "Personal Website", type: "url", autoComplete: "url" }
] as const satisfies ReadonlyArray<{
  field: keyof CvProfile["basics"];
  label: string;
  type: string;
  autoComplete: string;
}>;

export function MyDataView() {
  const profile = useEditorStore((state) => state.profile);
  const saveState = useEditorStore((state) => state.saveState);
  const errorMessage = useEditorStore((state) => state.errorMessage);
  const updateCanonicalBasicsField = useEditorStore((state) => state.updateCanonicalBasicsField);
  const persistDrafts = useEditorStore((state) => state.persistDrafts);

  if (!profile) {
    return (
      <div className={styles.view}>
        <p className={styles.loadingText}>Loading profile…</p>
      </div>
    );
  }

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <div>
          <h1>My Data</h1>
          <p>
            Personal details shared by every CV. These feed the header bar of the generated
            document; empty fields are left out.
          </p>
        </div>
        <div className={styles.headerActions}>
          {saveState === "error" && errorMessage ? (
            <span className={styles.errorText}>{errorMessage}</span>
          ) : null}
          <button
            type="button"
            className={styles.saveButton}
            disabled={saveState === "saving"}
            onClick={() => void persistDrafts()}
          >
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save"}
          </button>
        </div>
      </header>

      <section className={styles.formPanel} aria-label="Personal details">
        <div className={styles.formGrid}>
          {BASICS_FIELDS.map(({ field, label, type, autoComplete }) => (
            <label key={field} className={styles.field}>
              <span>{label}</span>
              <input
                name={`profile-${field}`}
                type={type}
                autoComplete={autoComplete}
                spellCheck={field === "email" ? false : undefined}
                value={profile.basics[field] ?? ""}
                onChange={(event) => updateCanonicalBasicsField(field, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
