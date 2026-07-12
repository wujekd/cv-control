import type {
  CvProfile,
  CvVersion,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SectionType
} from "@cv-control/shared";
import { Link } from "react-router-dom";
import styles from "./VersionContentPanel.module.css";

type ContentSection = Exclude<SectionType, "document">;
type SelectableSection = "education" | "experience" | "projects" | "skills";
type BulletSection = "education" | "experience" | "projects";

const BASICS_FIELDS = [
  { field: "fullName", label: "Full Name", type: "text", autoComplete: "name" },
  { field: "location", label: "Location", type: "text", autoComplete: "address-level2" },
  { field: "email", label: "Email", type: "email", autoComplete: "email" },
  { field: "phone", label: "Phone Number", type: "tel", autoComplete: "tel" },
  { field: "linkedIn", label: "LinkedIn", type: "url", autoComplete: "url" },
  { field: "github", label: "GitHub", type: "url", autoComplete: "url" },
  { field: "website", label: "Web Address", type: "url", autoComplete: "url" }
] as const;

interface VersionContentPanelProps {
  canonicalProfile: CvProfile;
  profile: CvProfile;
  version: CvVersion;
  sectionType: ContentSection;
  sourceState: "baseline" | "inherited" | "custom";
  onToggleItemSelection: (sectionType: SelectableSection, id: string) => void;
  onMoveSelectedItem: (sectionType: SelectableSection, id: string, direction: -1 | 1) => void;
  onToggleBulletSelection: (sectionType: BulletSection, bulletId: string) => void;
  onToggleSkillGroupSelection: (groupId: string) => void;
  onUpdateVersionBasicsField: (field: keyof CvProfile["basics"], value: string | undefined) => void;
  onClearVersionBasicsOverrides: () => void;
  onUpdateSummary: (value: string) => void;
  onUpdateSummaryLinkUrl: (value: string) => void;
}

