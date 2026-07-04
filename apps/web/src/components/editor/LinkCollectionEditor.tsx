import type { LinkRef } from "@cv-control/shared";
import styles from "./MasterContentEditor.module.css";

interface LinkCollectionEditorProps {
  title?: string;
  description?: string;
  links?: LinkRef[];
  onAddLink: () => void;
  onUpdateLink: (linkId: string, patch: Partial<Pick<LinkRef, "label" | "url">>) => void;
  onRemoveLink: (linkId: string) => void;
}

export function LinkCollectionEditor({
  title = "Links",
  description,
  links = [],
  onAddLink,
  onUpdateLink,
  onRemoveLink
}: LinkCollectionEditorProps) {
  return (
    <div className={styles.subsection}>
      <div className={styles.subsectionHeader}>
        <div className={styles.subsectionMeta}>
          <span className={styles.inlineLabel}>{title}</span>
          {description ? <p className={styles.subsectionDescription}>{description}</p> : null}
        </div>
        <button type="button" className={styles.addButton} onClick={onAddLink}>
          <span className={styles.buttonGlyph}>+</span>
          <span>Link</span>
        </button>
      </div>
      {links.length === 0 ? <p className={styles.emptyHint}>No links added yet.</p> : null}
      <div className={styles.linkList}>
        {links.map((link, index) => (
          <div key={link.id} className={styles.linkCard}>
            <div className={styles.linkCardHeader}>
              <span className={styles.inlineLabel}>Link {index + 1}</span>
              <button
                type="button"
                className={styles.removeButton}
                aria-label="Remove link"
                title="Remove link"
                onClick={() => onRemoveLink(link.id)}
              >
                x
              </button>
            </div>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Label</span>
                <input
                  name={`link-label-${link.id}`}
                  autoComplete="off"
                  value={link.label}
                  placeholder="GitHub…"
                  onChange={(event) => onUpdateLink(link.id, { label: event.target.value })}
                />
              </label>
              <label className={styles.field}>
                <span>URL</span>
                <input
                  name={`link-url-${link.id}`}
                  type="url"
                  autoComplete="url"
                  value={link.url}
                  placeholder="github.com/username/repo…"
                  onChange={(event) => onUpdateLink(link.id, { url: event.target.value })}
                />
              </label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
