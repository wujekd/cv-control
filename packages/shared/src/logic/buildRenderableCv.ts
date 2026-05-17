import type {
  CvProfile,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillGroup
} from "../types/cv";
import type { BuildRenderableCvResult, RenderDiagnostic, RenderableSection } from "../types/renderable";
import type { DocumentStyleSettings, DocumentTemplate } from "../types/template";
import { REQUIRED_SECTION_TYPES, SECTION_TYPES, type CvVersion, type SectionType } from "../types/version";
import { getPageSlotOverflowDiagnostic } from "./layoutDiagnostics";

export function resolveDocumentStyle(
  template: DocumentTemplate,
  overrides?: CvVersion["documentStyleOverrides"]
): DocumentStyleSettings {
  return {
    typography: {
      ...template.styleDefaults.typography,
      ...overrides?.typography
    },
    spacing: {
      ...template.styleDefaults.spacing,
      ...overrides?.spacing
    }
  };
}

function cloneWithSelectedBullets<T extends { bullets?: { id: string; text: string; tags?: string[]; priority?: number }[] }>(
  item: T,
  selectedBulletIds: Set<string>
): T {
  if (!item.bullets) {
    return item;
  }

  const filteredBullets = item.bullets.filter((bullet) => selectedBulletIds.has(bullet.id));

  return {
    ...item,
    bullets: filteredBullets
  };
}

function reportUnknownBulletIds<T extends { bullets?: { id: string }[] }>(
  sectionType: SectionType,
  items: T[],
  selectedBulletIds: Set<string>,
  diagnostics: RenderDiagnostic[]
) {
  const allBulletIds = new Set(items.flatMap((item) => item.bullets?.map((bullet) => bullet.id) ?? []));

  for (const bulletId of selectedBulletIds) {
    if (allBulletIds.has(bulletId)) {
      continue;
    }

    diagnostics.push({
      code: "unknown_bullet_id",
      level: "warning",
      message: `Section "${sectionType}" references unknown bullet ID "${bulletId}".`,
      sectionType
    });
  }
}

function orderItemsByIds<T extends { id: string }>(
  sectionType: SectionType,
  items: T[],
  selectedIds: string[],
  diagnostics: RenderDiagnostic[]
): T[] {
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const orderedItems: T[] = [];

  for (const id of selectedIds) {
    const item = itemMap.get(id);
    if (!item) {
      diagnostics.push({
        code: "unknown_item_id",
        level: "warning",
        message: `Section "${sectionType}" references unknown item ID "${id}".`,
        sectionType
      });
      continue;
    }
    orderedItems.push(item);
  }

  return orderedItems;
}

function buildEducationSection(
  profile: CvProfile,
  version: CvVersion,
  template: DocumentTemplate,
  diagnostics: RenderDiagnostic[]
): RenderableSection {
  const state = version.sections.education;
  const selectedBulletIds = new Set(state.selectedBulletIds);
  const orderedItems = orderItemsByIds("education", profile.education, state.selectedItemIds, diagnostics);
  reportUnknownBulletIds("education", orderedItems, selectedBulletIds, diagnostics);
  const items = orderedItems.map((item) => cloneWithSelectedBullets<EducationEntry>(item, selectedBulletIds));
  const sectionTemplate = template.sectionTemplates.education;

  return {
    type: "education",
    title: sectionTemplate.title,
    enabled: true,
    reserved: true,
    slotHeightMm: sectionTemplate.slotHeightMm,
    titleHeightMm: sectionTemplate.titleHeightMm,
    contentPaddingMm: sectionTemplate.contentPaddingMm,
    contentAlignY: sectionTemplate.contentAlignY,
    items
  };
}

function buildExperienceSection(
  profile: CvProfile,
  version: CvVersion,
  template: DocumentTemplate,
  diagnostics: RenderDiagnostic[]
): RenderableSection {
  const state = version.sections.experience;
  const selectedBulletIds = new Set(state.selectedBulletIds);
  const orderedItems = orderItemsByIds("experience", profile.experience, state.selectedItemIds, diagnostics);
  reportUnknownBulletIds("experience", orderedItems, selectedBulletIds, diagnostics);
  const items = orderedItems.map((item) => cloneWithSelectedBullets<ExperienceEntry>(item, selectedBulletIds));
  const sectionTemplate = template.sectionTemplates.experience;

  return {
    type: "experience",
    title: sectionTemplate.title,
    enabled: true,
    reserved: true,
    slotHeightMm: sectionTemplate.slotHeightMm,
    titleHeightMm: sectionTemplate.titleHeightMm,
    contentPaddingMm: sectionTemplate.contentPaddingMm,
    contentAlignY: sectionTemplate.contentAlignY,
    items
  };
}

