import type { BulletPoint, ID, LinkRef, PartialDate } from "./common";

export interface CvMetadata {
  createdAt: string;
  updatedAt: string;
  sourceLabel?: string;
}

export interface BasicsSection {
  fullName: string;
  location?: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  website?: string;
}

export interface SummarySection {
  text: string;
  linkUrl?: string;
}

export interface EducationEntry {
  id: ID;
  institution: string;
  qualification: string;
  grade?: string;
  startDate?: PartialDate;
  endDate?: PartialDate;
  location?: string;
  bullets?: BulletPoint[];
  links?: LinkRef[];
}

export interface ExperienceEntry {
  id: ID;
  role: string;
  organisation: string;
  employmentType?: string;
  location?: string;
  startDate?: PartialDate;
  endDate?: PartialDate | "present";
  bullets: BulletPoint[];
  links?: LinkRef[];
  tags?: string[];
}

export interface ProjectEntry {
  id: ID;
  title: string;
  category?: "Academic" | "Personal" | "Professional" | "Other";
  subtitle?: string;
  description?: string;
  descriptionLinkUrl?: string;
  bullets: BulletPoint[];
  technologies: string[];
  links?: LinkRef[];
  tags?: string[];
}

export interface SkillItem {
  id: ID;
  label: string;
}

export interface SkillGroup {
  id: ID;
  name: string;
  items: SkillItem[];
}

export interface CvProfile {
  id: ID;
  name: string;
  basics: BasicsSection;
  summary: SummarySection | null;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  metadata: CvMetadata;
}
