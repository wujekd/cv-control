import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CLASSIC_V1_TEMPLATE,
  type BulletPoint,
  type CvProfile,
  type CvVersion,
  type EducationEntry,
  type ExperienceEntry,
  type PartialDate,
  type ProjectEntry,
  type SectionType,
  type SkillGroup,
  type VersionSectionState
} from "@cv-control/shared";
import { openDatabase } from "../db/sqlite";
import { CvProfileSqliteRepository } from "../repositories/CvProfileSqliteRepository";
import { CvVersionSqliteRepository } from "../repositories/CvVersionSqliteRepository";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../../../");
const defaultPdfPath = path.resolve(projectRoot, "CV Dominik Wujek.pdf");

const monthMap: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12
};

const textReplacements: Array<[RegExp, string]> = [
  [/SoXware/g, "Software"],
  [/TesOng/g, "Testing"],
  [/Developing and Applied AI & Data Science/g, "Developing and Applied AI & Data Science"],
  [/ApplicaOons/g, "Applications"],
  [/DisOncOon/g, "Distinction"],
  [/Ac9vi9es/g, "Activities"],
  [/Recogni9on/g, "Recognition"],
  [/RepresentaOve/g, "Representative"],
  [/ScienOst/g, "Scientist"],
  [/automa Oon/g, "automation"],
  [/opOmisaOon/g, "optimisation"],
  [/predicOon/g, "prediction"],
  [/implementaOon/g, "implementation"],
  [/documenOng/g, "documenting"],
  [/collaboraOon/g, "collaboration"],
  [/plaborm/g, "platform"],
  [/isolaOon/g, "isolation"],
  [/universiOes/g, "universities"],
  [/digit classiﬁcaOon/g, "digit classification"],
  [/handwrifen/g, "handwritten"],
  [/tes Ong/g, "testing"],
  [/augmentaOon/g, "augmentation"],
  [/MulOlayer/g, "Multilayer"],
  [/rouOne/g, "routine"],
  [/arOﬁcial/g, "artificial"],
  [/Intona9on/g, "Intonation"],
  [/PaRern/g, "Pattern"],
  [/voOng/g, "voting"],
  [/vo Ong/g, "voting"],
  [/unOl/g, "until"],
  [/generaOon/g, "generation"],
  [/ﬁrmware/g, "firmware"],
  [/staﬀ/g, "staff"],
  [/eﬃciency/g, "efficiency"],
  [/plaborm/g, "platform"],
  [/hackaton/g, "hackathon"],
  [/aXer/g, "after"],
  [/openAI API/g, "OpenAI API"],
  [/WebAudioAPI/g, "Web Audio API"],
  [/Typescript/g, "TypeScript"],
  [/FFMPEG/g, "FFmpeg"]
];

function createId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function extractPdfText(pdfPath: string): string {
  const pythonScript = `
from pypdf import PdfReader
import sys
reader = PdfReader(sys.argv[1])
pages = []
for page in reader.pages:
    pages.append(page.extract_text() or "")
print("\\n".join(pages))
`.trim();

  return execFileSync("python3", ["-c", pythonScript, pdfPath], {
    cwd: projectRoot,
    encoding: "utf8"
  });
}

function normalizeLine(line: string): string {
  let normalized = line.normalize("NFKC").replace(/\s+/g, " ").trim();
  for (const [pattern, replacement] of textReplacements) {
    normalized = normalized.replace(pattern, replacement);
  }
  normalized = normalized
    .replace(/\s+LINK\.$/g, " LINK.")
    .replace(/\s+LINK$/g, " LINK")
    .replace(/\s+-\s+/g, " - ")
    .replace(/\s+–\s+/g, " - ");

  return normalized;
}

function normalizeLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter(Boolean)
    .filter((line) => !line.startsWith("Ignoring wrong pointing object"));
}

function parseHeader(line: string) {
  const match = line.match(
    /^DOMINIK WUJEK\s+(?<location>London, UK)\s+(?<email>\S+)\s+(?<phone>\d+)\s+(?<linkedIn>\S+)\s+(?<website>\S+)$/
  );

  if (!match?.groups) {
    throw new Error(`Could not parse header line: ${line}`);
  }

  return {
    fullName: "Dominik Wujek",
    location: match.groups.location,
    email: match.groups.email,
    phone: match.groups.phone,
    linkedIn: match.groups.linkedIn,
    website: match.groups.website
  };
}

function splitSections(lines: string[]) {
  const educationIndex = lines.indexOf("EDUCATION");
  const experienceIndex = lines.indexOf("EXPERIENCE");
  const projectsIndex = lines.indexOf("PROJECTS");
  const skillsIndex = lines.indexOf("SKILLS");

  if (educationIndex === -1 || experienceIndex === -1 || projectsIndex === -1 || skillsIndex === -1) {
    throw new Error("Could not find all expected section headings in the PDF.");
  }

  return {
    header: lines[0],
    summary: lines.slice(1, educationIndex).join(" "),
    educationLines: lines.slice(educationIndex + 1, experienceIndex),
    experienceLines: lines.slice(experienceIndex + 1, projectsIndex),
    projectLines: lines.slice(projectsIndex + 1, skillsIndex),
    skillLines: lines.slice(skillsIndex + 1)
  };
}

