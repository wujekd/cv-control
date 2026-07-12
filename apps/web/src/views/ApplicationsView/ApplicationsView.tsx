import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type JobApplication
} from "@cv-control/shared";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApplicationsStore } from "../../stores/applicationsStore";
import { useEditorStore } from "../../stores/editorStore";
import styles from "./ApplicationsView.module.css";

type CvLinkMode = "none" | "existing" | "custom";

interface ApplicationFormState {
  company: string;
  role: string;
  postingUrl: string;
  status: ApplicationStatus;
  appliedAt: string;
  notes: string;
  cvMode: CvLinkMode;
  versionId: string;
  baseVersionId: string;
}

function createEmptyForm(versionId = ""): ApplicationFormState {
  return {
    company: "",
    role: "",
    postingUrl: "",
    status: "draft",
    appliedAt: "",
    notes: "",
    cvMode: versionId ? "existing" : "none",
    versionId,
    baseVersionId: versionId
  };
}

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected"
};

function toFormState(application: JobApplication): ApplicationFormState {
  return {
    company: application.company,
    role: application.role,
    postingUrl: application.postingUrl ?? "",
    status: application.status,
    appliedAt: application.appliedAt?.slice(0, 10) ?? "",
    notes: application.notes ?? "",
    cvMode: application.versionId ? "existing" : "none",
    versionId: application.versionId ?? "",
    baseVersionId: application.versionId ?? ""
  };
}

