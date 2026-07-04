import { z } from "zod";
import { APPLICATION_STATUSES } from "../types/application";

export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);

export const jobApplicationDraftSchema = z.object({
  company: z.string().min(1, "Company is required."),
  role: z.string().min(1, "Role is required."),
  postingUrl: z.string().url("Posting URL must be a valid URL.").optional(),
  status: applicationStatusSchema.optional(),
  appliedAt: z.string().optional(),
  notes: z.string().optional(),
  versionId: z.string().nullable().optional()
});

export const jobApplicationSchema = jobApplicationDraftSchema.extend({
  id: z.string().min(1),
  status: applicationStatusSchema,
  versionId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});
