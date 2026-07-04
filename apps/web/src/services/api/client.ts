import type {
  BuildRenderableCvResult,
  CvProfile,
  CvVersion,
  DocumentTemplate,
  JobApplication,
  JobApplicationDraft
} from "@cv-control/shared";

declare global {
  interface Window {
    /** Injected by the Electron preload script with the embedded API's port. */
    __CV_CONTROL_API_URL__?: string;
  }
}

const API_URL = window.__CV_CONTROL_API_URL__ ?? "http://localhost:4000/api";

export interface BootstrapResponse {
  profile: CvProfile;
  versions: CvVersion[];
  templates: DocumentTemplate[];
  applications: JobApplication[];
  activeVersionId: string;
}

export interface PdfPreviewResponse {
  pdfBase64?: string;
  latexSource: string;
  diagnostics: BuildRenderableCvResult["diagnostics"];
  pageCount?: number;
  compiler: {
    engine: "tectonic";
    available: boolean;
    message: string;
    log?: string;
  };
}

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${input}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const text = await response.text();
    let message = text || "Request failed";
    try {
      const parsed = JSON.parse(text) as { message?: string };
      if (parsed.message) {
        message = parsed.message;
      }
    } catch {
      // Non-JSON error body; keep the raw text.
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export class CvApiClient {
  static getBootstrap() {
    return requestJson<BootstrapResponse>("/bootstrap");
  }

  static saveProfile(profile: CvProfile) {
    return requestJson<void>("/profile", {
      method: "PUT",
      body: JSON.stringify(profile)
    });
  }

  static saveVersion(version: CvVersion) {
    return requestJson<void>(`/versions/${version.id}`, {
      method: "PUT",
      body: JSON.stringify(version)
    });
  }

  static deleteVersion(versionId: string) {
    return requestJson<void>(`/versions/${versionId}`, {
      method: "DELETE"
    });
  }

  static cloneVersion(versionId: string, name: string) {
    return requestJson<CvVersion>(`/versions/${versionId}/clone`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
  }

  static listApplications() {
    return requestJson<JobApplication[]>("/applications");
  }

  static createApplication(draft: JobApplicationDraft) {
    return requestJson<JobApplication>("/applications", {
      method: "POST",
      body: JSON.stringify(draft)
    });
  }

  static saveApplication(application: JobApplication) {
    return requestJson<void>(`/applications/${application.id}`, {
      method: "PUT",
      body: JSON.stringify(application)
    });
  }

  static deleteApplication(applicationId: string) {
    return requestJson<void>(`/applications/${applicationId}`, {
      method: "DELETE"
    });
  }

  static requestPdfPreview(profile: CvProfile, version: CvVersion, templateId: string) {
    return requestJson<PdfPreviewResponse>("/render/pdf-preview", {
      method: "POST",
      body: JSON.stringify({ profile, version, templateId })
    });
  }
}