export function VersionContentPanel(props: VersionContentPanelProps) {
  const { canonicalProfile, profile, version, sectionType, sourceState } = props;
  const isBranch = Boolean(version.parentVersionId);

  const sourceBadge = (
    <span className={sourceState === "custom" ? styles.customBadge : styles.sourceBadge}>{sourceState}</span>
  );

  function ItemSelection({
    itemId,
    section
  }: {
    itemId: string;
    section: SelectableSection;
  }) {
    const selectedItemIds = version.sections[section].selectedItemIds;
    const isSelected = selectedItemIds.includes(itemId);
    const index = selectedItemIds.indexOf(itemId);
    return (
      <div className={styles.arrowStack}>
        <button
          type="button"
          aria-label="Move up"
          disabled={!isSelected || index <= 0}
          onClick={() => props.onMoveSelectedItem(section, itemId, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={!isSelected || index === selectedItemIds.length - 1}
          onClick={() => props.onMoveSelectedItem(section, itemId, 1)}
        >
          ↓
        </button>
      </div>
    );
  }

  if (sectionType === "personalInfo") {
    const basicsOverrides = version.contentOverrides?.basics ?? {};
    const hasBasicsOverrides = Object.keys(basicsOverrides).length > 0;

    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <h2>Personal Info</h2>
              {sourceBadge}
            </div>
            <p>Shared contact details. Edit the defaults in the Profile; a branch can override them here.</p>
          </div>
          <Link className={styles.libraryLink} to="/profile">
            Edit in Profile →
          </Link>
        </div>

        <div className={styles.zone}>
          <div className={styles.zoneHeader}>
            <h3>Profile defaults</h3>
          </div>
          <div className={styles.defaultsGrid}>
            {BASICS_FIELDS.map(({ field, label }) => (
              <div key={field} className={styles.defaultRow}>
                <span>{label}</span>
                <strong>{canonicalProfile.basics[field] || "—"}</strong>
              </div>
            ))}
          </div>
        </div>

        {isBranch ? (
          <div className={styles.zone}>
            <div className={styles.zoneHeader}>
              <h3>This CV overrides</h3>
              <button
                type="button"
                className={styles.textButton}
                disabled={!hasBasicsOverrides}
                onClick={props.onClearVersionBasicsOverrides}
              >
                Use profile defaults
              </button>
            </div>
            <div className={styles.overrideGrid}>
              {BASICS_FIELDS.map(({ field, label, type, autoComplete }) => {
                const isOverridden = basicsOverrides[field] !== undefined;
                return (
                  <label key={field} className={styles.overrideField}>
                    <span className={styles.overrideToggle}>
                      <input
                        type="checkbox"
                        checked={isOverridden}
                        onChange={(event) =>
                          props.onUpdateVersionBasicsField(
                            field,
                            event.target.checked ? profile.basics[field] ?? "" : undefined
                          )
                        }
                      />
                      <span>{label}</span>
                    </span>
                    <input
                      autoComplete={autoComplete}
                      spellCheck={field === "email" ? false : undefined}
                      type={type}
                      disabled={!isOverridden}
                      value={isOverridden ? basicsOverrides[field] ?? "" : canonicalProfile.basics[field] ?? ""}
                      onChange={(event) => props.onUpdateVersionBasicsField(field, event.target.value)}
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  if (sectionType === "summary") {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <h2>Summary</h2>
              {sourceBadge}
            </div>
            <p>
              {isBranch
                ? "This CV can override the profile summary for a specific application."
                : "Summary text comes from the Profile."}
            </p>
          </div>
          <Link className={styles.libraryLink} to="/profile">
            Edit in Profile →
          </Link>
        </div>

        {isBranch ? (
          <>
            <textarea
              className={styles.textarea}
              aria-label="Summary override for this CV"
              value={profile.summary?.text ?? ""}
              onChange={(event) => props.onUpdateSummary(event.target.value)}
            />
            <label className={styles.overrideField}>
              <span>Summary link URL</span>
              <input
                type="url"
                value={profile.summary?.linkUrl ?? ""}
                onChange={(event) => props.onUpdateSummaryLinkUrl(event.target.value)}
              />
            </label>
            <p className={styles.overrideNote}>Editing here overrides the profile summary for this CV only.</p>
          </>
        ) : profile.summary?.text ? (
          <p className={styles.readOnlyText}>{profile.summary.text}</p>
        ) : (
          <p className={styles.emptyHint}>No summary yet. Add one in the Profile.</p>
        )}
      </section>
    );
  }

  if (sectionType === "education" || sectionType === "experience") {
    const items = sectionType === "education" ? profile.education : profile.experience;
    const section = version.sections[sectionType];
    const selectedCount = section.selectedItemIds.length;

    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <h2>{sectionType === "education" ? "Education" : "Experience"}</h2>
              {sourceBadge}
            </div>
            <p>Choose which entries and bullets appear in this CV. Content is edited in the Profile.</p>
          </div>
          <span className={styles.countPill}>
            {selectedCount} of {items.length} shown
          </span>
        </div>

        <div className={styles.stack}>
          {items.length === 0 ? (
            <p className={styles.emptyHint}>
              Nothing in the Profile yet. <Link className={styles.libraryLink} to="/profile">Add {sectionType} →</Link>
            </p>
          ) : null}
          {items.map((entry) => {
            const isSelected = section.selectedItemIds.includes(entry.id);
            const title =
              sectionType === "education"
                ? (entry as EducationEntry).qualification
                : (entry as ExperienceEntry).role;
            const meta =
              sectionType === "education"
                ? (entry as EducationEntry).institution
                : (entry as ExperienceEntry).organisation;
            return (
              <div key={entry.id} className={isSelected ? styles.itemSelected : styles.itemRow}>
                <div className={styles.itemHead}>
                  <label className={styles.itemCheck}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => props.onToggleItemSelection(sectionType, entry.id)}
                    />
                    <span>
                      <strong>{title || "Untitled"}</strong>
                      {meta ? <span className={styles.itemMeta}> — {meta}</span> : null}
                    </span>
                  </label>
                  <ItemSelection itemId={entry.id} section={sectionType} />
                </div>
                {isSelected && (entry.bullets ?? []).length > 0 ? (
                  <div className={styles.bulletList}>
                    {(entry.bullets ?? []).map((bullet) => (
                      <label key={bullet.id} className={styles.bulletCheck}>
                        <input
                          type="checkbox"
                          checked={section.selectedBulletIds.includes(bullet.id)}
                          onChange={() => props.onToggleBulletSelection(sectionType, bullet.id)}
                        />
                        <span className={styles.bulletText}>{bullet.text}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  if (sectionType === "projects") {
    const section = version.sections.projects;
    const selectedIds = section.selectedItemIds;
    const selectedProjects = selectedIds
      .map((id) => profile.projects.find((project) => project.id === id))
      .filter((project): project is ProjectEntry => Boolean(project));
    const availableProjects = profile.projects.filter((project) => !selectedIds.includes(project.id));

    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <div className={styles.titleRow}>
              <h2>Projects</h2>
              {sourceBadge}
            </div>
            <p>Pick which projects this CV includes and reorder them. Project content lives in the Profile.</p>
          </div>
          <span className={styles.countPill}>
            {selectedProjects.length} of {profile.projects.length} shown
          </span>
        </div>

        <div className={styles.columns}>
          <div className={styles.column}>
            <h3>Included</h3>
            <p className={styles.columnHint}>Ordered as they will appear.</p>
            <div className={styles.stack}>
              {selectedProjects.length === 0 ? <p className={styles.emptyHint}>No projects selected.</p> : null}
              {selectedProjects.map((entry) => (
                <div key={entry.id} className={styles.itemSelected}>
                  <div className={styles.itemHead}>
                    <label className={styles.itemCheck}>
                      <input
                        type="checkbox"
                        checked
                        aria-label={`Remove ${entry.title}`}
                        onChange={() => props.onToggleItemSelection("projects", entry.id)}
                      />
                      <strong>{entry.title || "Untitled"}</strong>
                    </label>
                    <ItemSelection itemId={entry.id} section="projects" />
                  </div>
                  {entry.bullets.length > 0 ? (
                    <div className={styles.bulletList}>
                      {entry.bullets.map((bullet) => (
                        <label key={bullet.id} className={styles.bulletCheck}>
                          <input
                            type="checkbox"
                            checked={section.selectedBulletIds.includes(bullet.id)}
                            onChange={() => props.onToggleBulletSelection("projects", bullet.id)}
                          />
                          <span className={styles.bulletText}>{bullet.text}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.column}>
            <h3>Available</h3>
            <p className={styles.columnHint}>In your Profile, not in this CV.</p>
            <div className={styles.stack}>
              {availableProjects.length === 0 ? <p className={styles.emptyHint}>Every project is included.</p> : null}
              {availableProjects.map((entry) => (
                <div key={entry.id} className={styles.itemRow}>
                  <label className={styles.itemCheck}>
                    <input
                      type="checkbox"
                      checked={false}
                      aria-label={`Include ${entry.title}`}
                      onChange={() => props.onToggleItemSelection("projects", entry.id)}
                    />
                    <span>
                      <strong>{entry.title || "Untitled"}</strong>
                      <span className={styles.itemMeta}> — {entry.bullets.length} bullets</span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // skills
  const section = version.sections.skills;
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h2>Skills</h2>
            {sourceBadge}
          </div>
          <p>Pick which skills this CV shows. Groups and skills are edited in the Profile.</p>
        </div>
        <Link className={styles.libraryLink} to="/profile">
          Edit in Profile →
        </Link>
      </div>

      <div className={styles.stack}>
        {profile.skills.length === 0 ? <p className={styles.emptyHint}>No skill groups in the Profile yet.</p> : null}
        {profile.skills.map((group) => {
          const groupIds = group.items.map((item) => item.id);
          const allSelected = groupIds.length > 0 && groupIds.every((id) => section.selectedItemIds.includes(id));
          const anySelected = groupIds.some((id) => section.selectedItemIds.includes(id));
          return (
            <div key={group.id} className={anySelected ? styles.itemSelected : styles.itemRow}>
              <div className={styles.groupHead}>
                <span className={styles.groupName}>{group.name}</span>
                <button
                  type="button"
                  className={anySelected ? styles.chipToggleActive : styles.chipToggle}
                  onClick={() => props.onToggleSkillGroupSelection(group.id)}
                >
                  {allSelected ? "Hide all" : "Show all"}
                </button>
              </div>
              <div className={styles.skillItems}>
                {group.items.map((item) => (
                  <label key={item.id} className={styles.skillCheck}>
                    <input
                      type="checkbox"
                      checked={section.selectedItemIds.includes(item.id)}
                      onChange={() => props.onToggleItemSelection("skills", item.id)}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
