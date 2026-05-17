import type {
  BasicsSection,
  EducationEntry,
  ExperienceEntry,
  ProjectEntry,
  SkillGroup,
  SummarySection
} from "./cv";
import type { ID, InsetsMm } from "./common";
import type { DocumentStyleSettings, HtmlThemeSpec, LatexThemeSpec, PageSpec } from "./template";
import type { SectionType } from "./version";

export interface RenderDiagnostic {
  code:
    | "missing_required_section"
    | "section_missing_from_order"
    | "unknown_item_id"
    | "unknown_bullet_id"
    | "page_slot_overflow"
    | "compiled_pdf_overflow";
  level: "info" | "warning" | "error";
  message: string;
  sectionType?: SectionType;
}

interface RenderableSectionBase {
  type: SectionType;
  title: string;
  enabled: boolean;
  reserved: boolean;
  slotHeightMm: number;
  titleHeightMm: number;
  contentPaddingMm: InsetsMm;
  contentAlignY: "start" | "center";
}

export interface RenderablePersonalInfoSection extends RenderableSectionBase {
  type: "personalInfo";
  basics: BasicsSection;
}

export interface RenderableSummarySection extends RenderableSectionBase {
  type: "summary";
  summary: SummarySection | null;
}

export interface RenderableEducationSection extends RenderableSectionBase {
  type: "education";
  items: EducationEntry[];
}

export interface RenderableExperienceSection extends RenderableSectionBase {
  type: "experience";
  items: ExperienceEntry[];
}

export interface RenderableProjectsSection extends RenderableSectionBase {
  type: "projects";
  items: ProjectEntry[];
}

export interface RenderableSkillsSection extends RenderableSectionBase {
  type: "skills";
  groups: SkillGroup[];
}

export type RenderableSection =
  | RenderablePersonalInfoSection
  | RenderableSummarySection
  | RenderableEducationSection
  | RenderableExperienceSection
  | RenderableProjectsSection
  | RenderableSkillsSection;

export interface RenderableCv {
  templateId: ID;
  page: PageSpec;
  style: DocumentStyleSettings;
  htmlTheme: HtmlThemeSpec;
  latexTheme: LatexThemeSpec;
  sections: RenderableSection[];
}

export interface BuildRenderableCvResult {
  document: RenderableCv;
  diagnostics: RenderDiagnostic[];
}
