import type { ID, InsetsMm } from "./common";
import type { SectionType } from "./version";

export interface PageSpec {
  size: "A4";
  widthMm: number;
  heightMm: number;
  marginsMm: InsetsMm;
  sectionGapMm: number;
  maxPages: 1;
}

export interface DocumentTypographySettings {
  nameSizePt: number;
  bodySizePt: number;
  sectionTitleSizePt: number;
  metaSizePt: number;
  contactBarSizePt: number;
}

export interface DocumentSpacingSettings {
  lineHeight: number;
  sectionGapMm: number;
  itemGapMm: number;
  bulletGapMm: number;
}

export interface DocumentStyleSettings {
  typography: DocumentTypographySettings;
  spacing: DocumentSpacingSettings;
}

export interface DocumentStyleOverrides {
  typography?: Partial<DocumentTypographySettings>;
  spacing?: Partial<DocumentSpacingSettings>;
}

export interface HtmlThemeSpec {
  fontFamily: string;
  monoFontFamily: string;
  headingTrackingEm: number;
}

export interface LatexThemeSpec {
  documentClass: string;
}

export interface SectionTemplate {
  type: SectionType;
  title: string;
  slotHeightMm: number;
  titleHeightMm: number;
  contentPaddingMm: InsetsMm;
  contentAlignY: "start" | "center";
  allowItemSelection: boolean;
  allowBulletSelection: boolean;
  rendererKey:
    | "personalInfo"
    | "summary"
    | "education"
    | "experience"
    | "projects"
    | "skills";
}

export interface DocumentTemplate {
  id: ID;
  name: string;
  description?: string;
  page: PageSpec;
  requiredSections: SectionType[];
  defaultSectionOrder: SectionType[];
  sectionTemplates: Record<SectionType, SectionTemplate>;
  styleDefaults: DocumentStyleSettings;
  htmlTheme: HtmlThemeSpec;
  latexTheme: LatexThemeSpec;
  blueprint: {
    imageFileName: string;
    pdfFileName: string;
  };
}
