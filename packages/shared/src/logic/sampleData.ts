import type { CvProfile } from "../types/cv";
import type { CvVersion, VersionSectionState } from "../types/version";
import { CLASSIC_V1_TEMPLATE } from "../templates/classicV1";

function createSectionState(
  type: VersionSectionState["type"],
  enabled: boolean,
  selectedItemIds: string[] = [],
  selectedBulletIds: string[] = []
): VersionSectionState {
  return {
    type,
    enabled,
    selectedItemIds,
    selectedBulletIds
  };
}

export const SAMPLE_PROFILE: CvProfile = {
  id: "profile-1",
  name: "Dominik Wujek",
  basics: {
    fullName: "Dominik Wujek",
    location: "London, UK",
    email: "dominik@example.com",
    phone: "+44 7000 000000",
    linkedIn: "linkedin.com/in/dominikwujek",
    website: "dominikwujek.dev"
  },
  summary: {
    text: "Product-minded software engineer focused on structured content systems, developer tooling, and polished document experiences.",
    linkUrl: "dominikwujek.dev/work"
  },
  education: [
    {
      id: "edu-1",
      institution: "University of Example",
      qualification: "MEng Computer Science",
      grade: "First Class Honours",
      location: "London, UK",
      endDate: { year: 2023, precision: "year" },
      bullets: [
        {
          id: "edu-1-b1",
          text: "Specialised in distributed systems and human-computer interaction.",
          linkUrl: "example.edu/thesis"
        }
      ],
      links: [
        {
          id: "edu-1-link-1",
          label: "Programme",
          url: "example.edu/course"
        }
      ]
    },
    {
      id: "edu-2",
      institution: "Example Sixth Form",
      qualification: "A Levels",
      grade: "A*A*A",
      endDate: { year: 2019, precision: "year" }
    }
  ],
  experience: [
    {
      id: "exp-1",
      role: "Frontend Engineer",
      organisation: "Structured Systems Ltd",
      location: "London, UK",
      startDate: { year: 2024, month: 1, precision: "month" },
      endDate: "present",
      bullets: [
        {
          id: "exp-1-b1",
          text: "Built internal editing workflows for highly structured product content.",
          linkUrl: "structuredsystems.dev/editor"
        },
        { id: "exp-1-b2", text: "Reduced template rendering regressions by introducing shared UI and export contracts." }
      ],
      links: [
        {
          id: "exp-1-link-1",
          label: "Case study",
          url: "structuredsystems.dev/case-study"
        }
      ]
    },
    {
      id: "exp-2",
      role: "Software Engineer Intern",
      organisation: "Example Robotics",
      location: "Manchester, UK",
      startDate: { year: 2023, month: 6, precision: "month" },
      endDate: { year: 2023, month: 9, precision: "month" },
      bullets: [
        { id: "exp-2-b1", text: "Delivered data visualisation tooling for field-test telemetry." }
      ]
    }
  ],
  projects: [
    {
      id: "proj-1",
      title: "Structured CV Builder",
      category: "Personal",
      description: "A typed content system for tailoring CVs and exporting polished layouts.",
      descriptionLinkUrl: "cv-control.dev/demo",
      technologies: ["React", "TypeScript", "SQLite", "LaTeX"],
      bullets: [
        { id: "proj-1-b1", text: "Designed a render pipeline shared between browser preview and PDF export." }
      ],
      links: [
        {
          id: "proj-1-link-1",
          label: "GitHub",
          url: "github.com/dominikwujek/cv-control"
        },
        {
          id: "proj-1-link-2",
          label: "Demo",
          url: "cv-control.dev/demo"
        }
      ]
    },
    {
      id: "proj-2",
      title: "Static Analysis Toolkit",
      category: "Academic",
      technologies: ["TypeScript", "Node.js"],
      bullets: [
        { id: "proj-2-b1", text: "Implemented AST-driven checks to surface type drift across service boundaries." }
      ]
    }
  ],
  skills: [
    {
      id: "skill-group-1",
      name: "Languages",
      items: [
        { id: "skill-1", label: "TypeScript" },
        { id: "skill-2", label: "Python" },
        { id: "skill-3", label: "SQL" }
      ]
    },
    {
      id: "skill-group-2",
      name: "Tooling",
      items: [
        { id: "skill-4", label: "React" },
        { id: "skill-5", label: "Node.js" },
        { id: "skill-6", label: "LaTeX" }
      ]
    }
  ],
  metadata: {
    createdAt: "2026-03-22T18:00:00.000Z",
    updatedAt: "2026-03-22T18:00:00.000Z",
    sourceLabel: "seed"
  }
};

export const SAMPLE_VERSION: CvVersion = {
  id: "version-1",
  profileId: SAMPLE_PROFILE.id,
  name: "General Software CV",
  parentVersionId: null,
  documentTemplateId: CLASSIC_V1_TEMPLATE.id,
  documentStyleOverrides: {},
  sectionOrder: ["personalInfo", "summary", "experience", "projects", "education", "skills"],
  sections: {
    personalInfo: createSectionState("personalInfo", true),
    summary: createSectionState("summary", true),
    education: createSectionState("education", true, ["edu-1", "edu-2"], ["edu-1-b1"]),
    experience: createSectionState(
      "experience",
      true,
      ["exp-1", "exp-2"],
      ["exp-1-b1", "exp-1-b2", "exp-2-b1"]
    ),
    projects: createSectionState("projects", true, ["proj-1", "proj-2"], ["proj-1-b1", "proj-2-b1"]),
    skills: createSectionState("skills", true, ["skill-1", "skill-2", "skill-3", "skill-4", "skill-5", "skill-6"])
  },
  createdAt: "2026-03-22T18:00:00.000Z",
  updatedAt: "2026-03-22T18:00:00.000Z"
};