function buildProjectsSection(
  profile: CvProfile,
  version: CvVersion,
  template: DocumentTemplate,
  diagnostics: RenderDiagnostic[]
): RenderableSection {
  const state = version.sections.projects;
  const selectedBulletIds = new Set(state.selectedBulletIds);
  const orderedItems = orderItemsByIds("projects", profile.projects, state.selectedItemIds, diagnostics);
  reportUnknownBulletIds("projects", orderedItems, selectedBulletIds, diagnostics);
  const items = orderedItems.map((item) => cloneWithSelectedBullets<ProjectEntry>(item, selectedBulletIds));
  const sectionTemplate = template.sectionTemplates.projects;

  return {
    type: "projects",
    title: sectionTemplate.title,
    enabled: true,
    reserved: true,
    slotHeightMm: sectionTemplate.slotHeightMm,
    titleHeightMm: sectionTemplate.titleHeightMm,
    contentPaddingMm: sectionTemplate.contentPaddingMm,
    contentAlignY: sectionTemplate.contentAlignY,
    items
  };
}

function buildSkillsGroups(groups: SkillGroup[], selectedIds: Set<string>): SkillGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => selectedIds.has(item.id))
    }))
    .filter((group) => group.items.length > 0);
}

export function buildRenderableCv(
  profile: CvProfile,
  version: CvVersion,
  template: DocumentTemplate
): BuildRenderableCvResult {
  const diagnostics: RenderDiagnostic[] = [];
  const style = resolveDocumentStyle(template, version.documentStyleOverrides);
  const enabledSectionTypes = new Set(
    SECTION_TYPES.filter((sectionType) => version.sections[sectionType]?.enabled)
  );

  for (const sectionType of REQUIRED_SECTION_TYPES) {
    if (!version.sections[sectionType]?.enabled) {
      diagnostics.push({
        code: "missing_required_section",
        level: "error",
        message: `Required section "${sectionType}" is disabled.`,
        sectionType
      });
      enabledSectionTypes.add(sectionType);
    }
  }

  const orderedSections: SectionType[] = [];
  for (const sectionType of version.sectionOrder) {
    if (!enabledSectionTypes.has(sectionType)) {
      continue;
    }
    orderedSections.push(sectionType);
  }

  for (const sectionType of enabledSectionTypes) {
    if (orderedSections.includes(sectionType)) {
      continue;
    }
    diagnostics.push({
      code: "section_missing_from_order",
      level: "warning",
      message: `Enabled section "${sectionType}" was missing from sectionOrder and has been appended.`,
      sectionType
    });
    orderedSections.push(sectionType);
  }

  const sections = orderedSections.map((sectionType): RenderableSection => {
    const sectionTemplate = template.sectionTemplates[sectionType];

    switch (sectionType) {
      case "personalInfo":
        return {
          type: "personalInfo",
          title: sectionTemplate.title,
          enabled: true,
          reserved: true,
          slotHeightMm: sectionTemplate.slotHeightMm,
          titleHeightMm: sectionTemplate.titleHeightMm,
          contentPaddingMm: sectionTemplate.contentPaddingMm,
          contentAlignY: sectionTemplate.contentAlignY,
          basics: profile.basics
        };
      case "summary":
        return {
          type: "summary",
          title: sectionTemplate.title,
          enabled: true,
          reserved: true,
          slotHeightMm: sectionTemplate.slotHeightMm,
          titleHeightMm: sectionTemplate.titleHeightMm,
          contentPaddingMm: sectionTemplate.contentPaddingMm,
          contentAlignY: sectionTemplate.contentAlignY,
          summary: profile.summary
        };
      case "education":
        return buildEducationSection(profile, version, template, diagnostics);
      case "experience":
        return buildExperienceSection(profile, version, template, diagnostics);
      case "projects":
        return buildProjectsSection(profile, version, template, diagnostics);
      case "skills": {
        const selectedSkillIds = new Set(version.sections.skills.selectedItemIds);
        const allSkillIds = profile.skills.flatMap((group) => group.items.map((item) => item.id));
        for (const id of version.sections.skills.selectedItemIds) {
          if (!allSkillIds.includes(id)) {
            diagnostics.push({
              code: "unknown_item_id",
              level: "warning",
              message: `Section "skills" references unknown skill ID "${id}".`,
              sectionType: "skills"
            });
          }
        }
        return {
          type: "skills",
          title: sectionTemplate.title,
          enabled: true,
          reserved: true,
          slotHeightMm: sectionTemplate.slotHeightMm,
          titleHeightMm: sectionTemplate.titleHeightMm,
          contentPaddingMm: sectionTemplate.contentPaddingMm,
          contentAlignY: sectionTemplate.contentAlignY,
          groups: buildSkillsGroups(profile.skills, selectedSkillIds)
        };
      }
    }
  });

  const document = {
    templateId: template.id,
    page: {
      ...template.page,
      sectionGapMm: style.spacing.sectionGapMm
    },
    style,
    htmlTheme: template.htmlTheme,
    latexTheme: template.latexTheme,
    sections
  };
  const pageOverflowDiagnostic = getPageSlotOverflowDiagnostic(document);
  if (pageOverflowDiagnostic) {
    diagnostics.push(pageOverflowDiagnostic);
  }

  return {
    document,
    diagnostics
  };
}
