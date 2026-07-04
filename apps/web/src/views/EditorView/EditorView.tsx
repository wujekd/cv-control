import {
  buildRenderableCv,
  getVersionDepth,
  resolveCvProfileForVersion,
  resolveCvVersionInheritance,
  type CvVersion
} from "@cv-control/shared";
import type { CSSProperties } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentSettingsEditor } from "../../components/editor/DocumentSettingsEditor";
import { MasterContentEditor } from "../../components/editor/MasterContentEditor";
import { SectionOrderEditor } from "../../components/editor/SectionOrderEditor";
import { SectionSettingsPanel } from "../../components/editor/SectionSettingsPanel";
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

function countLocalAreas(version: CvVersion | null): number {
  if (!version?.parentVersionId) {
    return 0;
  }

  const sectionCount = Object.values(version.localOverrides?.sections ?? {}).filter(Boolean).length;
  const documentCount =
    version.localOverrides?.documentStyleOverrides || version.localOverrides?.documentTemplateId ? 1 : 0;
  const orderCount = version.localOverrides?.sectionOrder ? 1 : 0;
  return sectionCount + documentCount + orderCount;
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
    updateCanonicalBasicsField,
    updateVersionBasicsField,
    clearVersionBasicsOverrides,
    updateSummary,
    updateSummaryLinkUrl,
    updateEducationEntry,
    updateExperienceEntry,
    updateProjectEntry,
    updateProjectDescriptionLinkUrl,
    addEntryLink,
    updateEntryLink,
    removeEntryLink,
    updateSkillGroupName,
    updateSkillItem,
    addSkillItem,
    removeSkillItem,
    toggleSkillGroupSelection,
    addEntry,
    removeEntry,
    addBullet,
    updateBullet,
    updateBulletLinkUrl,
    removeBullet,
    toggleItemSelection,
    moveSelectedItem,
    toggleBulletSelection,
    persistDrafts,
    cloneActiveVersion,
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
  const localAreaCount = countLocalAreas(activeStoredVersion);
  const { dirtySidebarKeys, dirtyItemIdsBySection } = useMemo(
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

  useEffect(() => {
    if (!params.versionId) {
      return;
    }

    const versionExists = versions.some((version) => version.id === params.versionId);
    if (versionExists) {
      setActiveVersion(params.versionId);
    }
  }, [params.versionId, setActiveVersion, versions]);

  useEffect(() => {
    if (activeVersionId) {
      navigate(`/editor/${activeVersionId}`, { replace: true });
    }
  }, [activeVersionId, navigate]);

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
    navigate(`/editor/${versionId}`);
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
          <h1 className={styles.title}>CV Control</h1>
          <p className={styles.eyebrow}>Structured CV Builder</p>
        </div>
        <div className={styles.topBarTools}>
          <button
            type="button"
            className={isDiagnosticsOpen ? styles.activeToolButton : styles.toolButton}
            aria-pressed={isDiagnosticsOpen}
            onClick={() => toggleDiagnostics()}
          >
            Diagnostics
          </button>
          <p className={styles.subtitle}>
            Edit structured content, tune layout, and preview the compiled CV.
          </p>
        </div>
      </header>
      <aside className={styles.sidebar}>
        <section className={styles.versionPanel}>
          <div className={styles.versionHeader}>
            <div>
              <h2>Versions</h2>
            </div>
            <button type="button" onClick={() => void cloneActiveVersion()}>
              Branch
            </button>
          </div>
          <div className={styles.versionList}>
            {versionTree.map((version) => {
              const depth = getVersionDepth(versions, version);
              const isInherited = Boolean(version.parentVersionId);

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
          <div className={styles.versionActions}>
            {dirtySidebarKeys.length > 0 || saveState === "saving" ? (
              <button type="button" onClick={() => void persistDrafts()} disabled={saveState === "saving"}>
                {saveState === "saving" ? "Saving…" : "Save"}
              </button>
            ) : null}
            <span aria-live="polite">
              {dirtySidebarKeys.length > 0
                ? "Unsaved changes"
                : saveState === "saved"
                  ? "Saved"
                  : "Saved"}
            </span>
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
        <section className={styles.itemSummary}>
          <div className={styles.itemSummaryMeta}>
            <span>Selected CV</span>
            {renamingVersionId === activeStoredVersion?.id ? (
              <form
                className={styles.renameForm}
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
            ) : (
              <strong>{activeStoredVersion?.name ?? activeVersion.name}</strong>
            )}
          </div>
          <div className={styles.itemSummaryActions}>
            <span>{activeStoredVersion?.parentVersionId ? "branch" : "baseline"}</span>
            <button
              type="button"
              className={styles.renameButton}
              onClick={() => startRename(activeStoredVersion ?? activeVersion)}
            >
              Rename
            </button>
          </div>
        </section>
        {selectedSidebarKey === "document" ? (
          <div className={styles.documentEditorShell}>
            <DocumentSettingsEditor
              version={activeVersion}
              template={activeTemplate}
              sourceState={inheritanceState.document ?? "baseline"}
              hasUnsavedChanges={dirtySidebarKeys.length > 0}
              saveState={saveState}
              onUpdateTypography={updateDocumentTypography}
              onUpdateSpacing={updateDocumentSpacing}
              onSave={() => void persistDrafts()}
            />
          </div>
        ) : (
          <>
            <SectionSettingsPanel
              sectionType={selectedSidebarKey}
              version={activeVersion}
              sourceState={inheritanceState[selectedSidebarKey] ?? "baseline"}
              localAreaCount={localAreaCount}
              hasUnsavedChanges={dirtySidebarKeys.includes(selectedSidebarKey)}
              saveState={saveState}
              onSave={() => void persistDrafts()}
            />
            <MasterContentEditor
              canonicalProfile={profile}
              profile={effectiveProfile}
              version={activeVersion}
              sectionType={selectedSidebarKey}
              sourceState={inheritanceState[selectedSidebarKey] ?? "baseline"}
              dirtyItemIds={
                selectedSidebarKey === "education" ||
                selectedSidebarKey === "experience" ||
                selectedSidebarKey === "projects" ||
                selectedSidebarKey === "skills"
                  ? dirtyItemIdsBySection[selectedSidebarKey] ?? []
                  : []
              }
              onUpdateCanonicalBasicsField={updateCanonicalBasicsField}
              onUpdateVersionBasicsField={updateVersionBasicsField}
              onClearVersionBasicsOverrides={clearVersionBasicsOverrides}
              onUpdateSummary={updateSummary}
              onUpdateSummaryLinkUrl={updateSummaryLinkUrl}
              onUpdateEducationEntry={(id, patch) => updateEducationEntry(id, patch)}
              onUpdateExperienceEntry={(id, patch) => updateExperienceEntry(id, patch)}
              onUpdateProjectEntry={(id, patch) => updateProjectEntry(id, patch)}
              onUpdateProjectDescriptionLinkUrl={updateProjectDescriptionLinkUrl}
              onAddEntryLink={addEntryLink}
              onUpdateEntryLink={updateEntryLink}
              onRemoveEntryLink={removeEntryLink}
              onUpdateSkillGroupName={updateSkillGroupName}
              onUpdateSkillItem={updateSkillItem}
              onAddSkillItem={addSkillItem}
              onRemoveSkillItem={removeSkillItem}
              onToggleSkillGroupSelection={toggleSkillGroupSelection}
              onAddEntry={addEntry}
              onRemoveEntry={removeEntry}
              onAddBullet={addBullet}
              onUpdateBullet={updateBullet}
              onUpdateBulletLinkUrl={updateBulletLinkUrl}
              onRemoveBullet={removeBullet}
              onToggleItemSelection={toggleItemSelection}
              onMoveSelectedItem={moveSelectedItem}
              onToggleBulletSelection={toggleBulletSelection}
            />
          </>
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
