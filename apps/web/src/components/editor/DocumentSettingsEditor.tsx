import type {
  CvVersion,
  DocumentSpacingSettings,
  DocumentTemplate,
  DocumentTypographySettings
} from "@cv-control/shared";
import { resolveDocumentStyle } from "@cv-control/shared";
import styles from "./DocumentSettingsEditor.module.css";

interface TokenFieldProps {
  label: string;
  hint: string;
  unit: string;
  value: number;
  defaultValue: number;
  step: number;
  min?: number;
  onChange: (value: number | null) => void;
  onReset: () => void;
  isOverridden: boolean;
}

function TokenField({
  label,
  hint,
  unit,
  value,
  defaultValue,
  step,
  min,
  onChange,
  onReset,
  isOverridden
}: TokenFieldProps) {
  const fieldId = `document-token-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className={isOverridden ? `${styles.field} ${styles.fieldOverridden}` : styles.field}>
      <div className={styles.fieldHeader}>
        <div className={styles.fieldLabel}>
          <label htmlFor={fieldId}>{label}</label>
          <span className={styles.stateBadge}>{isOverridden ? "Custom" : "Template"}</span>
        </div>
        <small>{hint}</small>
      </div>
      <div className={styles.fieldControl}>
        <input
          id={fieldId}
          className={styles.valueInput}
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(event) => {
            const nextValue = event.target.value.trim();
            onChange(nextValue === "" ? null : Number(nextValue));
          }}
        />
        {unit ? <span className={styles.unit}>{unit}</span> : null}
        <button
          type="button"
          className={styles.resetButton}
          onClick={onReset}
          disabled={!isOverridden}
        >
          Reset
        </button>
      </div>
      {isOverridden ? (
        <div className={styles.fieldFooter}>
          <span className={styles.defaultMeta}>{`Template default ${defaultValue}${unit}`}</span>
        </div>
      ) : null}
    </div>
  );
}

interface DocumentSettingsEditorProps {
  version: CvVersion;
  template: DocumentTemplate;
  sourceState: "baseline" | "inherited" | "custom";
  onUpdateTypography: (field: keyof DocumentTypographySettings, value: number | null) => void;
  onUpdateSpacing: (field: keyof DocumentSpacingSettings, value: number | null) => void;
}

export function DocumentSettingsEditor({
  version,
  template,
  sourceState,
  onUpdateTypography,
  onUpdateSpacing
}: DocumentSettingsEditorProps) {
  const resolvedStyle = resolveDocumentStyle(template, version.documentStyleOverrides);
  const typographyOverrides = version.documentStyleOverrides?.typography ?? {};
  const spacingOverrides = version.documentStyleOverrides?.spacing ?? {};

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <div>
          <h2>Document Settings</h2>
          <p>Template and style settings for this CV.</p>
        </div>
        <div className={styles.headerActions}>
          <span className={sourceState === "custom" ? styles.customBadge : styles.sourceBadge}>
            {sourceState}
          </span>
          <div className={styles.templateMeta}>
            <span>Template</span>
            <strong>{template.name}</strong>
          </div>
        </div>
      </header>

      <section className={styles.group}>
        <div className={styles.groupHeader}>
          <h3>Typography</h3>
          <p>Control the main text hierarchy without hard-coding a new template.</p>
        </div>
        <div className={styles.fieldGrid}>
          <TokenField
            label="Name heading"
            hint="Top header name"
            unit="pt"
            value={resolvedStyle.typography.nameSizePt}
            defaultValue={template.styleDefaults.typography.nameSizePt}
            step={0.1}
            min={10}
            isOverridden={typographyOverrides.nameSizePt !== undefined}
            onChange={(value) => onUpdateTypography("nameSizePt", value)}
            onReset={() => onUpdateTypography("nameSizePt", null)}
          />
          <TokenField
            label="Body text"
            hint="General paragraph copy"
            unit="pt"
            value={resolvedStyle.typography.bodySizePt}
            defaultValue={template.styleDefaults.typography.bodySizePt}
            step={0.1}
            min={7}
            isOverridden={typographyOverrides.bodySizePt !== undefined}
            onChange={(value) => onUpdateTypography("bodySizePt", value)}
            onReset={() => onUpdateTypography("bodySizePt", null)}
          />
          <TokenField
            label="Section titles"
            hint="Education, Experience, Projects"
            unit="pt"
            value={resolvedStyle.typography.sectionTitleSizePt}
            defaultValue={template.styleDefaults.typography.sectionTitleSizePt}
            step={0.1}
            min={7}
            isOverridden={typographyOverrides.sectionTitleSizePt !== undefined}
            onChange={(value) => onUpdateTypography("sectionTitleSizePt", value)}
            onReset={() => onUpdateTypography("sectionTitleSizePt", null)}
          />
          <TokenField
            label="Sublabels"
            hint="Grades, locations, technology labels"
            unit="pt"
            value={resolvedStyle.typography.metaSizePt}
            defaultValue={template.styleDefaults.typography.metaSizePt}
            step={0.1}
            min={6}
            isOverridden={typographyOverrides.metaSizePt !== undefined}
            onChange={(value) => onUpdateTypography("metaSizePt", value)}
            onReset={() => onUpdateTypography("metaSizePt", null)}
          />
          <TokenField
            label="Contact bar"
            hint="Header contact line"
            unit="pt"
            value={resolvedStyle.typography.contactBarSizePt}
            defaultValue={template.styleDefaults.typography.contactBarSizePt}
            step={0.1}
            min={5}
            isOverridden={typographyOverrides.contactBarSizePt !== undefined}
            onChange={(value) => onUpdateTypography("contactBarSizePt", value)}
            onReset={() => onUpdateTypography("contactBarSizePt", null)}
          />
        </div>
      </section>

      <section className={styles.group}>
        <div className={styles.groupHeader}>
          <h3>Spacing</h3>
          <p>Use compact overrides before reaching for a new full template variant.</p>
        </div>
        <div className={styles.fieldGrid}>
          <TokenField
            label="Line height"
            hint="Global text leading"
            unit=""
            value={resolvedStyle.spacing.lineHeight}
            defaultValue={template.styleDefaults.spacing.lineHeight}
            step={0.01}
            min={0.9}
            isOverridden={spacingOverrides.lineHeight !== undefined}
            onChange={(value) => onUpdateSpacing("lineHeight", value)}
            onReset={() => onUpdateSpacing("lineHeight", null)}
          />
          <TokenField
            label="Section gap"
            hint="Space between major sections"
            unit="mm"
            value={resolvedStyle.spacing.sectionGapMm}
            defaultValue={template.styleDefaults.spacing.sectionGapMm}
            step={0.1}
            min={0}
            isOverridden={spacingOverrides.sectionGapMm !== undefined}
            onChange={(value) => onUpdateSpacing("sectionGapMm", value)}
            onReset={() => onUpdateSpacing("sectionGapMm", null)}
          />
          <TokenField
            label="Item gap"
            hint="Space between entries in a section"
            unit="mm"
            value={resolvedStyle.spacing.itemGapMm}
            defaultValue={template.styleDefaults.spacing.itemGapMm}
            step={0.1}
            min={0}
            isOverridden={spacingOverrides.itemGapMm !== undefined}
            onChange={(value) => onUpdateSpacing("itemGapMm", value)}
            onReset={() => onUpdateSpacing("itemGapMm", null)}
          />
          <TokenField
            label="Bullet gap"
            hint="Space between bullet rows"
            unit="mm"
            value={resolvedStyle.spacing.bulletGapMm}
            defaultValue={template.styleDefaults.spacing.bulletGapMm}
            step={0.05}
            min={0}
            isOverridden={spacingOverrides.bulletGapMm !== undefined}
            onChange={(value) => onUpdateSpacing("bulletGapMm", value)}
            onReset={() => onUpdateSpacing("bulletGapMm", null)}
          />
        </div>
      </section>
    </section>
  );
}
