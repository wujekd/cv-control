import { describe, expect, it } from "vitest";
import {
  createInheritedLocalOverrides,
  markBasicsLocal,
  markSectionLocal,
  markSummaryLocal,
  resolveCvProfileForVersion,
  resolveCvVersionInheritance
} from "../logic/versionInheritance";
import { SAMPLE_PROFILE, SAMPLE_VERSION } from "../logic/sampleData";
import type { CvVersion } from "../types/version";

describe("resolveCvVersionInheritance", () => {
  it("inherits parent settings until a child marks a section as local", () => {
    const parent: CvVersion = {
      ...SAMPLE_VERSION,
      id: "parent",
      name: "Parent",
      sections: {
        ...SAMPLE_VERSION.sections,
        experience: {
          ...SAMPLE_VERSION.sections.experience,
          selectedItemIds: ["exp-1"]
        }
      }
    };
    const child: CvVersion = {
      ...SAMPLE_VERSION,
      id: "child",
      name: "Child",
      parentVersionId: parent.id,
      localOverrides: createInheritedLocalOverrides(),
      sections: {
        ...SAMPLE_VERSION.sections,
        experience: {
          ...SAMPLE_VERSION.sections.experience,
          selectedItemIds: ["exp-2"]
        }
      }
    };

    expect(resolveCvVersionInheritance([parent, child], child.id)?.sections.experience.selectedItemIds).toEqual([
      "exp-1"
    ]);

    const editedChild = markSectionLocal(child, "experience");
    expect(resolveCvVersionInheritance([parent, editedChild], child.id)?.sections.experience.selectedItemIds).toEqual([
      "exp-2"
    ]);
  });

  it("resolves branch summary overrides without changing the base profile", () => {
    const parent: CvVersion = {
      ...SAMPLE_VERSION,
      id: "parent",
      name: "Parent"
    };
    const child = markSummaryLocal({
      ...SAMPLE_VERSION,
      id: "child",
      name: "Child",
      parentVersionId: parent.id,
      localOverrides: createInheritedLocalOverrides(),
      contentOverrides: {
        summary: {
          text: "Branch-specific summary"
        }
      }
    });

    const resolvedVersion = resolveCvVersionInheritance([parent, child], child.id);
    if (!resolvedVersion) {
      throw new Error("Version missing");
    }

    const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, resolvedVersion);

    expect(SAMPLE_PROFILE.summary?.text).not.toBe("Branch-specific summary");
    expect(resolvedProfile.summary?.text).toBe("Branch-specific summary");
  });

  it("inherits canonical basics when a branch has no basics override", () => {
    const parent: CvVersion = {
      ...SAMPLE_VERSION,
      id: "parent",
      name: "Parent"
    };
    const child: CvVersion = {
      ...SAMPLE_VERSION,
      id: "child",
      name: "Child",
      parentVersionId: parent.id,
      localOverrides: createInheritedLocalOverrides(),
      contentOverrides: {
        basics: {
          email: "branch@example.com"
        }
      }
    };

    const resolvedVersion = resolveCvVersionInheritance([parent, child], child.id);
    if (!resolvedVersion) {
      throw new Error("Version missing");
    }

    const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, resolvedVersion);

    expect(resolvedProfile.basics.email).toBe(SAMPLE_PROFILE.basics.email);
  });

  it("applies partial basics overrides when a branch marks basics local", () => {
    const parent: CvVersion = {
      ...SAMPLE_VERSION,
      id: "parent",
      name: "Parent"
    };
    const child: CvVersion = markBasicsLocal({
      ...SAMPLE_VERSION,
      id: "child",
      name: "Child",
      parentVersionId: parent.id,
      localOverrides: createInheritedLocalOverrides(),
      contentOverrides: {
        basics: {
          email: "branch@example.com",
          website: "branch.example.com"
        }
      }
    });

    const resolvedVersion = resolveCvVersionInheritance([parent, child], child.id);
    if (!resolvedVersion) {
      throw new Error("Version missing");
    }

    const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, resolvedVersion);

    expect(resolvedProfile.basics.fullName).toBe(SAMPLE_PROFILE.basics.fullName);
    expect(resolvedProfile.basics.email).toBe("branch@example.com");
    expect(resolvedProfile.basics.website).toBe("branch.example.com");
  });

  it("ignores undefined basics override fields", () => {
    const child = markBasicsLocal({
      ...SAMPLE_VERSION,
      id: "child",
      name: "Child",
      parentVersionId: "parent",
      localOverrides: createInheritedLocalOverrides(),
      contentOverrides: {
        basics: {
          email: undefined,
          website: "branch.example.com"
        }
      }
    });

    const resolvedProfile = resolveCvProfileForVersion(SAMPLE_PROFILE, child);

    expect(resolvedProfile.basics.email).toBe(SAMPLE_PROFILE.basics.email);
    expect(resolvedProfile.basics.website).toBe("branch.example.com");
  });
});
