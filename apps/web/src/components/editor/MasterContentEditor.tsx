import { useState } from "react";
import type {
  CvProfile,
  CvVersion,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SectionType
} from "@cv-control/shared";
import { LinkCollectionEditor } from "./LinkCollectionEditor";
import { LineLinkField } from "./LineLinkField";
import styles from "./MasterContentEditor.module.css";

function CompactAddButton({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className={styles.addButton} onClick={onClick}>
      <span className={styles.buttonGlyph}>+</span>
      <span>{label}</span>
    </button>
  );
}

function CompactRemoveButton({
  label,
  onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.removeButton}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      x
    </button>
  );
}

function CompactUtilityButton({
  label,
  onClick,
  title,
  active = false
}: {
  label: string;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={active ? `${styles.utilityButton} ${styles.activeUtilityButton}` : styles.utilityButton}
      aria-label={title}
      title={title}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

interface MasterContentEditorProps {
  canonicalProfile: CvProfile;
  profile: CvProfile;
  version: CvVersion;
  sectionType: SectionType;
  sourceState: "baseline" | "inherited" | "custom";
  dirtyItemIds: string[];
  onUpdateCanonicalBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
  onUpdateVersionBasicsField: (field: keyof CvProfile["basics"], value: string | undefined) => void;
  onClearVersionBasicsOverrides: () => void;
  onUpdateSummary: (value: string) => void;
  onUpdateSummaryLinkUrl: (value: string) => void;
  onUpdateEducationEntry: (id: string, patch: Partial<EducationEntry>) => void;
  onUpdateExperienceEntry: (id: string, patch: Partial<ExperienceEntry>) => void;
  onUpdateProjectEntry: (id: string, patch: Partial<ProjectEntry>) => void;
  onUpdateProjectDescriptionLinkUrl: (id: string, value: string) => void;
  onAddEntryLink: (sectionType: "education" | "experience" | "projects", itemId: string) => void;
  onUpdateEntryLink: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    linkId: string,
    patch: { label?: string; url?: string }
  ) => void;
  onRemoveEntryLink: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    linkId: string
  ) => void;
  onUpdateSkillGroupName: (id: string, name: string) => void;
  onUpdateSkillItem: (groupId: string, itemId: string, value: string) => void;
  onAddSkillItem: (groupId: string) => void;
  onRemoveSkillItem: (groupId: string, itemId: string) => void;
  onToggleSkillGroupSelection: (groupId: string) => void;
  onAddEntry: (sectionType: "education" | "experience" | "projects" | "skills") => void;
  onRemoveEntry: (sectionType: "education" | "experience" | "projects" | "skills", id: string) => void;
  onAddBullet: (sectionType: "education" | "experience" | "projects", itemId: string) => void;
  onUpdateBullet: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    bulletId: string,
    text: string
  ) => void;
  onUpdateBulletLinkUrl: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    bulletId: string,
    value: string
  ) => void;
  onRemoveBullet: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    bulletId: string
  ) => void;
  onToggleItemSelection: (sectionType: "education" | "experience" | "projects" | "skills", id: string) => void;
  onMoveSelectedItem: (
    sectionType: "education" | "experience" | "projects" | "skills",
    id: string,
    direction: -1 | 1
  ) => void;
  onToggleBulletSelection: (sectionType: "education" | "experience" | "projects", bulletId: string) => void;
}

