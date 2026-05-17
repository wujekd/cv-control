import type { RenderDiagnostic } from "@cv-control/shared";
import styles from "./FitDiagnosticsPanel.module.css";

interface FitDiagnosticsPanelProps {
  diagnostics: RenderDiagnostic[];
  htmlOverflowSections: string[];
  onClose?: () => void;
}

export function FitDiagnosticsPanel({
  diagnostics,
  htmlOverflowSections,
  onClose
}: FitDiagnosticsPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2>Fit Diagnostics</h2>
          <p>PDF and HTML fit warnings for the current version.</p>
        </div>
        {onClose ? (
          <button type="button" className={styles.closeButton} onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>
      <div className={styles.stack}>
        {diagnostics.length === 0 && htmlOverflowSections.length === 0 ? (
          <p className={styles.empty}>No fit warnings.</p>
        ) : null}
        {diagnostics.map((diagnostic, index) => (
          <article key={`${diagnostic.code}-${index}`} className={styles.item}>
            <strong>{diagnostic.level}</strong>
            <p>{diagnostic.message}</p>
          </article>
        ))}
        {htmlOverflowSections.map((sectionType) => (
          <article key={sectionType} className={styles.item}>
            <strong>warning</strong>
            <p>HTML preview content expands past the template minimum height for {sectionType}.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
