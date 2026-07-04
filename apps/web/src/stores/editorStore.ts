import type {
  BulletPoint,
  CvProfile,
  CvVersion,
  DocumentSpacingSettings,
  DocumentTemplate,
  DocumentTypographySettings,
  EducationEntry,
  ExperienceEntry,
  LinkRef,
  ProjectEntry,
  SectionType,
  SkillGroup
} from "@cv-control/shared";
import {
  markDocumentStyleLocal,
  markSectionLocal,
  markSectionOrderLocal,
  markSummaryLocal,
  resolveCvProfileForVersion,
  resolveCvVersionInheritance,
  SECTION_TYPES
} from "@cv-control/shared";
import { create } from "zustand";
import { CvApiClient, type PdfPreviewResponse } from "../services/api/client";
import type { EditorSidebarKey } from "../types/editor";
import { useApplicationsStore } from "./applicationsStore";

type DirtyTrackableSectionType = "education" | "experience" | "projects" | "skills";
type LinkableEntrySectionType = "education" | "experience" | "projects";
type DirtyItemMap = Partial<Record<DirtyTrackableSectionType, string[]>>;

interface EditorStore {
  profile: CvProfile | null;
  savedProfile: CvProfile | null;
  versions: CvVersion[];
  savedVersions: CvVersion[];
  templates: DocumentTemplate[];
  activeVersionId: string | null;
  selectedSidebarKey: EditorSidebarKey;
  dirtySidebarKeys: EditorSidebarKey[];
  dirtyItemIdsBySection: DirtyItemMap;
  isDiagnosticsOpen: boolean;
  isBootstrapping: boolean;
  saveState: "idle" | "saving" | "saved" | "error";
  pdfPreview: PdfPreviewResponse | null;
  pdfPreviewVersionId: string | null;
  pdfPreviewState: "idle" | "loading" | "ready" | "error";
  errorMessage: string | null;
  bootstrap: () => Promise<void>;
  toggleDiagnostics: () => void;
  closeDiagnostics: () => void;
  setActiveVersion: (versionId: string) => void;
  renameVersion: (versionId: string, name: string) => void;
  setSelectedSidebarKey: (sectionType: EditorSidebarKey) => void;
  toggleSection: (sectionType: SectionType, enabled: boolean) => void;
  moveSection: (sectionType: SectionType, direction: -1 | 1) => void;
  updateDocumentTypography: (field: keyof DocumentTypographySettings, value: number | null) => void;
  updateDocumentSpacing: (field: keyof DocumentSpacingSettings, value: number | null) => void;
  updateCanonicalBasicsField: (field: keyof CvProfile["basics"], value: string) => void;
  updateVersionBasicsField: (field: keyof CvProfile["basics"], value: string | undefined) => void;
  clearVersionBasicsOverrides: () => void;
  updateSummary: (value: string) => void;
  updateSummaryLinkUrl: (value: string) => void;
  updateEducationEntry: (id: string, patch: Partial<EducationEntry>) => void;
  updateExperienceEntry: (id: string, patch: Partial<ExperienceEntry>) => void;
  updateProjectEntry: (id: string, patch: Partial<ProjectEntry>) => void;
  updateProjectDescriptionLinkUrl: (id: string, value: string) => void;
  addEntryLink: (sectionType: LinkableEntrySectionType, itemId: string) => void;
  updateEntryLink: (
    sectionType: LinkableEntrySectionType,
    itemId: string,
    linkId: string,
    patch: Partial<Pick<LinkRef, "label" | "url">>
  ) => void;
  removeEntryLink: (sectionType: LinkableEntrySectionType, itemId: string, linkId: string) => void;
  updateSkillGroupName: (id: string, name: string) => void;
  updateSkillItem: (groupId: string, itemId: string, value: string) => void;
  addSkillItem: (groupId: string) => void;
  removeSkillItem: (groupId: string, itemId: string) => void;
  toggleSkillGroupSelection: (groupId: string) => void;
  addEntry: (sectionType: "education" | "experience" | "projects" | "skills") => void;
  removeEntry: (sectionType: "education" | "experience" | "projects" | "skills", id: string) => void;
  addBullet: (sectionType: "education" | "experience" | "projects", itemId: string) => void;
  updateBullet: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    bulletId: string,
    text: string
  ) => void;
  updateBulletLinkUrl: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    bulletId: string,
    value: string
  ) => void;
  removeBullet: (
    sectionType: "education" | "experience" | "projects",
    itemId: string,
    bulletId: string
  ) => void;
  toggleItemSelection: (sectionType: "education" | "experience" | "projects" | "skills", id: string) => void;
  moveSelectedItem: (
    sectionType: "education" | "experience" | "projects" | "skills",
    id: string,
    direction: -1 | 1
  ) => void;
  toggleBulletSelection: (sectionType: "education" | "experience" | "projects", bulletId: string) => void;
  persistDrafts: () => Promise<void>;
  cloneActiveVersion: () => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;
  requestPdfPreview: () => Promise<void>;
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function moveInArray<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(targetIndex, 0, item);
  return nextItems;
}

