import { SAMPLE_PROFILE, SAMPLE_VERSION, type CvVersion, type JobApplication } from "@cv-control/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app";

function makeApp() {
  return createApp({ databasePath: ":memory:" });
}

async function bootstrapApp(app: ReturnType<typeof createApp>) {
  const response = await request(app).get("/api/bootstrap").expect(200);
  return response.body as {
    profile: typeof SAMPLE_PROFILE;
    versions: CvVersion[];
    applications: JobApplication[];
    activeVersionId: string;
  };
}

describe("bootstrap", () => {
  it("seeds the sample profile and version on an empty database", async () => {
    const app = makeApp();
    const payload = await bootstrapApp(app);

    expect(payload.profile.id).toBe(SAMPLE_PROFILE.id);
    expect(payload.versions).toHaveLength(1);
    expect(payload.versions[0].id).toBe(SAMPLE_VERSION.id);
    expect(payload.applications).toEqual([]);
    expect(payload.activeVersionId).toBe(SAMPLE_VERSION.id);
  });

  it("is idempotent across repeated calls", async () => {
    const app = makeApp();
    await bootstrapApp(app);
    const second = await bootstrapApp(app);

    expect(second.versions).toHaveLength(1);
  });
});

describe("profile and versions", () => {
  it("persists profile edits", async () => {
    const app = makeApp();
    const { profile } = await bootstrapApp(app);

    await request(app)
      .put("/api/profile")
      .send({ ...profile, basics: { ...profile.basics, fullName: "Edited Name" } })
      .expect(204);

    const after = await bootstrapApp(app);
    expect(after.profile.basics.fullName).toBe("Edited Name");
  });

  it("persists version edits", async () => {
    const app = makeApp();
    const { versions } = await bootstrapApp(app);

    await request(app)
      .put(`/api/versions/${versions[0].id}`)
      .send({ ...versions[0], name: "Renamed" })
      .expect(204);

    const after = await bootstrapApp(app);
    expect(after.versions[0].name).toBe("Renamed");
  });

  it("clones a version with parent link and inherited overrides", async () => {
    const app = makeApp();
    const { versions } = await bootstrapApp(app);

    const response = await request(app)
      .post(`/api/versions/${versions[0].id}/clone`)
      .send({ name: "Branch A" })
      .expect(201);

    const cloned = response.body as CvVersion;
    expect(cloned.parentVersionId).toBe(versions[0].id);
    expect(cloned.name).toBe("Branch A");
    expect(cloned.localOverrides).toBeDefined();
  });

  it("returns 404 when cloning a missing version", async () => {
    const app = makeApp();
    await bootstrapApp(app);

    await request(app).post("/api/versions/missing/clone").send({}).expect(404);
  });
});

describe("version delete", () => {
  it("deletes a leaf version", async () => {
    const app = makeApp();
    const { versions } = await bootstrapApp(app);
    const clone = (
      await request(app).post(`/api/versions/${versions[0].id}/clone`).send({}).expect(201)
    ).body as CvVersion;

    await request(app).delete(`/api/versions/${clone.id}`).expect(204);

    const after = await bootstrapApp(app);
    expect(after.versions.map((version) => version.id)).not.toContain(clone.id);
  });

  it("blocks deleting a version with branches", async () => {
    const app = makeApp();
    const { versions } = await bootstrapApp(app);
    await request(app).post(`/api/versions/${versions[0].id}/clone`).send({}).expect(201);

    const response = await request(app).delete(`/api/versions/${versions[0].id}`).expect(409);
    expect(response.body.message).toMatch(/inherit/);
  });

  it("blocks deleting the only remaining version", async () => {
    const app = makeApp();
    const { versions } = await bootstrapApp(app);

    const response = await request(app).delete(`/api/versions/${versions[0].id}`).expect(409);
    expect(response.body.message).toMatch(/only remaining/);
  });

  it("returns 404 for a missing version", async () => {
    const app = makeApp();
    await bootstrapApp(app);

    await request(app).delete("/api/versions/missing").expect(404);
  });

  it("unlinks applications from a deleted version", async () => {
    const app = makeApp();
    const { versions } = await bootstrapApp(app);
    const clone = (
      await request(app).post(`/api/versions/${versions[0].id}/clone`).send({}).expect(201)
    ).body as CvVersion;
    const application = (
      await request(app)
        .post("/api/applications")
        .send({ company: "Acme", role: "Dev", versionId: clone.id })
        .expect(201)
    ).body as JobApplication;

    await request(app).delete(`/api/versions/${clone.id}`).expect(204);

    const after = await bootstrapApp(app);
    const unlinked = after.applications.find((item) => item.id === application.id);
    expect(unlinked).toBeDefined();
    expect(unlinked?.versionId).toBeNull();
  });
});

describe("applications", () => {
  it("supports create, list, update, and delete", async () => {
    const app = makeApp();
    await bootstrapApp(app);

    const created = (
      await request(app)
        .post("/api/applications")
        .send({ company: "Acme", role: "Dev", status: "applied", appliedAt: "2026-07-01" })
        .expect(201)
    ).body as JobApplication;
    expect(created.id).toMatch(/^application-/);
    expect(created.status).toBe("applied");
    expect(created.versionId).toBeNull();

    await request(app)
      .put(`/api/applications/${created.id}`)
      .send({ ...created, status: "interview", notes: "Phone screen booked" })
      .expect(204);

    const list = (await request(app).get("/api/applications").expect(200))
      .body as JobApplication[];
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("interview");
    expect(list[0].notes).toBe("Phone screen booked");

    await request(app).delete(`/api/applications/${created.id}`).expect(204);
    await request(app).delete(`/api/applications/${created.id}`).expect(404);
  });

  it("defaults status to draft", async () => {
    const app = makeApp();
    await bootstrapApp(app);

    const created = (
      await request(app)
        .post("/api/applications")
        .send({ company: "Acme", role: "Dev" })
        .expect(201)
    ).body as JobApplication;
    expect(created.status).toBe("draft");
  });
});

describe("validation", () => {
  it("rejects an empty version payload with field issues", async () => {
    const app = makeApp();

    const response = await request(app).put("/api/versions/x").send({}).expect(400);
    expect(response.body.message).toMatch(/validation/i);
    expect(response.body.issues.map((issue: { path: string }) => issue.path)).toContain("id");
  });

  it("rejects an application with a bad posting URL", async () => {
    const app = makeApp();

    const response = await request(app)
      .post("/api/applications")
      .send({ company: "Acme", role: "Dev", postingUrl: "not-a-url" })
      .expect(400);
    expect(response.body.issues.some((issue: { path: string }) => issue.path === "postingUrl")).toBe(
      true
    );
  });

  it("rejects an application with an unknown status", async () => {
    const app = makeApp();

    await request(app)
      .post("/api/applications")
      .send({ company: "Acme", role: "Dev", status: "ghosted" })
      .expect(400);
  });

  it("rejects a render request without a version", async () => {
    const app = makeApp();
    const { profile } = await bootstrapApp(app);

    await request(app)
      .post("/api/render/html-preview")
      .send({ profile, templateId: "template-classic-v1" })
      .expect(400);
  });

  it("rejects a profile that is not an object shape", async () => {
    const app = makeApp();

    await request(app).put("/api/profile").send({ id: "p" }).expect(400);
  });
});
