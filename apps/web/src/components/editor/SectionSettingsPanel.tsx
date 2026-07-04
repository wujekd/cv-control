import { REQUIRED_SECTION_TYPES, type CvVersion, type SectionType } from "@cv-control/shared";
import styles from "./SectionSettingsPanel.module.css";

function formatSectionLabel(sectionType: SectionType) {
  return sectionType === "personalInfo"
    ? "Personal Info"
    : sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
}

interface SectionSettingsPanelProps {
  sectionType: SectionType;
  version: CvVersion;
  sourceState: "baseline" | "inherited" | "custom";
  localAreaCount: number;
  hasUnsavedChanges: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  onSave: () => void;
}

export function SectionSettingsPanel({
  sectionType,
  version,
  sourceState,
  localAreaCount,
  hasUnsavedChanges,
  saveState,
  onSave
}: SectionSettingsPanelProps) {
  const section = version.sections[sectionType];
  const isRequired = REQUIRED_SECTION_TYPES.includes(sectionType);
  const hasItemSelection = sectionType !== "personalInfo" && sectionType !== "summary";
  const hasBulletSelection = sectionType === "education" || sectionType === "experience" || sectionType === "projects";
  const panelClassName = hasUnsavedChanges ? `${styles.panel} ${styles.panelDirty}` : styles.panel;

  return (
    <section className={panelClassName}>
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <h2>{formatSectionLabel(sectionType)}</h2>
          <p>
            {sourceState === "inherited"
              ? "Inherited from parent CV"
              : sourceState === "custom"
                ? "Customized in this CV"
                : "Baseline section"}
          </p>
        </div>
        <div className={styles.headerActions}>
          <span className={sourceState === "custom" ? styles.customBadge : styles.sourceBadge}>
            {sourceState}
          </span>
          {hasUnsavedChanges ? <span className={styles.unsavedBadge}>Unsaved</span> : null}
          {hasUnsavedChanges || saveState === "saving" ? (
            <button
              type="button"
              className={styles.saveButton}
              onClick={onSave}
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </div>
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <span>Status</span>
          <strong>{section.enabled ? (isRequired ? "Required" : "Enabled") : "Disabled"}</strong>
        </div>
        <div className={styles.metric}>
          <span>CV custom</span>
          <strong>{localAreaCount}</strong>
        </div>
        {hasItemSelection ? (
          <div className={styles.metric}>
            <span>Items</span>
            <strong>{section.selectedItemIds.length}</strong>
          </div>
        ) : null}
        {hasBulletSelection ? (
          <div className={styles.metric}>
            <span>Bullets</span>
            <strong>{section.selectedBulletIds.length}</strong>
          </div>
        ) : null}
      </div>
    </section>
  );
}
