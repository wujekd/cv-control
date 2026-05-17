import { describe, expect, it } from "vitest";
import { buildRenderableCv } from "../logic/buildRenderableCv";
import { SAMPLE_PROFILE, SAMPLE_VERSION } from "../logic/sampleData";
import { CLASSIC_V1_TEMPLATE } from "../templates/classicV1";

describe("buildRenderableCv", () => {
  it("keeps required enabled sections in order", () => {
    const result = buildRenderableCv(SAMPLE_PROFILE, SAMPLE_VERSION, CLASSIC_V1_TEMPLATE);

    expect(result.document.sections.map((section) => section.type)).toEqual([
      "personalInfo",
      "summary",
      "experience",
      "projects",
      "education",
      "skills"
    ]);
  });

  it("filters items by selected ids", () => {
    const version = {
      ...SAMPLE_VERSION,
      sections: {
        ...SAMPLE_VERSION.sections,
        projects: {
          ...SAMPLE_VERSION.sections.projects,
          selectedItemIds: ["proj-2"]
        }
      }
    };

    const result = buildRenderableCv(SAMPLE_PROFILE, version, CLASSIC_V1_TEMPLATE);
    const projectsSection = result.document.sections.find((section) => section.type === "projects");

    if (!projectsSection || projectsSection.type !== "projects") {
      throw new Error("Projects section missing");
    }

    expect(projectsSection.items).toHaveLength(1);
    expect(projectsSection.items[0]?.id).toBe("proj-2");
  });

  it("preserves per-line link metadata for summary and bullets", () => {
    const result = buildRenderableCv(SAMPLE_PROFILE, SAMPLE_VERSION, CLASSIC_V1_TEMPLATE);
    const summarySection = result.document.sections.find((section) => section.type === "summary");
    const experienceSection = result.document.sections.find((section) => section.type === "experience");

    if (!summarySection || summarySection.type !== "summary") {
      throw new Error("Summary section missing");
    }

    if (!experienceSection || experienceSection.type !== "experience") {
      throw new Error("Experience section missing");
    }

    expect(summarySection.summary?.linkUrl).toBe("dominikwujek.dev/work");
    expect(experienceSection.items[0]?.bullets[0]?.linkUrl).toBe("structuredsystems.dev/editor");
  });

  it("resolves template defaults with version style overrides", () => {
    const version = {
      ...SAMPLE_VERSION,
      documentStyleOverrides: {
        typography: {
          bodySizePt: 9.4
        },
        spacing: {
          sectionGapMm: 1.2
        }
      }
    };

    const result = buildRenderableCv(SAMPLE_PROFILE, version, CLASSIC_V1_TEMPLATE);

    expect(result.document.style.typography.bodySizePt).toBe(9.4);
    expect(result.document.style.typography.nameSizePt).toBe(
      CLASSIC_V1_TEMPLATE.styleDefaults.typography.nameSizePt
    );
    expect(result.document.page.sectionGapMm).toBe(1.2);
  });
});