export function MasterContentEditor({
  canonicalProfile,
  profile,
  version,
  sectionType,
  sourceState,
  dirtyItemIds,
  onUpdateCanonicalBasicsField,
  onUpdateVersionBasicsField,
  onClearVersionBasicsOverrides,
  onUpdateSummary,
  onUpdateSummaryLinkUrl,
  onUpdateEducationEntry,
  onUpdateExperienceEntry,
  onUpdateProjectEntry,
  onUpdateProjectDescriptionLinkUrl,
  onAddEntryLink,
  onUpdateEntryLink,
  onRemoveEntryLink,
  onUpdateSkillGroupName,
  onUpdateSkillItem,
  onAddSkillItem,
  onRemoveSkillItem,
  onToggleSkillGroupSelection,
  onAddEntry,
  onRemoveEntry,
  onAddBullet,
  onUpdateBullet,
  onUpdateBulletLinkUrl,
  onRemoveBullet,
  onToggleItemSelection,
  onMoveSelectedItem,
  onToggleBulletSelection
}: MasterContentEditorProps) {
  const [collapsedSkillGroups, setCollapsedSkillGroups] = useState<string[]>([]);
  const isDirtyItem = (itemId: string) => dirtyItemIds.includes(itemId);
  const sourceBadge = (
    <span className={sourceState === "custom" ? styles.customBadge : styles.sourceBadge}>
      {sourceState}
    </span>
  );

  const toggleSkillGroupCollapsed = (groupId: string) => {
    setCollapsedSkillGroups((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId]
    );
  };

  function renderItemSelectionControls(
    itemId: string,
    selectableSectionType: "education" | "experience" | "projects" | "skills"
  ) {
    const selectedItemIds = version.sections[selectableSectionType].selectedItemIds;
    const isSelected = selectedItemIds.includes(itemId);
    const index = selectedItemIds.indexOf(itemId);

    return (
      <div className={styles.selectionControls}>
        <input
          type="checkbox"
          checked={isSelected}
          aria-label={`${isSelected ? "Hide" : "Show"} item in current CV version`}
          onChange={() => onToggleItemSelection(selectableSectionType, itemId)}
        />
        <div className={styles.arrowStack}>
          <button
            type="button"
            aria-label="Move selected item up"
            disabled={!isSelected || index === 0}
            onClick={() => onMoveSelectedItem(selectableSectionType, itemId, -1)}
          >
            ↑
          </button>
          <button
            type="button"
            aria-label="Move selected item down"
            disabled={!isSelected || index === selectedItemIds.length - 1}
            onClick={() => onMoveSelectedItem(selectableSectionType, itemId, 1)}
          >
            ↓
          </button>
        </div>
      </div>
    );
  }

  function renderBulletSelectionControl(
    bulletId: string,
    selectableSectionType: "education" | "experience" | "projects"
  ) {
    return (
      <input
        type="checkbox"
        checked={version.sections[selectableSectionType].selectedBulletIds.includes(bulletId)}
        aria-label="Show bullet in current CV version"
        onChange={() => onToggleBulletSelection(selectableSectionType, bulletId)}
      />
    );
  }

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
    const hasBasicsOverrides = Object.keys(basicsOverrides).length > 0;

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
                              event.target.checked ? profile.basics[field] ?? "" : undefined
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

  if (sectionType === "summary") {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2>Summary Content</h2>
            {sourceBadge}
          </div>
          <p>Shared summary text used by the selected CV.</p>
        </div>
        <textarea
          className={styles.textarea}
          value={profile.summary?.text ?? ""}
          onChange={(event) => onUpdateSummary(event.target.value)}
        />
        <LineLinkField
          label="Summary link URL"
          value={profile.summary?.linkUrl}
          onChange={onUpdateSummaryLinkUrl}
        />
      </section>
    );
  }

  if (sectionType === "education") {
    return (
      <section className={styles.panel}>
        <div className={styles.headerWithAction}>
          <div>
            <div className={styles.titleRow}>
              <h2>Education Content</h2>
              {sourceBadge}
            </div>
            <p>Edit the pool of education items available to this CV.</p>
          </div>
          <CompactAddButton label="Item" onClick={() => onAddEntry("education")} />
        </div>
        <div className={styles.stack}>
          {profile.education.map((entry) => (
            <article
              key={entry.id}
              className={isDirtyItem(entry.id) ? `${styles.card} ${styles.dirtyCard}` : styles.card}
            >
              <div className={styles.inlineActions}>
                <strong className={styles.cardTitle}>{entry.qualification}</strong>
                <div className={styles.itemActionCluster}>
                  {renderItemSelectionControls(entry.id, "education")}
                  <CompactRemoveButton
                    label="Remove education item"
                    onClick={() => onRemoveEntry("education", entry.id)}
                  />
                </div>
              </div>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Qualification</span>
                  <input
                    value={entry.qualification}
                    onChange={(event) =>
                      onUpdateEducationEntry(entry.id, { qualification: event.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Institution</span>
                  <input
                    value={entry.institution}
                    onChange={(event) =>
                      onUpdateEducationEntry(entry.id, { institution: event.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Grade</span>
                  <input
                    value={entry.grade ?? ""}
                    onChange={(event) => onUpdateEducationEntry(entry.id, { grade: event.target.value })}
                  />
                </label>
              </div>
              <LinkCollectionEditor
                title="Qualification line links"
                description="Links rendered on the qualification header line."
                links={entry.links}
                onAddLink={() => onAddEntryLink("education", entry.id)}
                onUpdateLink={(linkId, patch) => onUpdateEntryLink("education", entry.id, linkId, patch)}
                onRemoveLink={(linkId) => onRemoveEntryLink("education", entry.id, linkId)}
              />
              <div className={styles.bullets}>
                <div className={styles.inlineActions}>
                  <span className={styles.inlineLabel}>Bullets</span>
                  <CompactAddButton label="Bullet" onClick={() => onAddBullet("education", entry.id)} />
                </div>
                {(entry.bullets ?? []).map((bullet) => (
                  <div key={bullet.id} className={styles.bulletRow}>
                    <div className={styles.bulletEditor}>
                      <textarea
                        className={styles.textarea}
                        value={bullet.text}
                        onChange={(event) =>
                          onUpdateBullet("education", entry.id, bullet.id, event.target.value)
                        }
                      />
                      <LineLinkField
                        label="Bullet link URL"
                        value={bullet.linkUrl}
                        onChange={(value) => onUpdateBulletLinkUrl("education", entry.id, bullet.id, value)}
                      />
                    </div>
                    <div className={styles.bulletActionCluster}>
                      {renderBulletSelectionControl(bullet.id, "education")}
                      <CompactRemoveButton
                        label="Remove education bullet"
                        onClick={() => onRemoveBullet("education", entry.id, bullet.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (sectionType === "experience") {
    return (
      <section className={styles.panel}>
        <div className={styles.headerWithAction}>
          <div>
            <div className={styles.titleRow}>
              <h2>Experience Content</h2>
              {sourceBadge}
            </div>
            <p>Maintain the experience pool and choose which entries this CV shows.</p>
          </div>
          <CompactAddButton label="Item" onClick={() => onAddEntry("experience")} />
        </div>
        <div className={styles.stack}>
          {profile.experience.map((entry) => (
            <article
              key={entry.id}
              className={isDirtyItem(entry.id) ? `${styles.card} ${styles.dirtyCard}` : styles.card}
            >
              <div className={styles.inlineActions}>
                <strong className={styles.cardTitle}>{entry.role}</strong>
                <div className={styles.itemActionCluster}>
                  {renderItemSelectionControls(entry.id, "experience")}
                  <CompactRemoveButton
                    label="Remove experience item"
                    onClick={() => onRemoveEntry("experience", entry.id)}
                  />
                </div>
              </div>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Role</span>
                  <input
                    value={entry.role}
                    onChange={(event) => onUpdateExperienceEntry(entry.id, { role: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Organisation</span>
                  <input
                    value={entry.organisation}
                    onChange={(event) =>
                      onUpdateExperienceEntry(entry.id, { organisation: event.target.value })
                    }
                  />
                </label>
                <label className={styles.field}>
                  <span>Location</span>
                  <input
                    value={entry.location ?? ""}
                    onChange={(event) =>
                      onUpdateExperienceEntry(entry.id, { location: event.target.value })
                    }
                  />
                </label>
              </div>
              <LinkCollectionEditor
                title="Role line links"
                description="Links rendered on the role header line."
                links={entry.links}
                onAddLink={() => onAddEntryLink("experience", entry.id)}
                onUpdateLink={(linkId, patch) => onUpdateEntryLink("experience", entry.id, linkId, patch)}
                onRemoveLink={(linkId) => onRemoveEntryLink("experience", entry.id, linkId)}
              />
              <div className={styles.bullets}>
                <div className={styles.inlineActions}>
                  <span className={styles.inlineLabel}>Bullets</span>
                  <CompactAddButton label="Bullet" onClick={() => onAddBullet("experience", entry.id)} />
                </div>
                {entry.bullets.map((bullet) => (
                  <div key={bullet.id} className={styles.bulletRow}>
                    <div className={styles.bulletEditor}>
                      <textarea
                        className={styles.textarea}
                        value={bullet.text}
                        onChange={(event) =>
                          onUpdateBullet("experience", entry.id, bullet.id, event.target.value)
                        }
                      />
                      <LineLinkField
                        label="Bullet link URL"
                        value={bullet.linkUrl}
                        onChange={(value) => onUpdateBulletLinkUrl("experience", entry.id, bullet.id, value)}
                      />
                    </div>
                    <div className={styles.bulletActionCluster}>
                      {renderBulletSelectionControl(bullet.id, "experience")}
                      <CompactRemoveButton
                        label="Remove experience bullet"
                        onClick={() => onRemoveBullet("experience", entry.id, bullet.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (sectionType === "projects") {
    return (
      <section className={styles.panel}>
        <div className={styles.headerWithAction}>
          <div>
            <div className={styles.titleRow}>
              <h2>Project Content</h2>
              {sourceBadge}
            </div>
            <p>The selected projects fill the project slot in this CV.</p>
          </div>
          <CompactAddButton label="Item" onClick={() => onAddEntry("projects")} />
        </div>
        <div className={styles.stack}>
          {profile.projects.map((entry) => (
            <article
              key={entry.id}
              className={isDirtyItem(entry.id) ? `${styles.card} ${styles.dirtyCard}` : styles.card}
            >
              <div className={styles.inlineActions}>
                <strong className={styles.cardTitle}>{entry.title}</strong>
                <div className={styles.itemActionCluster}>
                  {renderItemSelectionControls(entry.id, "projects")}
                  <CompactRemoveButton
                    label="Remove project item"
                    onClick={() => onRemoveEntry("projects", entry.id)}
                  />
                </div>
              </div>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Title</span>
                  <input
                    value={entry.title}
                    onChange={(event) => onUpdateProjectEntry(entry.id, { title: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Technologies</span>
                  <input
                    value={entry.technologies.join(", ")}
                    onChange={(event) =>
                      onUpdateProjectEntry(entry.id, {
                        technologies: event.target.value.split(",").map((item) => item.trim()).filter(Boolean)
                      })
                    }
                  />
                </label>
              </div>
              <LinkCollectionEditor
                title="Project title links"
                description="Links rendered on the project title line."
                links={entry.links}
                onAddLink={() => onAddEntryLink("projects", entry.id)}
                onUpdateLink={(linkId, patch) => onUpdateEntryLink("projects", entry.id, linkId, patch)}
                onRemoveLink={(linkId) => onRemoveEntryLink("projects", entry.id, linkId)}
              />
              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  className={styles.textarea}
                  value={entry.description ?? ""}
                  onChange={(event) =>
                    onUpdateProjectEntry(entry.id, { description: event.target.value })
                  }
                />
              </label>
              <LineLinkField
                label="Description link URL"
                value={entry.descriptionLinkUrl}
                onChange={(value) => onUpdateProjectDescriptionLinkUrl(entry.id, value)}
              />
              <div className={styles.bullets}>
                <div className={styles.inlineActions}>
                  <span className={styles.inlineLabel}>Bullets</span>
                  <CompactAddButton label="Bullet" onClick={() => onAddBullet("projects", entry.id)} />
                </div>
                {entry.bullets.map((bullet) => (
                  <div key={bullet.id} className={styles.bulletRow}>
                    <div className={styles.bulletEditor}>
                      <textarea
                        className={styles.textarea}
                        value={bullet.text}
                        onChange={(event) =>
                          onUpdateBullet("projects", entry.id, bullet.id, event.target.value)
                        }
                      />
                      <LineLinkField
                        label="Bullet link URL"
                        value={bullet.linkUrl}
                        onChange={(value) => onUpdateBulletLinkUrl("projects", entry.id, bullet.id, value)}
                      />
                    </div>
                    <div className={styles.bulletActionCluster}>
                      {renderBulletSelectionControl(bullet.id, "projects")}
                      <CompactRemoveButton
                        label="Remove project bullet"
                        onClick={() => onRemoveBullet("projects", entry.id, bullet.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.headerWithAction}>
        <div>
          <div className={styles.titleRow}>
            <h2>Skills Content</h2>
            {sourceBadge}
          </div>
          <p>Skills are selectable at item level inside grouped categories.</p>
        </div>
        <CompactAddButton label="Group" onClick={() => onAddEntry("skills")} />
      </div>
      <div className={styles.stack}>
        {profile.skills.map((group) => (
          <article
            key={group.id}
            className={isDirtyItem(group.id) ? `${styles.card} ${styles.dirtyCard}` : styles.card}
          >
            <div className={styles.skillGroupHeader}>
              <div className={styles.skillGroupMeta}>
                <input
                  className={styles.inlineInput}
                  value={group.name}
                  onChange={(event) => onUpdateSkillGroupName(group.id, event.target.value)}
                />
                <span className={styles.skillGroupCount}>{group.items.length} skills</span>
              </div>
              <div className={styles.skillGroupActions}>
                <CompactAddButton label="Skill" onClick={() => onAddSkillItem(group.id)} />
                <CompactUtilityButton
                  label={
                    group.items.every((item) => version.sections.skills.selectedItemIds.includes(item.id))
                      ? "Hide"
                      : "Show"
                  }
                  title="Toggle visibility for the whole skill group"
                  active={group.items.some((item) => version.sections.skills.selectedItemIds.includes(item.id))}
                  onClick={() => onToggleSkillGroupSelection(group.id)}
                />
                <CompactUtilityButton
                  label={collapsedSkillGroups.includes(group.id) ? "Open" : "Fold"}
                  title={collapsedSkillGroups.includes(group.id) ? "Expand skill group" : "Collapse skill group"}
                  onClick={() => toggleSkillGroupCollapsed(group.id)}
                />
                <CompactRemoveButton
                  label="Remove skill group"
                  onClick={() => onRemoveEntry("skills", group.id)}
                />
              </div>
            </div>
            {collapsedSkillGroups.includes(group.id) ? null : (
              <div className={styles.stack}>
                {group.items.length === 0 ? (
                  <p className={styles.emptyHint}>No skills in this group yet.</p>
                ) : null}
                {group.items.map((item) => (
                  <div key={item.id} className={styles.skillRow}>
                    <label className={styles.field}>
                      <span>Skill</span>
                      <input
                        value={item.label}
                        onChange={(event) => onUpdateSkillItem(group.id, item.id, event.target.value)}
                      />
                    </label>
                    <div className={styles.itemActionCluster}>
                      {renderItemSelectionControls(item.id, "skills")}
                      <CompactRemoveButton
                        label="Remove skill"
                        onClick={() => onRemoveSkillItem(group.id, item.id)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
