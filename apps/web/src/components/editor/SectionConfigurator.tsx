import type { CvProfile, CvVersion, SectionType, SkillGroup } from "@cv-control/shared";
import styles from "./SectionConfigurator.module.css";

interface SectionConfiguratorProps {
  profile: CvProfile;
  version: CvVersion;
  sectionType: SectionType;
  onToggleItem: (sectionType: "education" | "experience" | "projects" | "skills", id: string) => void;
  onMoveItem: (
    sectionType: "education" | "experience" | "projects" | "skills",
    id: string,
    direction: -1 | 1
  ) => void;
  onToggleBullet: (sectionType: "education" | "experience" | "projects", bulletId: string) => void;
}

function formatSectionLabel(sectionType: SectionType) {
  return sectionType === "personalInfo"
    ? "Personal Info"
    : sectionType.charAt(0).toUpperCase() + sectionType.slice(1);
}

function renderOrderControls(
  selectedItemIds: string[],
  itemId: string,
  onMove: (direction: -1 | 1) => void
) {
  if (!selectedItemIds.includes(itemId)) {
    return null;
  }

  const index = selectedItemIds.indexOf(itemId);

  return (
    <div className={styles.orderControls}>
      <button type="button" aria-label="Move item up" disabled={index === 0} onClick={() => onMove(-1)}>
        ↑
      </button>
      <button
        type="button"
        aria-label="Move item down"
        disabled={index === selectedItemIds.length - 1}
        onClick={() => onMove(1)}
      >
        ↓
      </button>
    </div>
  );
}

function renderSkillGroups(
  groups: SkillGroup[],
  selectedItemIds: string[],
  onToggleItem: (skillId: string) => void,
  onMoveItem: (skillId: string, direction: -1 | 1) => void
) {
  return groups.map((group) => (
    <div key={group.id} className={styles.group}>
      <h3>{group.name}</h3>
      <div className={styles.checklist}>
        {group.items.map((item) => (
          <label key={item.id} className={styles.checklistItem}>
            <span>{item.label}</span>
            <div className={styles.checklistControls}>
              {renderOrderControls(selectedItemIds, item.id, (direction) => onMoveItem(item.id, direction))}
              <input
                type="checkbox"
                checked={selectedItemIds.includes(item.id)}
                onChange={() => onToggleItem(item.id)}
              />
            </div>
          </label>
        ))}
      </div>
    </div>
  ));
}

export function SectionConfigurator({
  profile,
  version,
  sectionType,
  onToggleItem,
  onMoveItem,
  onToggleBullet
}: SectionConfiguratorProps) {
  const section = version.sections[sectionType];

  if (sectionType === "personalInfo" || sectionType === "summary") {
    return null;
  }

  if (sectionType === "skills") {
    return (
      <section className={styles.panel}>
        <div className={styles.header}>
          <h2>Skills</h2>
          <p>Visible items and order.</p>
        </div>
        <div className={styles.scrollArea}>
          {renderSkillGroups(
            profile.skills,
            section.selectedItemIds,
            (skillId) => onToggleItem("skills", skillId),
            (skillId, direction) => onMoveItem("skills", skillId, direction)
          )}
        </div>
      </section>
    );
  }

  const items =
    sectionType === "education" ? profile.education : sectionType === "experience" ? profile.experience : profile.projects;

  const renderTypedItem = (item: (typeof items)[number], label: string) => (
    <div key={item.id} className={styles.itemCard}>
      <label className={styles.checklistItem}>
        <span>{label}</span>
        <div className={styles.checklistControls}>
          {renderOrderControls(section.selectedItemIds, item.id, (direction) =>
            onMoveItem(sectionType, item.id, direction)
          )}
          <input
            type="checkbox"
            checked={section.selectedItemIds.includes(item.id)}
            onChange={() => onToggleItem(sectionType, item.id)}
          />
        </div>
      </label>
      {item.bullets && item.bullets.length > 0 ? (
        <div className={styles.bullets}>
          {item.bullets.map((bullet) => (
            <label key={bullet.id} className={styles.bulletItem}>
              <span>{bullet.text}</span>
              <input
                type="checkbox"
                checked={section.selectedBulletIds.includes(bullet.id)}
                onChange={() => onToggleBullet(sectionType, bullet.id)}
              />
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <h2>{formatSectionLabel(sectionType)}</h2>
        <p>Visible items and bullets.</p>
      </div>
      <div className={styles.scrollArea}>
        <div className={styles.checklist}>
          {sectionType === "education"
            ? profile.education.map((item) =>
                renderTypedItem(item, `${item.qualification} - ${item.institution}`)
              )
            : null}
          {sectionType === "experience"
            ? profile.experience.map((item) =>
                renderTypedItem(item, `${item.role} - ${item.organisation}`)
              )
            : null}
          {sectionType === "projects"
            ? profile.projects.map((item) => renderTypedItem(item, item.title))
            : null}
        </div>
      </div>
    </section>
  );
}