function removeId(items: string[], id: string): string[] {
  return items.filter((item) => item !== id);
}

function addDirtyKeys(current: EditorSidebarKey[], sectionTypes: EditorSidebarKey[]): EditorSidebarKey[] {
  return Array.from(new Set([...current, ...sectionTypes]));
}

function addDirtyItemIds(
  current: DirtyItemMap,
  sectionType: DirtyTrackableSectionType,
  itemIds: string[]
): DirtyItemMap {
  return {
    ...current,
    [sectionType]: Array.from(new Set([...(current[sectionType] ?? []), ...itemIds]))
  };
}

function removeDirtyItemId(
  current: DirtyItemMap,
  sectionType: DirtyTrackableSectionType,
  itemId: string
): DirtyItemMap {
  const nextItems = (current[sectionType] ?? []).filter((candidate) => candidate !== itemId);
  if (nextItems.length === 0) {
    const { [sectionType]: _removed, ...rest } = current;
    return rest;
  }

  return {
    ...current,
    [sectionType]: nextItems
  };
}

function getPreferredSidebarSection(sectionOrder: SectionType[]): SectionType {
  return sectionOrder.find((sectionType) => sectionType !== "personalInfo") ?? "experience";
}

function normalizeDocumentStyleOverrides(
  overrides: CvVersion["documentStyleOverrides"]
): CvVersion["documentStyleOverrides"] {
  if (!overrides) {
    return undefined;
  }

  const typographyEntries = Object.entries(overrides.typography ?? {}).filter(([, value]) => value !== undefined);
  const spacingEntries = Object.entries(overrides.spacing ?? {}).filter(([, value]) => value !== undefined);

  if (typographyEntries.length === 0 && spacingEntries.length === 0) {
    return undefined;
  }

  type ResolvedOverrides = NonNullable<CvVersion["documentStyleOverrides"]>;

  return {
    typography:
      typographyEntries.length > 0
        ? (Object.fromEntries(typographyEntries) as ResolvedOverrides["typography"])
        : undefined,
    spacing:
      spacingEntries.length > 0
        ? (Object.fromEntries(spacingEntries) as ResolvedOverrides["spacing"])
        : undefined
  };
}

function normalizeBasicsOverrides(
  overrides: Partial<CvProfile["basics"]> | undefined
): Partial<CvProfile["basics"]> | undefined {
  const entries = Object.entries(overrides ?? {}).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? (Object.fromEntries(entries) as Partial<CvProfile["basics"]>) : undefined;
}

function findTrackableItemIdByBulletId(
  profile: CvProfile,
  sectionType: "education" | "experience" | "projects",
  bulletId: string
): string | null {
  const sourceItems =
    sectionType === "education"
      ? profile.education
      : sectionType === "experience"
        ? profile.experience
        : profile.projects;

  return sourceItems.find((item) => (item.bullets ?? []).some((bullet) => bullet.id === bulletId))?.id ?? null;
}

function findSkillGroupIdByItemId(profile: CvProfile, itemId: string): string | null {
  return profile.skills.find((group) => group.items.some((item) => item.id === itemId))?.id ?? null;
}

function findActiveVersion(state: Pick<EditorStore, "versions" | "activeVersionId">) {
  if (!state.activeVersionId) {
    return null;
  }

  return resolveCvVersionInheritance(state.versions, state.activeVersionId);
}

function updateActiveVersion(
  state: EditorStore,
  updater: (version: CvVersion) => CvVersion
): Pick<EditorStore, "versions"> {
  const effectiveVersion = findActiveVersion(state);
  if (!effectiveVersion) {
    return { versions: state.versions };
  }

  const versions = state.versions.map((version) =>
    version.id === state.activeVersionId ? updater(effectiveVersion) : version
  );
  return { versions };
}

function updateVersionSection(
  version: CvVersion,
  sectionType: SectionType,
  updater: (section: CvVersion["sections"][SectionType]) => CvVersion["sections"][SectionType]
): CvVersion {
  return markSectionLocal({
    ...version,
    sections: {
      ...version.sections,
      [sectionType]: updater(version.sections[sectionType])
    }
  }, sectionType);
}

