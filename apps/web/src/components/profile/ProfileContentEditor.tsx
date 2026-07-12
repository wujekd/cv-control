import type {
  CvProfile,
  EducationEntry,
  ExperienceEntry,
  LinkRef,
  ProjectEntry
} from "@cv-control/shared";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { LineLinkField } from "../editor/LineLinkField";
import { LinkCollectionEditor } from "../editor/LinkCollectionEditor";
import styles from "./ProfileContentEditor.module.css";

export type ProfileContentSection = "summary" | "experience" | "education" | "projects" | "skills";

type LinkableSection = "education" | "experience" | "projects";

interface ProfileContentEditorProps {
  section: ProfileContentSection;
  profile: CvProfile;
  onUpdateSummary: (value: string) => void;
  onUpdateSummaryLinkUrl: (value: string) => void;
  onUpdateEducationEntry: (id: string, patch: Partial<EducationEntry>) => void;
  onUpdateExperienceEntry: (id: string, patch: Partial<ExperienceEntry>) => void;
  onUpdateProjectEntry: (id: string, patch: Partial<ProjectEntry>) => void;
  onUpdateProjectDescriptionLinkUrl: (id: string, value: string) => void;
  onAddEntryLink: (sectionType: LinkableSection, itemId: string) => void;
  onUpdateEntryLink: (
    sectionType: LinkableSection,
    itemId: string,
    linkId: string,
    patch: Partial<Pick<LinkRef, "label" | "url">>
  ) => void;
  onRemoveEntryLink: (sectionType: LinkableSection, itemId: string, linkId: string) => void;
  onUpdateSkillGroupName: (id: string, name: string) => void;
  onUpdateSkillItem: (groupId: string, itemId: string, value: string) => void;
  onAddSkillItem: (groupId: string) => void;
  onRemoveSkillItem: (groupId: string, itemId: string) => void;
  onAddEntry: (sectionType: "education" | "experience" | "projects" | "skills") => void;
  onRemoveEntry: (sectionType: "education" | "experience" | "projects" | "skills", id: string) => void;
  onAddBullet: (sectionType: LinkableSection, itemId: string) => void;
  onUpdateBullet: (sectionType: LinkableSection, itemId: string, bulletId: string, text: string) => void;
  onUpdateBulletLinkUrl: (sectionType: LinkableSection, itemId: string, bulletId: string, value: string) => void;
  onRemoveBullet: (sectionType: LinkableSection, itemId: string, bulletId: string) => void;
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.addButton} onClick={onClick}>
      <span className={styles.buttonGlyph}>+</span>
      <span>{label}</span>
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className={styles.removeButton} aria-label={label} title={label} onClick={onClick}>
      x
    </button>
  );
}

interface MasterDetailItem {
  id: string;
  title: string;
  subtitle: string;
}

interface MasterDetailProps {
  heading: string;
  description: string;
  addLabel: string;
  emptyHint: string;
  removeLabel: string;
  items: ReadonlyArray<MasterDetailItem>;
  onAdd: () => void;
  onRemove: (id: string) => void;
  renderDetail: (id: string) => ReactNode;
}

