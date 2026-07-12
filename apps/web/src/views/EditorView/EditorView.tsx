import {
  buildRenderableCv,
  getVersionDepth,
  resolveCvProfileForVersion,
  resolveCvVersionInheritance,
  type CvVersion
} from "@cv-control/shared";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentSettingsEditor } from "../../components/editor/DocumentSettingsEditor";
import { SectionOrderEditor } from "../../components/editor/SectionOrderEditor";
import { VersionContentPanel } from "../../components/editor/VersionContentPanel";
import { FitDiagnosticsPanel } from "../../components/preview/FitDiagnosticsPanel";
import { HtmlPreviewPane } from "../../components/preview/HtmlPreviewPane";
import { PdfPreviewPane } from "../../components/preview/PdfPreviewPane";
import { useEditorStore } from "../../stores/editorStore";
import type { EditorSidebarKey } from "../../types/editor";
import { deriveDirtyState } from "../../utils/dirtyState";
import styles from "./EditorView.module.css";

type CascadeSource = "baseline" | "inherited" | "custom";

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

function getDocumentSource(version: CvVersion | null): CascadeSource {
  if (!version?.parentVersionId) {
    return "baseline";
  }

  return version.localOverrides?.documentStyleOverrides || version.localOverrides?.documentTemplateId
    ? "custom"
    : "inherited";
}

function getSectionSource(version: CvVersion | null, sectionType: CvVersion["sectionOrder"][number]): CascadeSource {
  if (!version?.parentVersionId) {
    return "baseline";
  }

  return version.localOverrides?.sections?.[sectionType] ? "custom" : "inherited";
}

function getOrderSource(version: CvVersion | null): CascadeSource {
  if (!version?.parentVersionId) {
    return "baseline";
  }

  return version.localOverrides?.sectionOrder ? "custom" : "inherited";
}

