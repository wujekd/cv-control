import { z } from "zod";

// Deep content blobs stay loose on purpose: the editor owns their shape and a
// strict schema here would need updating on every content-model tweak.
const looseRecord = z.object({}).passthrough();

export const basicsSectionSchema = z
  .object({
    fullName: z.string(),
    location: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    linkedIn: z.string().optional(),
    website: z.string().optional()
  })
  .passthrough();

export const cvProfileSchema = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    basics: basicsSectionSchema,
    summary: looseRecord.nullable(),
    education: z.array(looseRecord),
    experience: z.array(looseRecord),
    projects: z.array(looseRecord),
    skills: z.array(looseRecord),
    metadata: looseRecord
  })
  .passthrough();