function extractQualificationAndGrade(rawQualification: string) {
  const match = rawQualification.match(/^(.*?)(?: \(([^)]+)\))?$/);
  if (!match) {
    return {
      qualification: rawQualification.trim(),
      grade: undefined
    };
  }

  return {
    qualification: match[1]?.trim() ?? rawQualification.trim(),
    grade: match[2]?.trim()
  };
}

function parseEducationEntries(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  let currentHeader: string | null = null;
  let currentBullets: BulletPoint[] = [];
  let bulletIndex = 1;

  function pushCurrent() {
    if (!currentHeader) {
      return;
    }

    const headerMatch = currentHeader.match(/^(.*?), (.+?) (\d{4})$/);
    if (!headerMatch) {
      throw new Error(`Could not parse education entry: ${currentHeader}`);
    }

    const { qualification, grade } = extractQualificationAndGrade(headerMatch[1].trim());
    entries.push({
      id: createId("education", entries.length + 1),
      qualification,
      grade,
      institution: headerMatch[2].trim(),
      endDate: {
        year: Number(headerMatch[3]),
        precision: "year"
      },
      bullets: currentBullets.length > 0 ? currentBullets : undefined
    });
  }

  for (const line of lines) {
    if (line.startsWith("• ")) {
      currentBullets.push({
        id: createId("education-bullet", bulletIndex),
        text: line.slice(2).trim()
      });
      bulletIndex += 1;
      continue;
    }

    pushCurrent();
    currentHeader = line;
    currentBullets = [];
  }

  pushCurrent();
  return entries;
}

function parseYear(value: string): PartialDate {
  return {
    year: Number(value),
    precision: "year"
  };
}

function parseMonthYear(month: string, year: string): PartialDate {
  return {
    year: Number(year),
    month: monthMap[month],
    precision: "month"
  };
}

function parseDateRange(raw: string): { startDate?: PartialDate; endDate?: PartialDate | "present" } {
  const monthRangeMatch = raw.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) - (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})$/);
  if (monthRangeMatch) {
    return {
      startDate: parseMonthYear(monthRangeMatch[1], monthRangeMatch[3]),
      endDate: parseMonthYear(monthRangeMatch[2], monthRangeMatch[3])
    };
  }

  const yearRangeMatch = raw.match(/^(\d{4}) - (\d{4})$/);
  if (yearRangeMatch) {
    return {
      startDate: parseYear(yearRangeMatch[1]),
      endDate: parseYear(yearRangeMatch[2])
    };
  }

  if (/present/i.test(raw)) {
    const presentMatch = raw.match(/^(\d{4}) - present$/i);
    if (presentMatch) {
      return {
        startDate: parseYear(presentMatch[1]),
        endDate: "present"
      };
    }
  }

  return {};
}

function parseExperienceEntries(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  let currentEntry: ExperienceEntry | null = null;
  let bulletIndex = 1;

  function isHeader(line: string): boolean {
    return (
      /^(.*?)(?: \((.+?)\)) ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) - (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}|\d{4} - \d{4})$/.test(
        line
      )
    );
  }

  for (const line of lines) {
    if (isHeader(line)) {
      const match = line.match(
        /^(.*?)(?: \((.+?)\)) ((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) - (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4})|(?:\d{4} - \d{4}))$/
      );
      if (!match) {
        throw new Error(`Could not parse experience header: ${line}`);
      }

      currentEntry = {
        id: createId("experience", entries.length + 1),
        role: match[1].trim(),
        organisation: match[2].trim(),
        bullets: [],
        ...parseDateRange(match[3].trim())
      };
      entries.push(currentEntry);
      continue;
    }

    if (!currentEntry) {
      continue;
    }

    if (line.startsWith("• ")) {
      currentEntry.bullets.push({
        id: createId("experience-bullet", bulletIndex),
        text: line.slice(2).trim()
      });
      bulletIndex += 1;
      continue;
    }

    const lastBullet = currentEntry.bullets[currentEntry.bullets.length - 1];
    if (lastBullet) {
      lastBullet.text = `${lastBullet.text} ${line}`.trim();
    }
  }

  return entries;
}

