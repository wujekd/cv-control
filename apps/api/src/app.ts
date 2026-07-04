import {
  buildRenderableCv,
  cloneVersionBodySchema,
  createInheritedLocalOverrides,
  cvProfileSchema,
  cvVersionDraftSchema,
  cvVersionSchema,
  jobApplicationDraftSchema,
  jobApplicationSchema,
  renderRequestBodySchema,
  type CvProfile,
  type CvVersion,
  type JobApplication,
  type JobApplicationDraft
} from "@cv-control/shared";
import cors from "cors";
import express from "express";
import { openDatabase } from "./db/sqlite";
import { errorHandler, HttpError, validateBody } from "./middleware/errorHandler";
import { CvProfileSqliteRepository } from "./repositories/CvProfileSqliteRepository";
import { CvVersionSqliteRepository } from "./repositories/CvVersionSqliteRepository";
import { DocumentTemplateRepository } from "./repositories/DocumentTemplateRepository";
import { JobApplicationSqliteRepository } from "./repositories/JobApplicationSqliteRepository";
import { BootstrapService } from "./services/bootstrapService";
import { PdfPreviewService } from "./services/render/pdfPreviewService";
import { createId } from "./utils/ids";

export interface CreateAppOptions {
  databasePath?: string;
}

export function createApp(options: CreateAppOptions = {}) {
  const database = openDatabase(options.databasePath);
  const profileRepository = new CvProfileSqliteRepository(database);
  const versionRepository = new CvVersionSqliteRepository(database);
  const templateRepository = new DocumentTemplateRepository();
  const applicationRepository = new JobApplicationSqliteRepository(database);
  const bootstrapService = new BootstrapService(
    profileRepository,
    versionRepository,
    templateRepository,
    applicationRepository
  );
  const pdfPreviewService = new PdfPreviewService();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/bootstrap", (_request, response) => {
    response.json(bootstrapService.getBootstrapPayload());
  });

  app.put("/api/profile", validateBody(cvProfileSchema), (request, response) => {
    const profile = request.body as CvProfile;
    profileRepository.save({
      ...profile,
      metadata: {
        ...profile.metadata,
        updatedAt: new Date().toISOString()
      }
    });
    response.status(204).end();
  });

  app.put("/api/versions/:id", validateBody(cvVersionSchema), (request, response) => {
    const version = request.body as CvVersion;
    versionRepository.save({
      ...version,
      updatedAt: new Date().toISOString()
    });
    response.status(204).end();
  });

  app.post("/api/versions", validateBody(cvVersionDraftSchema), (request, response) => {
    const draft = request.body as Partial<CvVersion>;
    const now = new Date().toISOString();
    const version: CvVersion = {
      ...(draft as CvVersion),
      id: createId("version"),
      name: draft.name ?? "Untitled CV Version",
      createdAt: now,
      updatedAt: now
    };
    versionRepository.save(version);
    response.status(201).json(version);
  });

  app.post("/api/versions/:id/clone", validateBody(cloneVersionBodySchema), (request, response) => {
    const existing = versionRepository.get(String(request.params.id));
    if (!existing) {
      throw new HttpError(404, "Version not found.");
    }

    const now = new Date().toISOString();
    const cloned: CvVersion = {
      ...existing,
      id: createId("version"),
      name: request.body?.name ?? `${existing.name} Copy`,
      parentVersionId: existing.id,
      localOverrides: createInheritedLocalOverrides(),
      createdAt: now,
      updatedAt: now
    };
    versionRepository.save(cloned);
    response.status(201).json(cloned);
  });

  app.delete("/api/versions/:id", (request, response) => {
    const existing = versionRepository.get(request.params.id);
    if (!existing) {
      throw new HttpError(404, "Version not found.");
    }

    const children = versionRepository.listChildren(existing.id);
    if (children.length > 0) {
      const childNames = children.map((child) => `"${child.name}"`).join(", ");
      throw new HttpError(
        409,
        `Cannot delete: ${childNames} inherit${children.length === 1 ? "s" : ""} from this version. Delete the branches first.`
      );
    }

    if (versionRepository.countByProfile(existing.profileId) <= 1) {
      throw new HttpError(409, "Cannot delete the only remaining version.");
    }

    applicationRepository.clearVersionLink(existing.id);
    versionRepository.delete(existing.id);
    response.status(204).end();
  });

  app.get("/api/applications", (_request, response) => {
    response.json(applicationRepository.list());
  });

  app.post("/api/applications", validateBody(jobApplicationDraftSchema), (request, response) => {
    const draft = request.body as JobApplicationDraft;
    const now = new Date().toISOString();
    const application: JobApplication = {
      id: createId("application"),
      company: draft.company ?? "",
      role: draft.role ?? "",
      postingUrl: draft.postingUrl,
      status: draft.status ?? "draft",
      appliedAt: draft.appliedAt,
      notes: draft.notes,
      versionId: draft.versionId ?? null,
      createdAt: now,
      updatedAt: now
    };
    applicationRepository.save(application);
    response.status(201).json(application);
  });

  app.put("/api/applications/:id", validateBody(jobApplicationSchema), (request, response) => {
    const existing = applicationRepository.get(String(request.params.id));
    if (!existing) {
      throw new HttpError(404, "Application not found.");
    }

    const application = request.body as JobApplication;
    applicationRepository.save({
      ...application,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    });
    response.status(204).end();
  });

  app.delete("/api/applications/:id", (request, response) => {
    const deleted = applicationRepository.delete(request.params.id);
    if (!deleted) {
      throw new HttpError(404, "Application not found.");
    }
    response.status(204).end();
  });

  app.post(
    "/api/render/pdf-preview",
    validateBody(renderRequestBodySchema),
    async (request, response, next) => {
      try {
        const { profile, version, templateId } = request.body as {
          profile: CvProfile;
          version: CvVersion;
          templateId: string;
        };
        const template = templateRepository.get(templateId);
        if (!template) {
          throw new HttpError(400, "Unknown template.");
        }

        const result = await pdfPreviewService.renderPreview(profile, version, template);
        response.json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  app.post(
    "/api/render/html-preview",
    validateBody(renderRequestBodySchema),
    (request, response) => {
      const { profile, version, templateId } = request.body as {
        profile: CvProfile;
        version: CvVersion;
        templateId: string;
      };
      const template = templateRepository.get(templateId);
      if (!template) {
        throw new HttpError(400, "Unknown template.");
      }

      response.json(buildRenderableCv(profile, version, template));
    }
  );

  app.use(errorHandler);

  return app;
}