// Two-pane list/detail: the list stays visible while a single entry is edited on
// the right, so you can scan every entry without scrolling past every open form.
function MasterDetail({
  heading,
  description,
  addLabel,
  emptyHint,
  removeLabel,
  items,
  onAdd,
  onRemove,
  renderDetail
}: MasterDetailProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevIdsRef = useRef<string[]>([]);

  useEffect(() => {
    const ids = items.map((item) => item.id);
    const prevIds = prevIdsRef.current;
    const added = ids.find((id) => !prevIds.includes(id));
    if (added) {
      setSelectedId(added);
    } else if (selectedId === null || !ids.includes(selectedId)) {
      setSelectedId(ids[0] ?? null);
    }
    prevIdsRef.current = ids;
  }, [items, selectedId]);

  const selected = items.find((item) => item.id === selectedId) ?? items[0] ?? null;

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2>{heading}</h2>
          <p>{description}</p>
        </div>
        <AddButton label={addLabel} onClick={onAdd} />
      </div>
      {items.length === 0 ? (
        <p className={styles.emptyHint}>{emptyHint}</p>
      ) : (
        <div className={styles.masterDetail}>
          <ul className={styles.list}>
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={item.id === selected?.id ? styles.listItemActive : styles.listItem}
                  aria-current={item.id === selected?.id ? "true" : undefined}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className={styles.listItemTitle}>{item.title}</span>
                  {item.subtitle ? <span className={styles.listItemSubtitle}>{item.subtitle}</span> : null}
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.detail}>
            {selected ? (
              <>
                <div className={styles.detailHeader}>
                  <strong className={styles.detailTitle}>{selected.title}</strong>
                  <RemoveButton label={removeLabel} onClick={() => onRemove(selected.id)} />
                </div>
                {renderDetail(selected.id)}
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

function BulletsEditor({
  section,
  entryId,
  bullets,
  onAdd,
  onUpdate,
  onUpdateLinkUrl,
  onRemove
}: {
  section: LinkableSection;
  entryId: string;
  bullets: ReadonlyArray<{ id: string; text: string; linkUrl?: string }>;
  onAdd: (section: LinkableSection, itemId: string) => void;
  onUpdate: (section: LinkableSection, itemId: string, bulletId: string, text: string) => void;
  onUpdateLinkUrl: (section: LinkableSection, itemId: string, bulletId: string, value: string) => void;
  onRemove: (section: LinkableSection, itemId: string, bulletId: string) => void;
}) {
  return (
    <div className={styles.bullets}>
      <div className={styles.inlineActions}>
        <span className={styles.inlineLabel}>Bullets</span>
        <AddButton label="Add bullet" onClick={() => onAdd(section, entryId)} />
      </div>
      {bullets.map((bullet) => (
        <div key={bullet.id} className={styles.bulletRow}>
          <div className={styles.bulletEditor}>
            <textarea
              className={styles.textarea}
              value={bullet.text}
              onChange={(event) => onUpdate(section, entryId, bullet.id, event.target.value)}
            />
            <LineLinkField
              label="Bullet link URL"
              value={bullet.linkUrl}
              onChange={(value) => onUpdateLinkUrl(section, entryId, bullet.id, value)}
            />
          </div>
          <RemoveButton label="Remove bullet" onClick={() => onRemove(section, entryId, bullet.id)} />
        </div>
      ))}
    </div>
  );
}

export function ProfileContentEditor(props: ProfileContentEditorProps) {
  const { section, profile } = props;

  if (section === "summary") {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <div>
            <h2>Summary</h2>
            <p>A short professional summary. Each CV can use it as-is or override it for a specific application.</p>
          </div>
        </div>
        <textarea
          className={styles.textarea}
          aria-label="Summary text"
          value={profile.summary?.text ?? ""}
          onChange={(event) => props.onUpdateSummary(event.target.value)}
        />
        <LineLinkField
          label="Summary link URL"
          value={profile.summary?.linkUrl}
          onChange={props.onUpdateSummaryLinkUrl}
        />
      </section>
    );
  }

  if (section === "education") {
    return (
      <MasterDetail
        heading="Education"
        description="Your full education history. CVs pick which entries and bullets to show."
        addLabel="Add education"
        emptyHint="No education entries yet."
        removeLabel="Remove education entry"
        items={profile.education.map((entry) => ({
          id: entry.id,
          title: entry.qualification || "Untitled qualification",
          subtitle: entry.institution
        }))}
        onAdd={() => props.onAddEntry("education")}
        onRemove={(id) => props.onRemoveEntry("education", id)}
        renderDetail={(id) => {
          const entry = profile.education.find((item) => item.id === id);
          if (!entry) {
            return null;
          }
          return (
            <>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Qualification</span>
                  <input
                    value={entry.qualification}
                    onChange={(event) => props.onUpdateEducationEntry(entry.id, { qualification: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Institution</span>
                  <input
                    value={entry.institution}
                    onChange={(event) => props.onUpdateEducationEntry(entry.id, { institution: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Grade</span>
                  <input
                    value={entry.grade ?? ""}
                    onChange={(event) => props.onUpdateEducationEntry(entry.id, { grade: event.target.value })}
                  />
                </label>
              </div>
              <LinkCollectionEditor
                title="Qualification line links"
                description="Links rendered on the qualification header line."
                links={entry.links}
                onAddLink={() => props.onAddEntryLink("education", entry.id)}
                onUpdateLink={(linkId, patch) => props.onUpdateEntryLink("education", entry.id, linkId, patch)}
                onRemoveLink={(linkId) => props.onRemoveEntryLink("education", entry.id, linkId)}
              />
              <BulletsEditor
                section="education"
                entryId={entry.id}
                bullets={entry.bullets ?? []}
                onAdd={props.onAddBullet}
                onUpdate={props.onUpdateBullet}
                onUpdateLinkUrl={props.onUpdateBulletLinkUrl}
                onRemove={props.onRemoveBullet}
              />
            </>
          );
        }}
      />
    );
  }

  if (section === "experience") {
    return (
      <MasterDetail
        heading="Experience"
        description="Your full work history. CVs pick which roles and bullets to show."
        addLabel="Add experience"
        emptyHint="No experience entries yet."
        removeLabel="Remove experience entry"
        items={profile.experience.map((entry) => ({
          id: entry.id,
          title: entry.role || "Untitled role",
          subtitle: entry.organisation
        }))}
        onAdd={() => props.onAddEntry("experience")}
        onRemove={(id) => props.onRemoveEntry("experience", id)}
        renderDetail={(id) => {
          const entry = profile.experience.find((item) => item.id === id);
          if (!entry) {
            return null;
          }
          return (
            <>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Role</span>
                  <input
                    value={entry.role}
                    onChange={(event) => props.onUpdateExperienceEntry(entry.id, { role: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Organisation</span>
                  <input
                    value={entry.organisation}
                    onChange={(event) => props.onUpdateExperienceEntry(entry.id, { organisation: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Location</span>
                  <input
                    value={entry.location ?? ""}
                    onChange={(event) => props.onUpdateExperienceEntry(entry.id, { location: event.target.value })}
                  />
                </label>
              </div>
              <LinkCollectionEditor
                title="Role line links"
                description="Links rendered on the role header line."
                links={entry.links}
                onAddLink={() => props.onAddEntryLink("experience", entry.id)}
                onUpdateLink={(linkId, patch) => props.onUpdateEntryLink("experience", entry.id, linkId, patch)}
                onRemoveLink={(linkId) => props.onRemoveEntryLink("experience", entry.id, linkId)}
              />
              <BulletsEditor
                section="experience"
                entryId={entry.id}
                bullets={entry.bullets}
                onAdd={props.onAddBullet}
                onUpdate={props.onUpdateBullet}
                onUpdateLinkUrl={props.onUpdateBulletLinkUrl}
                onRemove={props.onRemoveBullet}
              />
            </>
          );
        }}
      />
    );
  }

  if (section === "projects") {
    return (
      <MasterDetail
        heading="Projects"
        description="Your full project pool. CVs pick which projects and bullets to include."
        addLabel="Add project"
        emptyHint="No projects yet."
        removeLabel="Remove project"
        items={profile.projects.map((entry) => ({
          id: entry.id,
          title: entry.title || "Untitled project",
          subtitle: entry.technologies.join(", ")
        }))}
        onAdd={() => props.onAddEntry("projects")}
        onRemove={(id) => props.onRemoveEntry("projects", id)}
        renderDetail={(id) => {
          const entry = profile.projects.find((item) => item.id === id);
          if (!entry) {
            return null;
          }
          return (
            <>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Title</span>
                  <input
                    value={entry.title}
                    onChange={(event) => props.onUpdateProjectEntry(entry.id, { title: event.target.value })}
                  />
                </label>
                <label className={styles.field}>
                  <span>Technologies</span>
                  <input
                    value={entry.technologies.join(", ")}
                    onChange={(event) =>
                      props.onUpdateProjectEntry(entry.id, {
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
                onAddLink={() => props.onAddEntryLink("projects", entry.id)}
                onUpdateLink={(linkId, patch) => props.onUpdateEntryLink("projects", entry.id, linkId, patch)}
                onRemoveLink={(linkId) => props.onRemoveEntryLink("projects", entry.id, linkId)}
              />
              <label className={styles.field}>
                <span>Description</span>
                <textarea
                  className={styles.textarea}
                  value={entry.description ?? ""}
                  onChange={(event) => props.onUpdateProjectEntry(entry.id, { description: event.target.value })}
                />
              </label>
              <LineLinkField
                label="Description link URL"
                value={entry.descriptionLinkUrl}
                onChange={(value) => props.onUpdateProjectDescriptionLinkUrl(entry.id, value)}
              />
              <BulletsEditor
                section="projects"
                entryId={entry.id}
                bullets={entry.bullets}
                onAdd={props.onAddBullet}
                onUpdate={props.onUpdateBullet}
                onUpdateLinkUrl={props.onUpdateBulletLinkUrl}
                onRemove={props.onRemoveBullet}
              />
            </>
          );
        }}
      />
    );
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <h2>Skills</h2>
          <p>Grouped skills. CVs pick which skills to show from each group.</p>
        </div>
        <AddButton label="Add group" onClick={() => props.onAddEntry("skills")} />
      </div>
      <div className={styles.stack}>
        {profile.skills.length === 0 ? <p className={styles.emptyHint}>No skill groups yet.</p> : null}
        {profile.skills.map((group) => (
          <article key={group.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <input
                className={styles.inlineInput}
                aria-label="Skill group name"
                value={group.name}
                onChange={(event) => props.onUpdateSkillGroupName(group.id, event.target.value)}
              />
              <div className={styles.inlineActions}>
                <AddButton label="Add skill" onClick={() => props.onAddSkillItem(group.id)} />
                <RemoveButton label="Remove skill group" onClick={() => props.onRemoveEntry("skills", group.id)} />
              </div>
            </div>
            <div className={styles.stack}>
              {group.items.length === 0 ? <p className={styles.emptyHint}>No skills in this group yet.</p> : null}
              {group.items.map((item) => (
                <div key={item.id} className={styles.skillRow}>
                  <label className={styles.field}>
                    <span>Skill</span>
                    <input
                      value={item.label}
                      onChange={(event) => props.onUpdateSkillItem(group.id, item.id, event.target.value)}
                    />
                  </label>
                  <RemoveButton label="Remove skill" onClick={() => props.onRemoveSkillItem(group.id, item.id)} />
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