function parseProjects(lines: string[]): ProjectEntry[] {
  const projects: ProjectEntry[] = [];
  let currentProject:
    | {
        title: string;
        category?: ProjectEntry["category"];
        descriptionLines: string[];
        technologies: string[];
      }
    | null = null;

  function pushCurrent() {
    if (!currentProject) {
      return;
    }

    projects.push({
      id: createId("project", projects.length + 1),
      title: currentProject.title,
      category: currentProject.category,
      description: currentProject.descriptionLines.join(" ").trim(),
      bullets: [],
      technologies: currentProject.technologies
    });
  }

  for (const line of lines) {
    const projectMatch = line.match(/^(.*?)(?: \((Academic|Personal|Professional|Other)\))(?: LINK)?$/);
    if (projectMatch && !line.startsWith("Technologies Used:")) {
      pushCurrent();
      currentProject = {
        title: projectMatch[1].trim().replace(/Recogni9on/g, "Recognition"),
        category: projectMatch[2] as ProjectEntry["category"],
        descriptionLines: [],
        technologies: []
      };
      continue;
    }

    if (!currentProject) {
      continue;
    }

    if (line.startsWith("Technologies Used:")) {
      currentProject.technologies = line
        .replace("Technologies Used:", "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    currentProject.descriptionLines.push(line);
  }

  pushCurrent();
  return projects;
}

function parseSkills(lines: string[]): SkillGroup[] {
  const skillGroups: SkillGroup[] = [];
  let itemIndex = 1;

  for (const line of lines) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const name = line.slice(0, separatorIndex).trim();
    const rawItems = line.slice(separatorIndex + 1).trim();
    const items = rawItems
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((label) => ({
        id: createId("skill", itemIndex++),
        label
      }));

    skillGroups.push({
      id: createId("skill-group", skillGroups.length + 1),
      name,
      items
    });
  }

  return skillGroups;
}

function createVersionSectionState(
  type: SectionType,
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

function buildImportedProfile(pdfPath: string): CvProfile {
  const extractedText = extractPdfText(pdfPath);
  const lines = normalizeLines(extractedText);
  const sections = splitSections(lines);
  const basics = parseHeader(sections.header);
  const education = parseEducationEntries(sections.educationLines);
  const experience = parseExperienceEntries(sections.experienceLines);
  const projects = parseProjects(sections.projectLines);
  const skills = parseSkills(sections.skillLines);
  const timestamp = new Date().toISOString();

  return {
    id: "profile-imported-cv",
    name: "Dominik Wujek",
    basics,
    summary: {
      text: sections.summary
    },
    education,
    experience,
    projects,
    skills,
    metadata: {
      createdAt: timestamp,
      updatedAt: timestamp,
      sourceLabel: `Imported from ${path.basename(pdfPath)}`
    }
  };
}

function buildImportedVersion(profile: CvProfile): CvVersion {
  const now = new Date().toISOString();
  const educationBulletIds = profile.education.flatMap((entry) => entry.bullets?.map((bullet) => bullet.id) ?? []);
  const experienceBulletIds = profile.experience.flatMap((entry) => entry.bullets.map((bullet) => bullet.id));
  const projectBulletIds = profile.projects.flatMap((entry) => entry.bullets.map((bullet) => bullet.id));
  const skillIds = profile.skills.flatMap((group) => group.items.map((item) => item.id));

  return {
    id: "version-imported-cv",
    profileId: profile.id,
    name: "Imported CV",
    parentVersionId: null,
    documentTemplateId: CLASSIC_V1_TEMPLATE.id,
    sectionOrder: ["personalInfo", "summary", "education", "experience", "projects", "skills"],
    sections: {
      personalInfo: createVersionSectionState("personalInfo", true),
      summary: createVersionSectionState("summary", true),
      education: createVersionSectionState(
        "education",
        true,
        profile.education.map((entry) => entry.id),
        educationBulletIds
      ),
      experience: createVersionSectionState(
        "experience",
        true,
        profile.experience.map((entry) => entry.id),
        experienceBulletIds
      ),
      projects: createVersionSectionState(
        "projects",
        true,
        profile.projects.map((entry) => entry.id),
        projectBulletIds
      ),
      skills: createVersionSectionState("skills", true, skillIds)
    },
    createdAt: now,
    updatedAt: now
  };
}

function main() {
  const pdfPath = process.argv[2] ? path.resolve(process.argv[2]) : defaultPdfPath;
  const profile = buildImportedProfile(pdfPath);
  const version = buildImportedVersion(profile);
  const database = openDatabase();
  const profileRepository = new CvProfileSqliteRepository(database);
  const versionRepository = new CvVersionSqliteRepository(database);

  database.exec(`
    DELETE FROM cv_versions;
    DELETE FROM cv_profiles;
  `);

  profileRepository.save(profile);
  versionRepository.save(version);

  console.log(`Imported CV from ${pdfPath}`);
  console.log(
    JSON.stringify(
      {
        profileId: profile.id,
        versionId: version.id,
        educationEntries: profile.education.length,
        experienceEntries: profile.experience.length,
        projectEntries: profile.projects.length,
        skillGroups: profile.skills.length
      },
      null,
      2
    )
  );
}

main();
