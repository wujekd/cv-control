import type { ID } from "./common";

export const APPLICATION_STATUSES = [
  "draft",
  "applied",
  "interview",
  "offer",
  "rejected"
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface JobApplication {
  id: ID;
  company: string;
  role: string;
  postingUrl?: string;
  status: ApplicationStatus;
  appliedAt?: string;
  notes?: string;
  versionId: ID | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobApplicationDraft {
  company: string;
  role: string;
  postingUrl?: string;
  status?: ApplicationStatus;
  appliedAt?: string;
  notes?: string;
  versionId?: ID | null;
}
