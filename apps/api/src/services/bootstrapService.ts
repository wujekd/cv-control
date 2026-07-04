import {
  SAMPLE_PROFILE,
  SAMPLE_VERSION,
  type CvProfile,
  type CvVersion,
  type DocumentTemplate,
  type JobApplication
} from "@cv-control/shared";
import { CvProfileSqliteRepository } from "../repositories/CvProfileSqliteRepository";
import { CvVersionSqliteRepository } from "../repositories/CvVersionSqliteRepository";
import { DocumentTemplateRepository } from "../repositories/DocumentTemplateRepository";
import { JobApplicationSqliteRepository } from "../repositories/JobApplicationSqliteRepository";

export interface BootstrapPayload {
  profile: CvProfile;
  versions: CvVersion[];
  templates: DocumentTemplate[];
  applications: JobApplication[];
  activeVersionId: string;
}

export class BootstrapService {
  constructor(
    private readonly profileRepository: CvProfileSqliteRepository,
    private readonly versionRepository: CvVersionSqliteRepository,
    private readonly templateRepository: DocumentTemplateRepository,
    private readonly applicationRepository: JobApplicationSqliteRepository
  ) {}

  getBootstrapPayload(): BootstrapPayload {
    let profile = this.profileRepository.get();
    if (!profile) {
      profile = SAMPLE_PROFILE;
      this.profileRepository.save(profile);
    }

    let versions = this.versionRepository.listByProfile(profile.id);
    if (versions.length === 0) {
      this.versionRepository.save(SAMPLE_VERSION);
      versions = [SAMPLE_VERSION];
    }

    return {
      profile,
      versions,
      templates: this.templateRepository.list(),
      applications: this.applicationRepository.list(),
      activeVersionId: versions[0]?.id ?? SAMPLE_VERSION.id
    };
  }
}
