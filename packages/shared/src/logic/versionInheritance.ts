import type { CvProfile } from "../types/cv";
import { SECTION_TYPES, type CvVersion, type SectionType } from "../types/version";

function cloneSection(section: CvVersion["sections"][SectionType]) {
  return {
    ...section,
    selectedItemIds: [...section.selectedItemIds],
    selectedBulletIds: [...section.selectedBulletIds]
  };
}

function cloneSections(sections: CvVersion["sections"]): CvVersion["sections"] {
  return SECTION_TYPES.reduce<CvVersion["sections"]>((nextSections, sectionType) => {
    nextSections[sectionType] = cloneSection(sections[sectionType]);
    return nextSections;
  }, {} as CvVersion["sections"]);
}

export function createInheritedLocalOverrides(): CvVersion["localOverrides"] {
  return {
    documentTemplateId: false,
    documentStyleOverrides: false,
    sectionOrder: false,
    summary: false,
    basics: false,
    sections: SECTION_TYPES.reduce<NonNullable<CvVersion["localOverrides"]>["sections"]>(
      (sections, sectionType) => ({
        ...sections,
        [sectionType]: false
      }),
      {}
    )
  };
}

export function markDocumentTemplateLocal(version: CvVersion): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      documentTemplateId: true
    }
  };
}

export function markDocumentStyleLocal(version: CvVersion): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      documentStyleOverrides: true
    }
  };
}

export function markSectionOrderLocal(version: CvVersion): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      sectionOrder: true
    }
  };
}

export function markSummaryLocal(version: CvVersion): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      summary: true
    }
  };
}

export function markBasicsLocal(version: CvVersion): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      basics: true
    }
  };
}

export function markSectionLocal(version: CvVersion, sectionType: SectionType): CvVersion {
  return {
    ...version,
    localOverrides: {
      ...version.localOverrides,
      sections: {
        ...version.localOverrides?.sections,
        [sectionType]: true
      }
    }
  };
}

export function resolveCvVersionInheritance(
  versions: CvVersion[],
  versionId: string
): CvVersion | null {
  const byId = new Map(versions.map((version) => [version.id, version]));
  const version = byId.get(versionId);

  if (!version) {
    return null;
  }

  const visit = (current: CvVersion, seen: Set<string>): CvVersion => {
    if (!current.parentVersionId) {
      return {
        ...current,
        sectionOrder: [...current.sectionOrder],
        sections: cloneSections(current.sections)
      };
    }

    const parent = byId.get(current.parentVersionId);
    if (!parent || seen.has(current.parentVersionId)) {
      return {
        ...current,
        parentVersionId: null,
        sectionOrder: [...current.sectionOrder],
        sections: cloneSections(current.sections)
      };
    }

    seen.add(current.id);
    const inherited = visit(parent, seen);
    const localOverrides = current.localOverrides;

    return {
      ...current,
      documentTemplateId:
        localOverrides?.documentTemplateId === true
          ? current.documentTemplateId
          : inherited.documentTemplateId,
      documentStyleOverrides:
        localOverrides?.documentStyleOverrides === true
          ? current.documentStyleOverrides
          : inherited.documentStyleOverrides,
      contentOverrides: {
        ...inherited.contentOverrides,
        ...(localOverrides?.summary === true
          ? { summary: current.contentOverrides?.summary ?? null }
          : {}),
        ...(localOverrides?.basics === true
          ? { basics: current.contentOverrides?.basics ?? {} }
          : {})
      },
      sectionOrder:
        localOverrides?.sectionOrder === true
          ? [...current.sectionOrder]
          : [...inherited.sectionOrder],
      sections: SECTION_TYPES.reduce<CvVersion["sections"]>((sections, sectionType) => {
        sections[sectionType] =
          localOverrides?.sections?.[sectionType] === true
            ? cloneSection(current.sections[sectionType])
            : cloneSection(inherited.sections[sectionType]);
        return sections;
      }, {} as CvVersion["sections"])
    };
  };

  return visit(version, new Set());
}

export function resolveCvProfileForVersion(profile: CvProfile, version: CvVersion): CvProfile {
  const hasSummaryOverride = Boolean(version.contentOverrides && "summary" in version.contentOverrides);
  const hasBasicsOverride = Boolean(version.contentOverrides && "basics" in version.contentOverrides);

  if (!hasSummaryOverride && !hasBasicsOverride) {
    return profile;
  }

  const definedBasicsOverrides = Object.fromEntries(
    Object.entries(version.contentOverrides?.basics ?? {}).filter(([, value]) => value !== undefined)
  ) as Partial<CvProfile["basics"]>;

  return {
    ...profile,
    ...(hasSummaryOverride ? { summary: version.contentOverrides?.summary ?? null } : {}),
    ...(hasBasicsOverride
      ? {
          basics: {
            ...profile.basics,
            ...definedBasicsOverrides
          }
        }
      : {})
  };
}

export function getVersionDepth(versions: CvVersion[], version: CvVersion): number {
  const byId = new Map(versions.map((candidate) => [candidate.id, candidate]));
  let depth = 0;
  let parentId = version.parentVersionId;
  const seen = new Set<string>([version.id]);

  while (parentId && !seen.has(parentId)) {
    const parent = byId.get(parentId);
    if (!parent) {
      break;
    }
    seen.add(parentId);
    depth += 1;
    parentId = parent.parentVersionId;
  }

  return depth;
}
