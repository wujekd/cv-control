import {
  buildRenderableCv,
  createInheritedLocalOverrides,
  type CvProfile,
  type CvVersion
} from "@cv-control/shared";
import cors from "cors";
import express from "express";
import { openDatabase } from "./db/sqlite";
import { CvProfileSqliteRepository } from "./repositories/CvProfileSqliteRepository";
import { CvVersionSqliteRepository } from "./repositories/CvVersionSqliteRepository";
import { DocumentTemplateRepository } from "./repositories/DocumentTemplateRepository";
import { BootstrapService } from "./services/bootstrapService";
import { PdfPreviewService } from "./services/render/pdfPreviewService";
import { createId } from "./utils/ids";

export function createApp() {
  const database = openDatabase();
  const profileRepository = new CvProfileSqliteRepository(database);
  const versionRepository = new CvVersionSqliteRepository(database);
  const templateRepository = new DocumentTemplateRepository();
  const bootstrapService = new BootstrapService(
    profileRepository,
    versionRepository,
    templateRepository
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

  app.put("/api/profile", (request, response) => {
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

  app.put("/api/versions/:id", (request, response) => {
    const version = request.body as CvVersion;
    versionRepository.save({
      ...version,
      updatedAt: new Date().toISOString()
    });
    response.status(204).end();
  });

  app.post("/api/versions", (request, response) => {
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

  app.post("/api/versions/:id/clone", (request, response) => {
    const existing = versionRepository.get(request.params.id);
    if (!existing) {
      response.status(404).json({ message: "Version not found." });
      return;
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

  app.post("/api/render/pdf-preview", async (request, response) => {
    const { profile, version, templateId } = request.body as {
      profile: CvProfile;
      version: CvVersion;
      templateId: string;
    };
    const template = templateRepository.get(templateId);
    if (!template) {
      response.status(400).json({ message: "Unknown template." });
      return;
    }

    const result = await pdfPreviewService.renderPreview(profile, version, template);
    response.json(result);
  });

  app.post("/api/render/html-preview", (request, response) => {
    const { profile, version, templateId } = request.body as {
      profile: CvProfile;
      version: CvVersion;
      templateId: string;
    };
    const template = templateRepository.get(templateId);
    if (!template) {
      response.status(400).json({ message: "Unknown template." });
      return;
    }

    response.json(buildRenderableCv(profile, version, template));
  });

  return app;
}
