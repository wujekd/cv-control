import type { DocumentTemplate } from "../types/template";
import { REQUIRED_SECTION_TYPES } from "../types/version";

export const CLASSIC_V1_TEMPLATE: DocumentTemplate = {
  id: "classic-v1",
  name: "Classic V1",
  description: "One-page A4 technical CV layout calibrated from the supplied blueprint assets.",
  page: {
    size: "A4",
    widthMm: 210,
    heightMm: 297,
    marginsMm: {
      top: 10,
      right: 12,
      bottom: 10,
      left: 12
    },
    sectionGapMm: 2,
    maxPages: 1
  },
  requiredSections: REQUIRED_SECTION_TYPES,
  defaultSectionOrder: ["personalInfo", "summary", "education", "experience", "projects", "skills"],
  sectionTemplates: {
    personalInfo: {
      type: "personalInfo",
      title: "Personal Information",
      slotHeightMm: 19,
      titleHeightMm: 0,
      contentPaddingMm: { top: 2, right: 0, bottom: 2, left: 0 },
      contentAlignY: "center",
      allowItemSelection: false,
      allowBulletSelection: false,
      rendererKey: "personalInfo"
    },
    summary: {
      type: "summary",
      title: "",
      slotHeightMm: 10,
      titleHeightMm: 0,
      contentPaddingMm: { top: 1, right: 0, bottom: 2, left: 0 },
      contentAlignY: "start",
      allowItemSelection: false,
      allowBulletSelection: false,
      rendererKey: "summary"
    },
    education: {
      type: "education",
      title: "Education",
      slotHeightMm: 31,
      titleHeightMm: 6,
      contentPaddingMm: { top: 2, right: 0, bottom: 1.5, left: 0 },
      contentAlignY: "start",
      allowItemSelection: true,
      allowBulletSelection: true,
      rendererKey: "education"
    },
    experience: {
      type: "experience",
      title: "Experience",
      slotHeightMm: 76,
      titleHeightMm: 6,
      contentPaddingMm: { top: 2, right: 0, bottom: 1.5, left: 0 },
      contentAlignY: "start",
      allowItemSelection: true,
      allowBulletSelection: true,
      rendererKey: "experience"
    },
    projects: {
      type: "projects",
      title: "Projects",
      slotHeightMm: 82,
      titleHeightMm: 6,
      contentPaddingMm: { top: 2, right: 0, bottom: 1.5, left: 0 },
      contentAlignY: "start",
      allowItemSelection: true,
      allowBulletSelection: true,
      rendererKey: "projects"
    },
    skills: {
      type: "skills",
      title: "Skills",
      slotHeightMm: 33,
      titleHeightMm: 6,
      contentPaddingMm: { top: 2, right: 0, bottom: 1.2, left: 0 },
      contentAlignY: "center",
      allowItemSelection: true,
      allowBulletSelection: false,
      rendererKey: "skills"
    }
  },
  styleDefaults: {
    typography: {
      nameSizePt: 22.6,
      bodySizePt: 10,
      sectionTitleSizePt: 10.1,
      metaSizePt: 8.1,
      contactBarSizePt: 7.2
    },
    spacing: {
      lineHeight: 1.08,
      sectionGapMm: 2,
      itemGapMm: 0.7,
      bulletGapMm: 0.5
    }
  },
  htmlTheme: {
    fontFamily: "\"IBM Plex Sans\", \"Helvetica Neue\", sans-serif",
    monoFontFamily: "\"IBM Plex Mono\", \"SFMono-Regular\", monospace",
    headingTrackingEm: 0.08
  },
  latexTheme: {
    documentClass: "article"
  },
  blueprint: {
    imageFileName: "cv template.png",
    pdfFileName: "CV Dominik Wujek.pdf"
  }
};