export function ApplicationsView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const versions = useEditorStore((state) => state.versions);
  const branchVersion = useEditorStore((state) => state.branchVersion);
  const isBootstrapping = useEditorStore((state) => state.isBootstrapping);
  const { applications, saveState, errorMessage, createApplication, updateApplication, setStatus, deleteApplication } =
    useApplicationsStore();

  const [form, setForm] = useState<ApplicationFormState>(() => createEmptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const handledPrefillKey = useRef<string | null>(null);

  const versionName = (versionId: string | null) =>
    versions.find((version) => version.id === versionId)?.name ?? null;

  const setField = <K extends keyof ApplicationFormState>(field: K, value: ApplicationFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setCvMode = (cvMode: CvLinkMode) => {
    setForm((current) => ({
      ...current,
      cvMode,
      versionId:
        cvMode === "existing" ? current.versionId || versions[0]?.id || "" : current.versionId,
      baseVersionId:
        cvMode === "custom" ? current.baseVersionId || current.versionId || versions[0]?.id || "" : current.baseVersionId
    }));
  };

  const openCreateForm = (versionId = "") => {
    setForm(createEmptyForm(versionId));
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEditForm = (application: JobApplication) => {
    setForm(toFormState(application));
    setEditingId(application.id);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setForm(createEmptyForm());
  };

  useEffect(() => {
    const prefillVersionId = searchParams.get("versionId") ?? "";
    const shouldOpenBlank = searchParams.get("new") === "1";
    const prefillKey = searchParams.toString();

    if (!prefillKey || handledPrefillKey.current === prefillKey) {
      return;
    }

    if (prefillVersionId || shouldOpenBlank) {
      handledPrefillKey.current = prefillKey;
      openCreateForm(prefillVersionId);
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const company = form.company.trim();
    const role = form.role.trim();

    if (!company || !role) {
      return;
    }

    let linkedVersionId = form.cvMode === "existing" ? form.versionId || null : null;
    let customVersionId: string | null = null;

    if (form.cvMode === "custom") {
      const sourceVersionId = form.baseVersionId || versions[0]?.id;
      if (!sourceVersionId) {
        return;
      }

      const name = [company, role].filter(Boolean).join(" — ") || "Tailored CV";
      const branch = await branchVersion(sourceVersionId, name);
      if (!branch) {
        return;
      }

      linkedVersionId = branch.id;
      customVersionId = branch.id;
    }

    const payload = {
      company,
      role,
      postingUrl: form.postingUrl.trim() || undefined,
      status: form.status,
      appliedAt: form.appliedAt || undefined,
      notes: form.notes.trim() || undefined,
      versionId: linkedVersionId
    };

    if (editingId) {
      const existing = applications.find((item) => item.id === editingId);
      if (existing) {
        await updateApplication({ ...existing, ...payload });
      }
    } else {
      const created = await createApplication(payload);
      if (!created) {
        return;
      }
    }
    closeForm();

    if (customVersionId) {
      navigate(`/cvs/${customVersionId}`);
    }
  };

  const handleTailor = async (application: JobApplication) => {
    const baseId = application.versionId ?? versions[0]?.id;
    if (!baseId) {
      return;
    }
    const name = [application.company, application.role].filter(Boolean).join(" — ") || "Tailored CV";
    const branch = await branchVersion(baseId, name);
    if (!branch) {
      return;
    }
    await updateApplication({ ...application, versionId: branch.id });
    navigate(`/cvs/${branch.id}`);
  };

  const handleDelete = (application: JobApplication) => {
    if (window.confirm(`Delete application for ${application.company} — ${application.role}?`)) {
      void deleteApplication(application.id);
    }
  };

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <div>
          <h1>Applications</h1>
          <p>Track where each CV version was sent and how it is progressing.</p>
        </div>
        <div className={styles.headerActions}>
          {saveState === "error" && errorMessage ? (
            <span className={styles.errorText}>{errorMessage}</span>
          ) : null}
          <button type="button" onClick={() => openCreateForm()}>
            New Application
          </button>
        </div>
      </header>

      {isFormOpen ? (
        <form className={styles.formPanel} onSubmit={handleSubmit}>
          <h2>{editingId ? "Edit Application" : "New Application"}</h2>
          <div className={styles.formGrid}>
            <label>
              <span>Company</span>
              <input
                required
                value={form.company}
                onChange={(event) => setField("company", event.target.value)}
              />
            </label>
            <label>
              <span>Role</span>
              <input
                required
                value={form.role}
                onChange={(event) => setField("role", event.target.value)}
              />
            </label>
            <label>
              <span>Posting URL</span>
              <input
                type="url"
                spellCheck={false}
                placeholder="https://"
                value={form.postingUrl}
                onChange={(event) => setField("postingUrl", event.target.value)}
              />
            </label>
            <label>
              <span>Status</span>
              <select
                value={form.status}
                onChange={(event) => setField("status", event.target.value as ApplicationStatus)}
              >
                {APPLICATION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Applied On</span>
              <input
                type="date"
                value={form.appliedAt}
                onChange={(event) => setField("appliedAt", event.target.value)}
              />
            </label>
            <fieldset className={styles.cvField}>
              <legend>CV</legend>
              <div className={styles.cvModeGrid}>
                <label className={form.cvMode === "none" ? styles.cvModeActive : styles.cvMode}>
                  <input
                    type="radio"
                    name="cvMode"
                    checked={form.cvMode === "none"}
                    onChange={() => setCvMode("none")}
                  />
                  <span>No CV yet</span>
                </label>
                <label className={form.cvMode === "existing" ? styles.cvModeActive : styles.cvMode}>
                  <input
                    type="radio"
                    name="cvMode"
                    checked={form.cvMode === "existing"}
                    onChange={() => setCvMode("existing")}
                  />
                  <span>Use ready CV</span>
                </label>
                <label className={form.cvMode === "custom" ? styles.cvModeActive : styles.cvMode}>
                  <input
                    type="radio"
                    name="cvMode"
                    checked={form.cvMode === "custom"}
                    onChange={() => setCvMode("custom")}
                    disabled={versions.length === 0}
                  />
                  <span>Custom for job</span>
                </label>
              </div>
              {form.cvMode === "existing" ? (
                <label className={styles.cvSelectField}>
                  <span>Ready CV</span>
                  <select
                    value={form.versionId}
                    disabled={versions.length === 0}
                    onChange={(event) => setField("versionId", event.target.value)}
                  >
                    {versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {form.cvMode === "custom" ? (
                <label className={styles.cvSelectField}>
                  <span>Inherit From</span>
                  <select
                    value={form.baseVersionId}
                    disabled={versions.length === 0}
                    onChange={(event) => setField("baseVersionId", event.target.value)}
                  >
                    {versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </fieldset>
            <label className={styles.notesField}>
              <span>Notes</span>
              <textarea
                rows={3}
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
              />
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="submit" disabled={saveState === "saving"}>
              {saveState === "saving" ? "Saving…" : editingId ? "Save Changes" : "Add Application"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={closeForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {isBootstrapping ? (
        <p className={styles.emptyState}>Loading…</p>
      ) : applications.length === 0 ? (
        <p className={styles.emptyState}>
          No applications yet. Add one to start tracking where your CVs go.
        </p>
      ) : (
        <ul className={styles.list}>
          {applications.map((application) => (
            <li key={application.id} className={styles.row}>
              <div className={styles.rowMain}>
                <strong>{application.company}</strong>
                <span className={styles.role}>{application.role}</span>
                {application.postingUrl ? (
                  <a href={application.postingUrl} target="_blank" rel="noreferrer">
                    Posting
                  </a>
                ) : null}
              </div>
              <div className={styles.rowMeta}>
                <select
                  aria-label={`Status for ${application.company}`}
                  className={`${styles.statusSelect} ${styles[`status_${application.status}`] ?? ""}`}
                  value={application.status}
                  onChange={(event) =>
                    void setStatus(application.id, event.target.value as ApplicationStatus)
                  }
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                {application.appliedAt ? (
                  <span className={styles.metaText}>Applied {application.appliedAt.slice(0, 10)}</span>
                ) : null}
                {application.versionId && versionName(application.versionId) ? (
                  <button
                    type="button"
                    className={styles.versionLink}
                    onClick={() => navigate(`/cvs/${application.versionId}`)}
                  >
                    {versionName(application.versionId)}
                  </button>
                ) : (
                  <span className={styles.metaText}>No CV linked</span>
                )}
              </div>
              {application.notes ? <p className={styles.notes}>{application.notes}</p> : null}
              <div className={styles.rowActions}>
                <button
                  type="button"
                  title={
                    application.versionId
                      ? "Branch the linked CV into a copy just for this application and open it"
                      : "Create a CV copy for this application and open it"
                  }
                  disabled={versions.length === 0}
                  onClick={() => void handleTailor(application)}
                >
                  Tailor CV
                </button>
                <button type="button" onClick={() => openEditForm(application)}>
                  Edit
                </button>
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => handleDelete(application)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