export function EditorView() {
  const [previewMode, setPreviewMode] = useState<"pdf" | "html">("pdf");
  const [renamingVersionId, setRenamingVersionId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const navigate = useNavigate();
  const params = useParams();
  const {
    profile,
    savedProfile,
    versions,
    savedVersions,
    templates,
    activeVersionId,
    selectedSidebarKey,
    isDiagnosticsOpen,
    isBootstrapping,
    errorMessage,
    saveState,
    pdfPreview,
    pdfPreviewVersionId,
    pdfPreviewState,
    closeDiagnostics,
    toggleDiagnostics,
    setActiveVersion,
    renameVersion,
    setSelectedSidebarKey,
    toggleSection,
    moveSection,
    updateDocumentTypography,
    updateDocumentSpacing,
    updateVersionBasicsField,
    clearVersionBasicsOverrides,
    updateSummary,
    updateSummaryLinkUrl,
    toggleSkillGroupSelection,
    toggleItemSelection,
    moveSelectedItem,
    toggleBulletSelection,
    persistDrafts,
    cloneActiveVersion,
    deleteVersion,
    requestPdfPreview
  } = useEditorStore();
  const [htmlOverflowSections, setHtmlOverflowSections] = useState<string[]>([]);
  const activeStoredVersion = versions.find((version) => version.id === activeVersionId) ?? null;
  const activeVersion = useMemo(
    () => (activeVersionId ? resolveCvVersionInheritance(versions, activeVersionId) : null) ?? versions[0] ?? null,
    [activeVersionId, versions]
  );
  const savedActiveVersion = useMemo(
    () => (activeVersion ? resolveCvVersionInheritance(savedVersions, activeVersion.id) ?? null : null),
    [activeVersion, savedVersions]
  );
  const effectiveProfile = useMemo(
    () => (profile && activeVersion ? resolveCvProfileForVersion(profile, activeVersion) : profile),
    [activeVersion, profile]
  );
  const savedEffectiveProfile = useMemo(
    () =>
      savedProfile && savedActiveVersion
        ? resolveCvProfileForVersion(savedProfile, savedActiveVersion)
        : savedProfile,
    [savedActiveVersion, savedProfile]
  );
  const versionTree = useMemo(() => orderVersionsAsTree(versions), [versions]);
  const inheritanceState = useMemo<Partial<Record<EditorSidebarKey, CascadeSource>>>(
    () => ({
      document: getDocumentSource(activeStoredVersion),
      order: getOrderSource(activeStoredVersion),
      personalInfo: activeStoredVersion?.parentVersionId
        ? activeStoredVersion.localOverrides?.basics
          ? "custom"
          : "inherited"
        : "baseline",
      summary: getSectionSource(activeStoredVersion, "summary"),
      education: getSectionSource(activeStoredVersion, "education"),
      experience: getSectionSource(activeStoredVersion, "experience"),
      projects: getSectionSource(activeStoredVersion, "projects"),
      skills: getSectionSource(activeStoredVersion, "skills")
    }),
    [activeStoredVersion]
  );
  const { dirtySidebarKeys } = useMemo(
    () => deriveDirtyState(effectiveProfile, savedEffectiveProfile, activeVersion, savedActiveVersion),
    [activeVersion, effectiveProfile, savedActiveVersion, savedEffectiveProfile]
  );
  const activeTemplate = useMemo(
    () =>
      activeVersion
        ? templates.find((template) => template.id === activeVersion.documentTemplateId) ?? null
        : null,
    [activeVersion, templates]
  );
  const renderResult = useMemo(
    () =>
      effectiveProfile && activeVersion && activeTemplate
        ? buildRenderableCv(effectiveProfile, activeVersion, activeTemplate)
        : null,
    [activeTemplate, activeVersion, effectiveProfile]
  );
  const handleHtmlOverflowChange = useCallback((sectionTypes: string[]) => {
    setHtmlOverflowSections((current) => {
      if (
        current.length === sectionTypes.length &&
        current.every((sectionType, index) => sectionType === sectionTypes[index])
      ) {
        return current;
      }

      return sectionTypes;
    });
  }, []);

  const handledParamVersionId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!params.versionId || params.versionId === handledParamVersionId.current) {
      return;
    }

    const versionExists = versions.some((version) => version.id === params.versionId);
    if (versionExists) {
      handledParamVersionId.current = params.versionId;
      setActiveVersion(params.versionId);
    }
  }, [params.versionId, setActiveVersion, versions]);

  useEffect(() => {
    if (!profile || !activeVersionId || isBootstrapping) {
      return;
    }

    if (
      dirtySidebarKeys.length > 0 ||
      pdfPreviewVersionId === activeVersionId ||
      pdfPreviewState === "loading"
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void requestPdfPreview();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    activeVersionId,
    dirtySidebarKeys.length,
    isBootstrapping,
    pdfPreviewVersionId,
    pdfPreviewState,
    profile,
    requestPdfPreview
  ]);

  useEffect(() => {
    if (!isDiagnosticsOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDiagnostics();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeDiagnostics, isDiagnosticsOpen]);

  if (isBootstrapping || !profile || !effectiveProfile || !activeVersion) {
    return <div className={styles.status}>Loading Editor…</div>;
  }
  if (!activeTemplate || !renderResult) {
    return <div className={styles.status}>No document template found for this version.</div>;
  }

  const enabledSections = activeVersion.sectionOrder.filter(
    (sectionType) => activeVersion.sections[sectionType].enabled
  );

  const onVersionChange = (versionId: string) => {
    setActiveVersion(versionId);
    navigate(`/cvs/${versionId}`);
  };

  const startRename = (version: CvVersion) => {
    setRenamingVersionId(version.id);
    setRenameDraft(version.name);
  };

  const finishRename = () => {
    if (!renamingVersionId) {
      return;
    }

    renameVersion(renamingVersionId, renameDraft);
    setRenamingVersionId(null);
    setRenameDraft("");
  };

  const cancelRename = () => {
    setRenamingVersionId(null);
    setRenameDraft("");
  };

  return (
    <div className={styles.layout}>
      <header className={styles.topBar}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{activeStoredVersion?.name ?? activeVersion.name}</h1>
          <p className={styles.eyebrow}>
            {activeStoredVersion?.parentVersionId ? "Branch CV" : "Baseline CV"} · select content and tune layout
          </p>
        </div>
        <div className={styles.topBarTools}>
          <span aria-live="polite" className={styles.saveStatus}>
            {dirtySidebarKeys.length > 0 ? "Unsaved changes" : saveState === "saved" ? "Saved" : ""}
          </span>
          {dirtySidebarKeys.length > 0 || saveState === "saving" ? (
            <button
              type="button"
              className={styles.toolButton}
              onClick={() => void persistDrafts()}
              disabled={saveState === "saving"}
            >
              {saveState === "saving" ? "Saving…" : "Save"}
            </button>
          ) : null}
          <button
            type="button"
            className={isDiagnosticsOpen ? styles.activeToolButton : styles.toolButton}
            aria-pressed={isDiagnosticsOpen}
            onClick={() => toggleDiagnostics()}
          >
            Diagnostics
          </button>
        </div>
      </header>
      <aside className={styles.sidebar}>
        <section className={styles.versionPanel}>
          <div className={styles.versionHeader}>
            <div>
              <h2>Versions</h2>
            </div>
            <div className={styles.versionHeaderActions}>
              <button type="button" onClick={() => void cloneActiveVersion()}>
                Branch
              </button>
              <button
                type="button"
                onClick={() => startRename(activeStoredVersion ?? activeVersion)}
              >
                Rename
              </button>
              <button
                type="button"
                className={styles.deleteVersionButton}
                disabled={versions.length <= 1}
                onClick={() => {
                  if (window.confirm(`Delete version "${activeVersion.name}"?`)) {
                    void deleteVersion(activeVersion.id).then(() => {
                      navigate("/cvs");
                    });
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
          <div className={styles.versionList}>
            {versionTree.map((version) => {
              const depth = getVersionDepth(versions, version);
              const isInherited = Boolean(version.parentVersionId);

              if (renamingVersionId === version.id) {
                return (
                  <form
                    key={version.id}
                    className={styles.renameForm}
                    style={{ "--version-indent": `${depth * 0.9}rem` } as CSSProperties}
                    onSubmit={(event) => {
                      event.preventDefault();
                      finishRename();
                    }}
                  >
                    <input
                      value={renameDraft}
                      autoFocus
                      aria-label="CV version name"
                      name="versionName"
                      autoComplete="off"
                      onChange={(event) => setRenameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelRename();
                        }
                      }}
                      onBlur={finishRename}
                    />
                  </form>
                );
              }

              return (
              <button
                type="button"
                key={version.id}
                className={version.id === activeVersion.id ? styles.activeVersionButton : styles.versionButton}
                style={{ "--version-indent": `${depth * 0.9}rem` } as CSSProperties}
                aria-current={version.id === activeVersion.id ? "true" : undefined}
                onClick={() => onVersionChange(version.id)}
              >
                <span>{version.name}</span>
                <small>{isInherited ? "inherits" : "baseline"}</small>
              </button>
              );
            })}
          </div>
        </section>

        <SectionOrderEditor
          enabledSections={enabledSections}
          sectionOrder={activeVersion.sectionOrder}
          selectedSidebarKey={selectedSidebarKey}
          dirtyKeys={dirtySidebarKeys}
          inheritanceState={inheritanceState}
          onToggle={toggleSection}
          onSelect={(sectionType) => setSelectedSidebarKey(sectionType)}
          onMove={moveSection}
        />
      </aside>

      <section className={styles.editorColumn}>
        {selectedSidebarKey === "document" ? (
          <div className={styles.documentEditorShell}>
            <DocumentSettingsEditor
              version={activeVersion}
              template={activeTemplate}
              sourceState={inheritanceState.document ?? "baseline"}
              onUpdateTypography={updateDocumentTypography}
              onUpdateSpacing={updateDocumentSpacing}
            />
          </div>
        ) : (
          <VersionContentPanel
            canonicalProfile={profile}
            profile={effectiveProfile}
            version={activeVersion}
            sectionType={selectedSidebarKey}
            sourceState={inheritanceState[selectedSidebarKey] ?? "baseline"}
            onToggleItemSelection={toggleItemSelection}
            onMoveSelectedItem={moveSelectedItem}
            onToggleBulletSelection={toggleBulletSelection}
            onToggleSkillGroupSelection={toggleSkillGroupSelection}
            onUpdateVersionBasicsField={updateVersionBasicsField}
            onClearVersionBasicsOverrides={clearVersionBasicsOverrides}
            onUpdateSummary={updateSummary}
            onUpdateSummaryLinkUrl={updateSummaryLinkUrl}
          />
        )}
        {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
      </section>

      <section className={styles.previewColumn}>
        <section className={styles.previewPanel}>
          {previewMode === "pdf" ? (
            <PdfPreviewPane
              preview={pdfPreview}
              state={pdfPreviewState}
              showHeader={false}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
            />
          ) : (
            <HtmlPreviewPane
              document={renderResult.document}
              onOverflowChange={handleHtmlOverflowChange}
              showHeader={false}
              previewMode={previewMode}
              onPreviewModeChange={setPreviewMode}
              pdfPreview={pdfPreview}
              pdfPreviewState={pdfPreviewState}
            />
          )}
        </section>
      </section>
      {isDiagnosticsOpen ? (
        <aside className={styles.diagnosticsFlyout}>
          <FitDiagnosticsPanel
            diagnostics={renderResult.diagnostics}
            htmlOverflowSections={htmlOverflowSections}
            onClose={closeDiagnostics}
          />
        </aside>
      ) : null}
    </div>
  );
}
