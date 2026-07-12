import type { CvProfile } from "@cv-control/shared";
import { useState } from "react";
import {
  ProfileContentEditor,
  type ProfileContentSection
} from "../../components/profile/ProfileContentEditor";
import { useEditorStore } from "../../stores/editorStore";
import styles from "./ProfileView.module.css";

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

type ProfileSection = "personal" | ProfileContentSection;

const NAV_ITEMS: ReadonlyArray<{ key: ProfileSection; label: string }> = [
  { key: "personal", label: "Personal details" },
  { key: "summary", label: "Summary" },
  { key: "experience", label: "Experience" },
  { key: "education", label: "Education" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" }
];

export function ProfileView() {
  const [section, setSection] = useState<ProfileSection>("personal");
  const profile = useEditorStore((state) => state.profile);
  const saveState = useEditorStore((state) => state.saveState);
  const errorMessage = useEditorStore((state) => state.errorMessage);
  const hasUnsavedChanges = useEditorStore((state) => state.dirtySidebarKeys.length > 0);
  const persistDrafts = useEditorStore((state) => state.persistDrafts);
  const store = useEditorStore();

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
          <h1>Profile</h1>
          <p>
            Your master career data. Every CV is built by selecting from what you keep here — edit it once,
            reuse it everywhere.
          </p>
        </div>
        <div className={styles.headerActions}>
          {saveState === "error" && errorMessage ? (
            <span className={styles.errorText}>{errorMessage}</span>
          ) : (
            <span className={styles.statusText}>
              {hasUnsavedChanges ? "Unsaved changes" : saveState === "saved" ? "Saved" : ""}
            </span>
          )}
          <button
            type="button"
            className={styles.saveButton}
            disabled={saveState === "saving" || !hasUnsavedChanges}
            onClick={() => void persistDrafts()}
          >
            {saveState === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sideNav} aria-label="Profile sections">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.key === section ? styles.navItemActive : styles.navItem}
              aria-current={item.key === section ? "true" : undefined}
              onClick={() => setSection(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          {section === "personal" ? (
            <section className={styles.formPanel} aria-label="Personal details">
              <p className={styles.sectionIntro}>
                Shared by every CV. These feed the header of the generated document; empty fields are left out.
              </p>
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
                      onChange={(event) => store.updateCanonicalBasicsField(field, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </section>
          ) : (
            <ProfileContentEditor
              section={section}
              profile={profile}
              onUpdateSummary={store.updateCanonicalSummary}
              onUpdateSummaryLinkUrl={store.updateCanonicalSummaryLinkUrl}
              onUpdateEducationEntry={store.updateEducationEntry}
              onUpdateExperienceEntry={store.updateExperienceEntry}
              onUpdateProjectEntry={store.updateProjectEntry}
              onUpdateProjectDescriptionLinkUrl={store.updateProjectDescriptionLinkUrl}
              onAddEntryLink={store.addEntryLink}
              onUpdateEntryLink={store.updateEntryLink}
              onRemoveEntryLink={store.removeEntryLink}
              onUpdateSkillGroupName={store.updateSkillGroupName}
              onUpdateSkillItem={store.updateSkillItem}
              onAddSkillItem={store.addSkillItem}
              onRemoveSkillItem={store.removeSkillItem}
              onAddEntry={store.addEntry}
              onRemoveEntry={store.removeEntry}
              onAddBullet={store.addBullet}
              onUpdateBullet={store.updateBullet}
              onUpdateBulletLinkUrl={store.updateBulletLinkUrl}
              onRemoveBullet={store.removeBullet}
            />
          )}
        </div>
      </div>
    </div>
  );
}