function updateBullets<T extends { id: string; bullets?: BulletPoint[] }>(
  items: T[],
  itemId: string,
  updater: (bullets: BulletPoint[]) => BulletPoint[]
): T[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      bullets: updater(item.bullets ?? [])
    };
  });
}

function updateLinks<T extends { id: string; links?: LinkRef[] }>(
  items: T[],
  itemId: string,
  updater: (links: LinkRef[]) => LinkRef[] | undefined
): T[] {
  return items.map((item) => {
    if (item.id !== itemId) {
      return item;
    }

    return {
      ...item,
      links: updater(item.links ?? [])
    };
  });
}

function nextLinkState(updater: (links: LinkRef[]) => LinkRef[]): (links: LinkRef[]) => LinkRef[] | undefined {
  return (links) => {
    const nextLinks = updater(links);
    return nextLinks.length > 0 ? nextLinks : undefined;
  };
}

function createEmptyLink(): LinkRef {
  return {
    id: createId("link"),
    label: "Link",
    url: ""
  };
}

function createEmptyEducationEntry(): EducationEntry {
  return {
    id: createId("edu"),
    institution: "New institution",
    qualification: "Qualification",
    grade: "",
    bullets: []
  };
}

function createEmptyExperienceEntry(): ExperienceEntry {
  return {
    id: createId("exp"),
    role: "New role",
    organisation: "Organisation",
    location: "",
    bullets: []
  };
}

function createEmptyProjectEntry(): ProjectEntry {
  return {
    id: createId("proj"),
    title: "New project",
    description: "",
    technologies: [],
    bullets: []
  };
}

function createEmptySkillGroup(): SkillGroup {
  return {
    id: createId("skill-group"),
    name: "New skill group",
    items: [createEmptySkillItem()]
  };
}

