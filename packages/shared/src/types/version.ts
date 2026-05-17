import type { ID } from "./common";
import type { DocumentStyleOverrides } from "./template";

export const SECTION_TYPES = [
  "personalInfo",
  "summary",
  "education",
  "experience",
  "projects",
  "skills"
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

export const REQUIRED_SECTION_TYPES: SectionType[] = ["personalInfo", "skills"];

export interface VersionSectionState {
  type: SectionType;
  enabled: boolean;
  selectedItemIds: ID[];
  selectedBulletIds: ID[];
}

export interface CvVersion {
  id: ID;
  profileId: ID;
  name: string;
  parentVersionId?: ID | null;
  documentTemplateId: ID;
  documentStyleOverrides?: DocumentStyleOverrides;
  sectionOrder: SectionType[];
  sections: Record<SectionType, VersionSectionState>;
  createdAt: string;
  updatedAt: string;
}
