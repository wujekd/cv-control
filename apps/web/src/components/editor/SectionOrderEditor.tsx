import type { SectionType } from "@cv-control/shared";
import { REQUIRED_SECTION_TYPES, SECTION_TYPES } from "@cv-control/shared";
import type { EditorSidebarKey } from "../../types/editor";
import styles from "./SectionOrderEditor.module.css";

const SIDEBAR_SECTION_TYPES = SECTION_TYPES.filter((sectionType) => sectionType !== "personalInfo");

interface SectionOrderEditorProps {
  enabledSections: SectionType[];
  sectionOrder: SectionType[];
  selectedSidebarKey: EditorSidebarKey;
  dirtyKeys: EditorSidebarKey[];
  inheritanceState: Partial<Record<EditorSidebarKey, "baseline" | "inherited" | "custom">>;
  onToggle: (sectionType: SectionType, enabled: boolean) => void;
  onSelect: (sectionType: EditorSidebarKey) => void;
  onMove: (sectionType: SectionType, direction: -1 | 1) => void;
}

function formatSectionLabel(sectionType: SectionType) {
  return sectionType === "personalInfo"
    ? "Personal Info"
    : sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
}

function getItemClassName(isSelected: boolean, isDirty: boolean) {
  if (isSelected && isDirty) {
    return styles.selectedDirtyItem;
  }

  if (isSelected) {
    return styles.selectedItem;
  }

  if (isDirty) {
    return styles.dirtyItem;
  }

  return styles.item;
}

export function SectionOrderEditor({
  enabledSections,
  sectionOrder,
  selectedSidebarKey,
  dirtyKeys,
  inheritanceState,
  onToggle,
  onSelect,
  onMove
}: SectionOrderEditorProps) {
  const isDocumentSelected = selectedSidebarKey === "document";
  const isDocumentDirty = dirtyKeys.includes("document");

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2>Menu</h2>
      </div>
      <ol className={styles.list}>
        <li className={getItemClassName(isDocumentSelected, isDocumentDirty)}>
          <button
            type="button"
            className={styles.selectButton}
            aria-current={isDocumentSelected ? "true" : undefined}
            onClick={() => onSelect("document")}
          >
            <span className={styles.selectLabel}>
              Document
              {isDocumentDirty ? <span className={styles.dirtyMarker} /> : null}
              <span className={styles.sourceBadge}>{inheritanceState.document ?? "baseline"}</span>
            </span>
          </button>
        </li>
        {SIDEBAR_SECTION_TYPES.map((sectionType) => {
          const enabled = enabledSections.includes(sectionType);
          const required = REQUIRED_SECTION_TYPES.includes(sectionType);
          const orderIndex = sectionOrder.indexOf(sectionType);
          const topLockedIndex = sectionOrder[0] === "personalInfo" ? 1 : 0;
          const label = formatSectionLabel(sectionType);
          const isSelected = selectedSidebarKey === sectionType;
          const isDirty = dirtyKeys.includes(sectionType);
          const itemClassName = getItemClassName(isSelected, isDirty);

          return (
            <li key={sectionType} className={itemClassName}>
              <button
                type="button"
                className={styles.selectButton}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(sectionType)}
              >
                <span className={styles.selectLabel}>
                  <span>{label}</span>
                  {isDirty ? <span className={styles.dirtyMarker} /> : null}
                  <span className={styles.sourceBadge}>{inheritanceState[sectionType] ?? "baseline"}</span>
                </span>
              </button>
              <div className={styles.controls}>
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={required}
                  aria-label={`${enabled ? "Disable" : "Enable"} ${label}`}
                  onChange={(event) => onToggle(sectionType, event.target.checked)}
                />
                <div className={styles.arrowStack}>
                  <button
                    type="button"
                    aria-label={`Move ${label} up`}
                    disabled={!enabled || orderIndex <= topLockedIndex}
                    onClick={() => onMove(sectionType, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${label} down`}
                    disabled={!enabled || orderIndex === -1 || orderIndex >= sectionOrder.length - 1}
                    onClick={() => onMove(sectionType, 1)}
                  >
                    ↓
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
