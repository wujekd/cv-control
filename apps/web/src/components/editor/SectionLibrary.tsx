import type { SectionType } from "@cv-control/shared";
import { REQUIRED_SECTION_TYPES, SECTION_TYPES } from "@cv-control/shared";
import styles from "./SectionLibrary.module.css";

interface SectionLibraryProps {
  enabledSections: SectionType[];
  onToggle: (sectionType: SectionType, enabled: boolean) => void;
}

function formatSectionLabel(sectionType: SectionType) {
  return sectionType === "personalInfo"
    ? "Personal Info"
    : sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
}

export function SectionLibrary({ enabledSections, onToggle }: SectionLibraryProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2>Sections</h2>
      </div>
      <div className={styles.list}>
        {SECTION_TYPES.map((sectionType) => {
          const required = REQUIRED_SECTION_TYPES.includes(sectionType);
          const enabled = enabledSections.includes(sectionType);

          return (
            <label key={sectionType} className={styles.item}>
              <span>
                <strong>{formatSectionLabel(sectionType)}</strong>
                <small>{required ? "Required" : "Optional"}</small>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={required}
                onChange={(event) => onToggle(sectionType, event.target.checked)}
              />
            </label>
          );
        })}
      </div>
    </section>
  );
}
