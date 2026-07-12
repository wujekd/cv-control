import { getVersionDepth, type CvVersion } from "@cv-control/shared";
import type { CSSProperties } from "react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApplicationsStore } from "../../stores/applicationsStore";
import { useEditorStore } from "../../stores/editorStore";
import styles from "./CvListView.module.css";

function orderVersionsAsTree(versions: CvVersion[]): CvVersion[] {
  const childrenByParent = new Map<string | null, CvVersion[]>();
  for (const version of versions) {
    const parentId = version.parentVersionId ?? null;
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), version]);
  }

  for (const children of childrenByParent.values()) {
    children.sort((a, b) => a.name.localeCompare(b.name));
  }

  const ordered: CvVersion[] = [];
  const appendChildren = (parentId: string | null, seen: Set<string>) => {
    for (const version of childrenByParent.get(parentId) ?? []) {
      if (seen.has(version.id)) {
        continue;
      }

      ordered.push(version);
      seen.add(version.id);
      appendChildren(version.id, seen);
    }
  };

  appendChildren(null, new Set());
  for (const version of versions) {
    if (!ordered.some((orderedVersion) => orderedVersion.id === version.id)) {
      ordered.push(version);
    }
  }

  return ordered;
}

export function CvListView() {
  const navigate = useNavigate();
  const versions = useEditorStore((state) => state.versions);
  const isBootstrapping = useEditorStore((state) => state.isBootstrapping);
  const branchVersion = useEditorStore((state) => state.branchVersion);
  const applications = useApplicationsStore((state) => state.applications);

  const versionTree = useMemo(() => orderVersionsAsTree(versions), [versions]);
  const versionNames = useMemo(
    () => new Map(versions.map((version) => [version.id, version.name])),
    [versions]
  );
  const childCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const version of versions) {
      if (version.parentVersionId) {
        counts.set(version.parentVersionId, (counts.get(version.parentVersionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [versions]);
  const applicationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const application of applications) {
      if (application.versionId) {
        counts.set(application.versionId, (counts.get(application.versionId) ?? 0) + 1);
      }
    }
    return counts;
  }, [applications]);

  const openVersion = (versionId: string) => {
    navigate(`/cvs/${versionId}`);
  };

  const addApplication = (versionId?: string) => {
    navigate(versionId ? `/applications?versionId=${encodeURIComponent(versionId)}` : "/applications?new=1");
  };

  const createBranch = async (version: CvVersion) => {
    const branch = await branchVersion(version.id, `${version.name} Branch`);
    if (branch) {
      navigate(`/cvs/${branch.id}`);
    }
  };

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <div>
          <h1>CVs</h1>
          <p>Choose a CV to edit, or start an application from a ready CV or one of its inherited branches.</p>
        </div>
        <button type="button" onClick={() => addApplication()}>
          Add Application
        </button>
      </header>

      {isBootstrapping ? (
        <p className={styles.emptyState}>Loading CVs...</p>
      ) : versionTree.length === 0 ? (
        <p className={styles.emptyState}>No CVs yet.</p>
      ) : (
        <ul className={styles.list} aria-label="CV versions">
          {versionTree.map((version) => {
            const depth = getVersionDepth(versions, version);
            const parentName = version.parentVersionId ? versionNames.get(version.parentVersionId) : null;
            const branchCount = childCounts.get(version.id) ?? 0;
            const applicationCount = applicationCounts.get(version.id) ?? 0;

            return (
              <li
                key={version.id}
                className={styles.row}
                style={{ "--version-indent": `${depth * 1.1}rem` } as CSSProperties}
              >
                <button
                  type="button"
                  className={styles.openButton}
                  onClick={() => openVersion(version.id)}
                >
                  <span className={styles.name}>{version.name}</span>
                  <span className={styles.meta}>
                    {parentName ? `Inherits from ${parentName}` : "Baseline CV"}
                  </span>
                </button>
                <div className={styles.stats} aria-label={`Details for ${version.name}`}>
                  <span>{branchCount} {branchCount === 1 ? "branch" : "branches"}</span>
                  <span>{applicationCount} {applicationCount === 1 ? "application" : "applications"}</span>
                </div>
                <div className={styles.actions}>
                  <button type="button" onClick={() => addApplication(version.id)}>
                    Add Application
                  </button>
                  <button type="button" onClick={() => void createBranch(version)}>
                    Branch
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
