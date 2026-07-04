import type { ApplicationStatus, JobApplication, JobApplicationDraft } from "@cv-control/shared";
import { create } from "zustand";
import { CvApiClient } from "../services/api/client";

interface ApplicationsStore {
  applications: JobApplication[];
  saveState: "idle" | "saving" | "saved" | "error";
  errorMessage: string | null;

  hydrate: (applications: JobApplication[]) => void;
  createApplication: (draft: JobApplicationDraft) => Promise<JobApplication | null>;
  updateApplication: (application: JobApplication) => Promise<void>;
  setStatus: (applicationId: string, status: ApplicationStatus) => Promise<void>;
  deleteApplication: (applicationId: string) => Promise<void>;
  clearVersionLinks: (versionId: string) => void;
}

export const useApplicationsStore = create<ApplicationsStore>((set, get) => ({
  applications: [],
  saveState: "idle",
  errorMessage: null,

  hydrate(applications) {
    set({ applications, saveState: "idle", errorMessage: null });
  },

  async createApplication(draft) {
    set({ saveState: "saving", errorMessage: null });
    try {
      const created = await CvApiClient.createApplication(draft);
      set((state) => ({
        applications: [created, ...state.applications],
        saveState: "saved"
      }));
      return created;
    } catch (error) {
      set({
        saveState: "error",
        errorMessage: error instanceof Error ? error.message : "Failed to create application"
      });
      return null;
    }
  },

  async updateApplication(application) {
    set({ saveState: "saving", errorMessage: null });
    try {
      await CvApiClient.saveApplication(application);
      set((state) => ({
        applications: state.applications.map((item) =>
          item.id === application.id
            ? { ...application, updatedAt: new Date().toISOString() }
            : item
        ),
        saveState: "saved"
      }));
    } catch (error) {
      set({
        saveState: "error",
        errorMessage: error instanceof Error ? error.message : "Failed to save application"
      });
    }
  },

  async setStatus(applicationId, status) {
    const application = get().applications.find((item) => item.id === applicationId);
    if (!application) {
      return;
    }
    await get().updateApplication({ ...application, status });
  },

  async deleteApplication(applicationId) {
    set({ saveState: "saving", errorMessage: null });
    try {
      await CvApiClient.deleteApplication(applicationId);
      set((state) => ({
        applications: state.applications.filter((item) => item.id !== applicationId),
        saveState: "saved"
      }));
    } catch (error) {
      set({
        saveState: "error",
        errorMessage: error instanceof Error ? error.message : "Failed to delete application"
      });
    }
  },

  clearVersionLinks(versionId) {
    set((state) => ({
      applications: state.applications.map((item) =>
        item.versionId === versionId ? { ...item, versionId: null } : item
      )
    }));
  }
}));
