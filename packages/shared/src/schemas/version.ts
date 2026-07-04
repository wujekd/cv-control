import { z } from "zod";
import { SECTION_TYPES } from "../types/version";
import { cvProfileSchema } from "./cv";

const sectionTypeSchema = z.enum(SECTION_TYPES);

const versionSectionStateSchema = z
  .object({
    type: sectionTypeSchema,
    enabled: z.boolean(),
    selectedItemIds: z.array(z.string()),
    selectedBulletIds: z.array(z.string())
  })
  .passthrough();

export const cvVersionSchema = z
  .object({
    id: z.string().min(1),
    profileId: z.string().min(1),
    name: z.string(),
    parentVersionId: z.string().nullable().optional(),
    localOverrides: z.object({}).passthrough().optional(),
    contentOverrides: z.object({}).passthrough().optional(),
    documentTemplateId: z.string().min(1),
    documentStyleOverrides: z.object({}).passthrough().optional(),
    sectionOrder: z.array(sectionTypeSchema),
    sections: z.record(sectionTypeSchema, versionSectionStateSchema),
    createdAt: z.string(),
    updatedAt: z.string()
  })
  .passthrough();

export const cvVersionDraftSchema = cvVersionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const cloneVersionBodySchema = z.object({
  name: z.string().min(1).optional()
});

export const renderRequestBodySchema = z.object({
  profile: cvProfileSchema,
  version: cvVersionSchema,
  templateId: z.string().min(1)
});
