import type { CvProfile, CvVersion, SectionType } from "@cv-control/shared";
import type { EditorSidebarKey } from "../types/editor";

type DirtyTrackableSectionType = "education" | "experience" | "projects" | "skills";
type DirtyItemMap = Partial<Record<DirtyTrackableSectionType, string[]>>;

export interface DerivedDirtyState {
  dirtySidebarKeys: EditorSidebarKey[];
  dirtyItemIdsBySection: DirtyItemMap;
}

function deepEqual(value: unknown, other: unknown): boolean {
  return JSON.stringify(value) === JSON.stringify(other);
}

function addDirtyItem(
  target: Map<DirtyTrackableSectionType, Set<string>>,
  sectionType: DirtyTrackableSectionType,
  itemId: string | null | undefined
) {
  if (!itemId) {
    return;
  }

  const current = target.get(sectionType) ?? new Set<string>();
  current.add(itemId);
  target.set(sectionType, current);
}

function collectBulletParents(
  items: Array<{ id: string; bullets?: Array<{ id: string }> }>
): Map<string, string> {
  const result = new Map<string, string>();

  for (const item of items) {
    for (const bullet of item.bullets ?? []) {
      result.set(bullet.id, item.id);
    }
  }

  return result;
}

function collectSkillParents(groups: CvProfile["skills"]): Map<string, string> {
  const result = new Map<string, string>();

  for (const group of groups) {
    for (const item of group.items) {
      result.set(item.id, group.id);
    }
  }

  return result;
}

function collectChangedIds(currentIds: string[], savedIds: string[]): string[] {
  if (deepEqual(currentIds, savedIds)) {
    return [];
  }

  return Array.from(new Set([...currentIds, ...savedIds]));
}

function compareTrackableEntries<T extends { id: string }>(
  sectionType: DirtyTrackableSectionType,
  currentItems: T[],
  savedItems: T[],
  dirtyKeys: Set<EditorSidebarKey>,
  dirtyItems: Map<DirtyTrackableSectionType, Set<string>>
) {
  if (!deepEqual(currentItems, savedItems)) {
    dirtyKeys.add(sectionType);
  }

  const savedById = new Map(savedItems.map((item) => [item.id, item]));
  for (const item of currentItems) {
    if (!deepEqual(item, savedById.get(item.id))) {
      addDirtyItem(dirtyItems, sectionType, item.id);
    }
  }
}

export function deriveDirtyState(
  profile: CvProfile | null,
  savedProfile: CvProfile | null,
  activeVersion: CvVersion | null,
  savedVersion: CvVersion | null
): DerivedDirtyState {
  if (!profile || !savedProfile || !activeVersion || !savedVersion) {
    return {
      dirtySidebarKeys: [],
      dirtyItemIdsBySection: {}
    };
  }

  const dirtyKeys = new Set<EditorSidebarKey>();
  const dirtyItems = new Map<DirtyTrackableSectionType, Set<string>>();

  if (!deepEqual(profile.basics, savedProfile.basics)) {
    dirtyKeys.add("personalInfo");
  }

  if (!deepEqual(profile.summary, savedProfile.summary)) {
    dirtyKeys.add("summary");
  }

  compareTrackableEntries("education", profile.education, savedProfile.education, dirtyKeys, dirtyItems);
  compareTrackableEntries("experience", profile.experience, savedProfile.experience, dirtyKeys, dirtyItems);
  compareTrackableEntries("projects", profile.projects, savedProfile.projects, dirtyKeys, dirtyItems);
  compareTrackableEntries("skills", profile.skills, savedProfile.skills, dirtyKeys, dirtyItems);

  if (!deepEqual(activeVersion.documentStyleOverrides ?? null, savedVersion.documentStyleOverrides ?? null)) {
    dirtyKeys.add("document");
  }

  if (!deepEqual(activeVersion.sectionOrder, savedVersion.sectionOrder)) {
    for (const sectionType of new Set<SectionType>([
      ...activeVersion.sectionOrder,
      ...savedVersion.sectionOrder
    ])) {
      dirtyKeys.add(sectionType);
    }
  }

  const currentBulletParents = {
    education: collectBulletParents(profile.education),
    experience: collectBulletParents(profile.experience),
    projects: collectBulletParents(profile.projects)
  };
  const savedBulletParents = {
    education: collectBulletParents(savedProfile.education),
    experience: collectBulletParents(savedProfile.experience),
    projects: collectBulletParents(savedProfile.projects)
  };
  const currentSkillParents = collectSkillParents(profile.skills);
  const savedSkillParents = collectSkillParents(savedProfile.skills);

  const sections: Array<DirtyTrackableSectionType> = ["education", "experience", "projects", "skills"];
  for (const sectionType of sections) {
    const currentSection = activeVersion.sections[sectionType];
    const savedSection = savedVersion.sections[sectionType];

    if (!deepEqual(currentSection.enabled, savedSection.enabled)) {
      dirtyKeys.add(sectionType);
    }

    const changedSelectedItems = collectChangedIds(currentSection.selectedItemIds, savedSection.selectedItemIds);
    if (changedSelectedItems.length > 0) {
      dirtyKeys.add(sectionType);
      if (sectionType === "skills") {
        for (const skillId of changedSelectedItems) {
          addDirtyItem(
            dirtyItems,
            "skills",
            currentSkillParents.get(skillId) ?? savedSkillParents.get(skillId)
          );
        }
      } else {
        for (const itemId of changedSelectedItems) {
          addDirtyItem(dirtyItems, sectionType, itemId);
        }
      }
    }

    if (sectionType === "skills") {
      continue;
    }

    const changedBulletIds = collectChangedIds(currentSection.selectedBulletIds, savedSection.selectedBulletIds);
    if (changedBulletIds.length > 0) {
      dirtyKeys.add(sectionType);
      for (const bulletId of changedBulletIds) {
        addDirtyItem(
          dirtyItems,
          sectionType,
          currentBulletParents[sectionType].get(bulletId) ?? savedBulletParents[sectionType].get(bulletId)
        );
      }
    }
  }

  return {
    dirtySidebarKeys: Array.from(dirtyKeys),
    dirtyItemIdsBySection: Object.fromEntries(
      Array.from(dirtyItems.entries()).map(([sectionType, ids]) => [sectionType, Array.from(ids)])
    ) as DirtyItemMap
  };
}