function createEmptySkillItem() {
  return {
    id: createId("skill"),
    label: "New skill"
  };
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  profile: null,
  savedProfile: null,
  versions: [],
  savedVersions: [],
  templates: [],
  activeVersionId: null,
  selectedSidebarKey: "experience",
  dirtySidebarKeys: [],
  dirtyItemIdsBySection: {},
  isDiagnosticsOpen: false,
  isBootstrapping: true,
  saveState: "idle",
  pdfPreview: null,
  pdfPreviewVersionId: null,
  pdfPreviewState: "idle",
  errorMessage: null,

  async bootstrap() {
    set({ isBootstrapping: true, errorMessage: null });
    try {
      const data = await CvApiClient.getBootstrap();
      useApplicationsStore.getState().hydrate(data.applications ?? []);
      set({
        profile: data.profile,
        savedProfile: data.profile,
        versions: data.versions,
        savedVersions: data.versions,
        templates: data.templates,
        activeVersionId: data.activeVersionId,
        selectedSidebarKey: getPreferredSidebarSection(data.versions[0]?.sectionOrder ?? []),
        dirtySidebarKeys: [],
        dirtyItemIdsBySection: {},
        isBootstrapping: false
      });
    } catch (error) {
      set({
        isBootstrapping: false,
        errorMessage: error instanceof Error ? error.message : "Bootstrap failed"
      });
    }
  },

  toggleDiagnostics() {
    set((state) => ({ isDiagnosticsOpen: !state.isDiagnosticsOpen }));
  },

  closeDiagnostics() {
    set({ isDiagnosticsOpen: false });
  },

  setActiveVersion(versionId) {
    const version = get().versions.find((item) => item.id === versionId);
    const currentSelection = get().selectedSidebarKey;
    set({
      activeVersionId: versionId,
      selectedSidebarKey:
        currentSelection === "document"
          ? "document"
          : getPreferredSidebarSection(version?.sectionOrder ?? [])
    });
  },

  renameVersion(versionId, name) {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    set((state) => ({
      versions: state.versions.map((version) =>
        version.id === versionId ? { ...version, name: trimmedName } : version
      ),
      saveState: "idle"
    }));
  },

  setSelectedSidebarKey(sectionType) {
    set({ selectedSidebarKey: sectionType });
  },

  toggleSection(sectionType, enabled) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      const nextVersion = updateVersionSection(activeVersion, sectionType, (section) => ({
        ...section,
        enabled
      }));
      const nextOrder = enabled
        ? nextVersion.sectionOrder.includes(sectionType)
          ? nextVersion.sectionOrder
          : [...nextVersion.sectionOrder, sectionType]
        : nextVersion.sectionOrder.filter((item) => item !== sectionType);

      return updateActiveVersion(state, () => ({
        ...markSectionOrderLocal(nextVersion),
        sectionOrder: nextOrder
      }));
    });
    set((state) => ({
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
      saveState: "idle"
    }));
  },

  moveSection(sectionType, direction) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      const index = activeVersion.sectionOrder.indexOf(sectionType);
      if (index === -1) {
        return {};
      }

      return updateActiveVersion(state, () => ({
        ...markSectionOrderLocal(activeVersion),
        sectionOrder: moveInArray(activeVersion.sectionOrder, index, direction)
      }));
    });
    set((state) => ({
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
      saveState: "idle"
    }));
  },

  updateDocumentTypography(field, value) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      const typography = { ...(activeVersion.documentStyleOverrides?.typography ?? {}) };
      if (value === null) {
        delete typography[field];
      } else {
        typography[field] = value;
      }

      const documentStyleOverrides = normalizeDocumentStyleOverrides({
        ...activeVersion.documentStyleOverrides,
        typography
      });

      return {
        ...updateActiveVersion(state, () => ({
          ...markDocumentStyleLocal(activeVersion),
          documentStyleOverrides
        })),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["document"]),
        saveState: "idle"
      };
    });
  },

  updateDocumentSpacing(field, value) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      const spacing = { ...(activeVersion.documentStyleOverrides?.spacing ?? {}) };
      if (value === null) {
        delete spacing[field];
      } else {
        spacing[field] = value;
      }

      const documentStyleOverrides = normalizeDocumentStyleOverrides({
        ...activeVersion.documentStyleOverrides,
        spacing
      });

      return {
        ...updateActiveVersion(state, () => ({
          ...markDocumentStyleLocal(activeVersion),
          documentStyleOverrides
        })),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["document"]),
        saveState: "idle"
      };
    });
  },

  updateCanonicalBasicsField(field, value) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            basics: {
              ...state.profile.basics,
              [field]: value
            }
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["personalInfo"]),
      saveState: "idle"
    }));
  },

  updateVersionBasicsField(field, value) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      const basics = normalizeBasicsOverrides({
        ...activeVersion.contentOverrides?.basics,
        [field]: value
      });
      const hasBasicsOverrides = Boolean(basics);

      return {
        ...updateActiveVersion(state, (version) => {
          const { basics: _removedBasics, ...contentOverridesWithoutBasics } =
            version.contentOverrides ?? {};

          return {
            ...version,
            localOverrides: {
              ...version.localOverrides,
              basics: hasBasicsOverrides
            },
            contentOverrides: hasBasicsOverrides
              ? {
                  ...version.contentOverrides,
                  basics
                }
              : contentOverridesWithoutBasics
          };
        }),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["personalInfo"]),
        saveState: "idle"
      };
    });
  },

  clearVersionBasicsOverrides() {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      return {
        ...updateActiveVersion(state, (version) => {
          const { basics: _removedBasics, ...contentOverrides } = version.contentOverrides ?? {};
          return {
            ...version,
            localOverrides: {
              ...version.localOverrides,
              basics: false
            },
            contentOverrides
          };
        }),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["personalInfo"]),
        saveState: "idle"
      };
    });
  },

  updateSummary(value) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const activeVersion = findActiveVersion(state);
      if (activeVersion?.parentVersionId) {
        const effectiveProfile = resolveCvProfileForVersion(state.profile, activeVersion);
        return {
          ...updateActiveVersion(state, (version) =>
            markSummaryLocal({
              ...version,
              contentOverrides: {
                ...version.contentOverrides,
                summary: {
                  text: value,
                  linkUrl: effectiveProfile.summary?.linkUrl
                }
              }
            })
          ),
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["summary"]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          summary: {
            text: value,
            linkUrl: state.profile.summary?.linkUrl
          }
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["summary"]),
        saveState: "idle"
      };
    });
  },

  updateSummaryLinkUrl(value) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const activeVersion = findActiveVersion(state);
      if (activeVersion?.parentVersionId) {
        const effectiveProfile = resolveCvProfileForVersion(state.profile, activeVersion);
        return {
          ...updateActiveVersion(state, (version) =>
            markSummaryLocal({
              ...version,
              contentOverrides: {
                ...version.contentOverrides,
                summary: {
                  text: effectiveProfile.summary?.text ?? "",
                  linkUrl: value
                }
              }
            })
          ),
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["summary"]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          summary: {
            text: state.profile.summary?.text ?? "",
            linkUrl: value
          }
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["summary"]),
        saveState: "idle"
      };
    });
  },

  updateEducationEntry(id, patch) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            education: state.profile.education.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry
            )
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
      dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [id]),
      saveState: "idle"
    }));
  },

  updateExperienceEntry(id, patch) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            experience: state.profile.experience.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry
            )
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
      dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [id]),
      saveState: "idle"
    }));
  },

  updateProjectEntry(id, patch) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            projects: state.profile.projects.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry
            )
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
      dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [id]),
      saveState: "idle"
    }));
  },

  updateProjectDescriptionLinkUrl(id, value) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            projects: state.profile.projects.map((entry) =>
              entry.id === id ? { ...entry, descriptionLinkUrl: value } : entry
            )
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
      dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [id]),
      saveState: "idle"
    }));
  },

  addEntryLink(sectionType, itemId) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const updater = nextLinkState((links) => [...links, createEmptyLink()]);

      if (sectionType === "education") {
        return {
          profile: {
            ...state.profile,
            education: updateLinks(state.profile.education, itemId, updater)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [itemId]),
          saveState: "idle"
        };
      }

      if (sectionType === "experience") {
        return {
          profile: {
            ...state.profile,
            experience: updateLinks(state.profile.experience, itemId, updater)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [itemId]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          projects: updateLinks(state.profile.projects, itemId, updater)
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [itemId]),
        saveState: "idle"
      };
    });
  },

  updateEntryLink(sectionType, itemId, linkId, patch) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const updater = nextLinkState((links) =>
        links.map((link) => (link.id === linkId ? { ...link, ...patch } : link))
      );

      if (sectionType === "education") {
        return {
          profile: {
            ...state.profile,
            education: updateLinks(state.profile.education, itemId, updater)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [itemId]),
          saveState: "idle"
        };
      }

      if (sectionType === "experience") {
        return {
          profile: {
            ...state.profile,
            experience: updateLinks(state.profile.experience, itemId, updater)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [itemId]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          projects: updateLinks(state.profile.projects, itemId, updater)
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [itemId]),
        saveState: "idle"
      };
    });
  },

  removeEntryLink(sectionType, itemId, linkId) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const updater = nextLinkState((links) => links.filter((link) => link.id !== linkId));

      if (sectionType === "education") {
        return {
          profile: {
            ...state.profile,
            education: updateLinks(state.profile.education, itemId, updater)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [itemId]),
          saveState: "idle"
        };
      }

      if (sectionType === "experience") {
        return {
          profile: {
            ...state.profile,
            experience: updateLinks(state.profile.experience, itemId, updater)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [itemId]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          projects: updateLinks(state.profile.projects, itemId, updater)
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [itemId]),
        saveState: "idle"
      };
    });
  },

  updateSkillGroupName(id, name) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            skills: state.profile.skills.map((group) =>
              group.id === id ? { ...group, name } : group
            )
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
      dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [id]),
      saveState: "idle"
    }));
  },

  updateSkillItem(groupId, itemId, value) {
    set((state) => ({
      profile: state.profile
        ? {
            ...state.profile,
            skills: state.profile.skills.map((group) =>
              group.id === groupId
                ? {
                    ...group,
                    items: group.items.map((item) =>
                      item.id === itemId ? { ...item, label: value } : item
                    )
                  }
                : group
            )
          }
        : null,
      dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
      dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [groupId]),
      saveState: "idle"
    }));
  },

  addSkillItem(groupId) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const nextSkill = createEmptySkillItem();
      const groupExists = state.profile.skills.some((group) => group.id === groupId);
      if (!groupExists) {
        return {};
      }

      return {
        profile: {
          ...state.profile,
          skills: state.profile.skills.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  items: [...group.items, nextSkill]
                }
              : group
          )
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [groupId]),
        saveState: "idle"
      };
    });
  },

  removeSkillItem(groupId, itemId) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const group = state.profile.skills.find((candidate) => candidate.id === groupId);
      if (!group || !group.items.some((item) => item.id === itemId)) {
        return {};
      }

      const nextProfile = {
        ...state.profile,
        skills: state.profile.skills.map((candidate) =>
          candidate.id === groupId
            ? {
                ...candidate,
                items: candidate.items.filter((item) => item.id !== itemId)
              }
            : candidate
        )
      };
      const activeVersion = findActiveVersion(state);

      if (!activeVersion) {
        return {
          profile: nextProfile,
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [groupId]),
          saveState: "idle"
        };
      }

      const normalizedVersion = updateVersionSection(activeVersion, "skills", (section) => ({
        ...section,
        selectedItemIds: removeId(section.selectedItemIds, itemId)
      }));

      return {
        profile: nextProfile,
        ...updateActiveVersion(state, () => normalizedVersion),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [groupId]),
        saveState: "idle"
      };
    });
  },

  toggleSkillGroupSelection(groupId) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!state.profile || !activeVersion) {
        return {};
      }

      const group = state.profile.skills.find((candidate) => candidate.id === groupId);
      if (!group) {
        return {};
      }

      const section = activeVersion.sections.skills;
      const groupSkillIds = group.items.map((item) => item.id);
      const allSelected = groupSkillIds.every((itemId) => section.selectedItemIds.includes(itemId));
      const nextSelectedItemIds = allSelected
        ? section.selectedItemIds.filter((itemId) => !groupSkillIds.includes(itemId))
        : Array.from(new Set([...section.selectedItemIds, ...groupSkillIds]));

      return {
        ...updateActiveVersion(state, (version) =>
          updateVersionSection(version, "skills", (currentSection) => ({
            ...currentSection,
            selectedItemIds: nextSelectedItemIds
          }))
        ),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [groupId]),
        saveState: "idle"
      };
    });
  },

  addEntry(sectionType) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      switch (sectionType) {
        case "education": {
          const nextEntry = createEmptyEducationEntry();
          return {
            profile: {
              ...state.profile,
              education: [...state.profile.education, nextEntry]
            },
            dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
            dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [nextEntry.id]),
            saveState: "idle"
          };
        }
        case "experience": {
          const nextEntry = createEmptyExperienceEntry();
          return {
            profile: {
              ...state.profile,
              experience: [...state.profile.experience, nextEntry]
            },
            dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
            dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [nextEntry.id]),
            saveState: "idle"
          };
        }
        case "projects": {
          const nextEntry = createEmptyProjectEntry();
          return {
            profile: {
              ...state.profile,
              projects: [...state.profile.projects, nextEntry]
            },
            dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
            dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [nextEntry.id]),
            saveState: "idle"
          };
        }
        case "skills": {
          const nextGroup = createEmptySkillGroup();
          return {
            profile: {
              ...state.profile,
              skills: [...state.profile.skills, nextGroup]
            },
            dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["skills"]),
            dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "skills", [nextGroup.id]),
            saveState: "idle"
          };
        }
      }
    });
  },

  removeEntry(sectionType, id) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const activeVersion = findActiveVersion(state);
      const nextProfile =
        sectionType === "education"
          ? { ...state.profile, education: state.profile.education.filter((item) => item.id !== id) }
          : sectionType === "experience"
            ? { ...state.profile, experience: state.profile.experience.filter((item) => item.id !== id) }
            : sectionType === "projects"
              ? { ...state.profile, projects: state.profile.projects.filter((item) => item.id !== id) }
              : {
                  ...state.profile,
                  skills: state.profile.skills.filter((group) => group.id !== id)
                };

      if (!activeVersion) {
        return { profile: nextProfile };
      }

      const normalizedVersion = SECTION_TYPES.reduce<CvVersion>((version, type) => {
        const section = version.sections[type];
        const nextSelected =
          sectionType === "skills" && type === "skills"
            ? section.selectedItemIds.filter((itemId) =>
                nextProfile.skills.some((group) => group.items.some((item) => item.id === itemId))
              )
            : type === sectionType
              ? removeId(section.selectedItemIds, id)
              : section.selectedItemIds;

        return updateVersionSection(version, type, () => ({
          ...section,
          selectedItemIds: nextSelected
        }));
      }, activeVersion);

      return {
        profile: nextProfile,
        ...updateActiveVersion(state, () => normalizedVersion),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
        dirtyItemIdsBySection: removeDirtyItemId(
          state.dirtyItemIdsBySection,
          sectionType,
          id
        ),
        saveState: "idle"
      };
    });
  },

  addBullet(sectionType, itemId) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const bullet = {
        id: createId("bullet"),
        text: "New bullet"
      };

      if (sectionType === "education") {
        return {
          profile: {
            ...state.profile,
            education: updateBullets(state.profile.education, itemId, (bullets) => [...bullets, bullet])
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [itemId]),
          saveState: "idle"
        };
      }

      if (sectionType === "experience") {
        return {
          profile: {
            ...state.profile,
            experience: updateBullets(state.profile.experience, itemId, (bullets) => [...bullets, bullet])
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [itemId]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          projects: updateBullets(state.profile.projects, itemId, (bullets) => [...bullets, bullet])
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [itemId]),
        saveState: "idle"
      };
    });
  },

  updateBullet(sectionType, itemId, bulletId, text) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const updateBulletList = (bullets: BulletPoint[]) =>
        bullets.map((bullet) => (bullet.id === bulletId ? { ...bullet, text } : bullet));

      if (sectionType === "education") {
        return {
          profile: {
            ...state.profile,
            education: updateBullets(state.profile.education, itemId, updateBulletList)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [itemId]),
          saveState: "idle"
        };
      }

      if (sectionType === "experience") {
        return {
          profile: {
            ...state.profile,
            experience: updateBullets(state.profile.experience, itemId, updateBulletList)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [itemId]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          projects: updateBullets(state.profile.projects, itemId, updateBulletList)
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [itemId]),
        saveState: "idle"
      };
    });
  },

  updateBulletLinkUrl(sectionType, itemId, bulletId, value) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const updateBulletList = (bullets: BulletPoint[]) =>
        bullets.map((bullet) => (bullet.id === bulletId ? { ...bullet, linkUrl: value } : bullet));

      if (sectionType === "education") {
        return {
          profile: {
            ...state.profile,
            education: updateBullets(state.profile.education, itemId, updateBulletList)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["education"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "education", [itemId]),
          saveState: "idle"
        };
      }

      if (sectionType === "experience") {
        return {
          profile: {
            ...state.profile,
            experience: updateBullets(state.profile.experience, itemId, updateBulletList)
          },
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["experience"]),
          dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "experience", [itemId]),
          saveState: "idle"
        };
      }

      return {
        profile: {
          ...state.profile,
          projects: updateBullets(state.profile.projects, itemId, updateBulletList)
        },
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, ["projects"]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, "projects", [itemId]),
        saveState: "idle"
      };
    });
  },

  removeBullet(sectionType, itemId, bulletId) {
    set((state) => {
      if (!state.profile) {
        return {};
      }

      const updateBulletList = (bullets: BulletPoint[]) =>
        bullets.filter((bullet) => bullet.id !== bulletId);
      const activeVersion = findActiveVersion(state);

      const nextProfile =
        sectionType === "education"
          ? {
              ...state.profile,
              education: updateBullets(state.profile.education, itemId, updateBulletList)
            }
          : sectionType === "experience"
            ? {
                ...state.profile,
                experience: updateBullets(state.profile.experience, itemId, updateBulletList)
              }
            : {
                ...state.profile,
                projects: updateBullets(state.profile.projects, itemId, updateBulletList)
              };

      if (!activeVersion) {
        return { profile: nextProfile };
      }

      const normalizedVersion = updateVersionSection(activeVersion, sectionType, (section) => ({
        ...section,
        selectedBulletIds: removeId(section.selectedBulletIds, bulletId)
      }));

      return {
        profile: nextProfile,
        ...updateActiveVersion(state, () => normalizedVersion),
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
        dirtyItemIdsBySection: addDirtyItemIds(state.dirtyItemIdsBySection, sectionType, [itemId]),
        saveState: "idle"
      };
    });
  },

  toggleItemSelection(sectionType, id) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      return updateActiveVersion(state, (version) =>
        updateVersionSection(version, sectionType, (section) => ({
          ...section,
          selectedItemIds: section.selectedItemIds.includes(id)
            ? section.selectedItemIds.filter((itemId) => itemId !== id)
            : [...section.selectedItemIds, id]
        }))
      );
    });
    set((state) => {
      const trackableId =
        sectionType === "skills" && state.profile
          ? findSkillGroupIdByItemId(state.profile, id)
          : id;

      return {
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
        dirtyItemIdsBySection:
          trackableId && (sectionType === "education" || sectionType === "experience" || sectionType === "projects" || sectionType === "skills")
            ? addDirtyItemIds(state.dirtyItemIdsBySection, sectionType, [trackableId])
            : state.dirtyItemIdsBySection,
        saveState: "idle"
      };
    });
  },

  moveSelectedItem(sectionType, id, direction) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      const section = activeVersion.sections[sectionType];
      const index = section.selectedItemIds.indexOf(id);
      if (index === -1) {
        return {};
      }

      return updateActiveVersion(state, (version) =>
        updateVersionSection(version, sectionType, (currentSection) => ({
          ...currentSection,
          selectedItemIds: moveInArray(currentSection.selectedItemIds, index, direction)
        }))
      );
    });
    set((state) => {
      const trackableId =
        sectionType === "skills" && state.profile
          ? findSkillGroupIdByItemId(state.profile, id)
          : id;

      return {
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
        dirtyItemIdsBySection:
          trackableId && (sectionType === "education" || sectionType === "experience" || sectionType === "projects" || sectionType === "skills")
            ? addDirtyItemIds(state.dirtyItemIdsBySection, sectionType, [trackableId])
            : state.dirtyItemIdsBySection,
        saveState: "idle"
      };
    });
  },

  toggleBulletSelection(sectionType, bulletId) {
    set((state) => {
      const activeVersion = findActiveVersion(state);
      if (!activeVersion) {
        return {};
      }

      return updateActiveVersion(state, (version) =>
        updateVersionSection(version, sectionType, (section) => ({
          ...section,
          selectedBulletIds: section.selectedBulletIds.includes(bulletId)
            ? section.selectedBulletIds.filter((id) => id !== bulletId)
            : [...section.selectedBulletIds, bulletId]
        }))
      );
    });
    set((state) => {
      if (!state.profile) {
        return {
          dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
          saveState: "idle"
        };
      }

      const parentItemId = findTrackableItemIdByBulletId(state.profile, sectionType, bulletId);
      return {
        dirtySidebarKeys: addDirtyKeys(state.dirtySidebarKeys, [sectionType]),
        dirtyItemIdsBySection: parentItemId
          ? addDirtyItemIds(state.dirtyItemIdsBySection, sectionType, [parentItemId])
          : state.dirtyItemIdsBySection,
        saveState: "idle"
      };
    });
  },

  async persistDrafts() {
    const state = get();
    const activeVersion = findActiveVersion(state);
    if (!state.profile || !activeVersion) {
      return;
    }

    set({ saveState: "saving", errorMessage: null });
    try {
      await CvApiClient.saveProfile(state.profile);
      await Promise.all(state.versions.map((version) => CvApiClient.saveVersion(version)));
      set({ pdfPreviewState: "loading" });
      const effectiveProfile = resolveCvProfileForVersion(state.profile, activeVersion);
      const preview = await CvApiClient.requestPdfPreview(
        effectiveProfile,
        activeVersion,
        activeVersion.documentTemplateId
      );
      set({
        savedProfile: state.profile,
        savedVersions: state.versions,
        saveState: "saved",
        dirtySidebarKeys: [],
        dirtyItemIdsBySection: {},
        pdfPreview: preview,
        pdfPreviewVersionId: activeVersion.id,
        pdfPreviewState: "ready"
      });
    } catch (error) {
      set({
        saveState: "error",
        errorMessage: error instanceof Error ? error.message : "Save failed"
      });
    }
  },

  async cloneActiveVersion() {
    const activeVersion = findActiveVersion(get());
    if (!activeVersion) {
      return;
    }

    try {
      const cloned = await CvApiClient.cloneVersion(activeVersion.id, `${activeVersion.name} Branch`);
      set((state) => ({
        versions: [cloned, ...state.versions],
        savedVersions: [cloned, ...state.savedVersions],
        activeVersionId: cloned.id
      }));
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Clone failed"
      });
    }
  },

  async deleteVersion(versionId) {
    const state = get();
    if (state.versions.length <= 1) {
      return;
    }

    try {
      await CvApiClient.deleteVersion(versionId);
      useApplicationsStore.getState().clearVersionLinks(versionId);
      set((current) => {
        const versions = current.versions.filter((version) => version.id !== versionId);
        const savedVersions = current.savedVersions.filter(
          (version) => version.id !== versionId
        );
        const activeVersionId =
          current.activeVersionId === versionId
            ? versions[0]?.id ?? null
            : current.activeVersionId;
        return {
          versions,
          savedVersions,
          activeVersionId,
          errorMessage: null,
          pdfPreview: current.pdfPreviewVersionId === versionId ? null : current.pdfPreview,
          pdfPreviewVersionId:
            current.pdfPreviewVersionId === versionId ? null : current.pdfPreviewVersionId
        };
      });
    } catch (error) {
      set({
        errorMessage: error instanceof Error ? error.message : "Delete failed"
      });
    }
  },

  async requestPdfPreview() {
    const state = get();
    const activeVersion = findActiveVersion(state);
    if (!state.profile || !activeVersion) {
      return;
    }

    set({ pdfPreviewState: "loading" });
    try {
      const effectiveProfile = resolveCvProfileForVersion(state.profile, activeVersion);
      const preview = await CvApiClient.requestPdfPreview(
        effectiveProfile,
        activeVersion,
        activeVersion.documentTemplateId
      );
      set({
        pdfPreview: preview,
        pdfPreviewVersionId: activeVersion.id,
        pdfPreviewState: "ready"
      });
    } catch (error) {
      set({
        pdfPreviewState: "error",
        errorMessage: error instanceof Error ? error.message : "Preview failed"
      });
    }
  }
}));
