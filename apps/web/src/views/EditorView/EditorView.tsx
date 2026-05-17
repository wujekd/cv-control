import { buildRenderableCv } from "@cv-control/shared";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DocumentSettingsEditor } from "../../components/editor/DocumentSettingsEditor";
import { MasterContentEditor } from "../../components/editor/MasterContentEditor";
import { SectionOrderEditor } from "../../components/editor/SectionOrderEditor";
import { SectionSettingsPanel } from "../../components/editor/SectionSettingsPanel";
import { FitDiagnosticsPanel } from "../../components/preview/FitDiagnosticsPanel";
import { HtmlPreviewPane } from "../../components/preview/HtmlPreviewPane";
import { PdfPreviewPane } from "../../components/preview/PdfPreviewPane";
import { useEditorStore } from "../../stores/editorStore";
import { deriveDirtyState } from "../../utils/dirtyState";
import styles from "./EditorView.module.css";

export function EditorView() {
  const [previewMode, setPreviewMode] = useState<"pdf" | "html">("pdf");
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
    bootstrap,
    closeDiagnostics,
    toggleDiagnostics,
    setActiveVersion,
    setSelectedSidebarKey,
    toggleSection,
    moveSection,
    updateDocumentTypography,
    updateDocumentSpacing,
    updateBasicsField,
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
  const activeVersion = versions.find((version) => version.id === activeVersionId) ?? versions[0] ?? null;
  const savedActiveVersion = activeVersion
    ? savedVersions.find((version) => version.id === activeVersion.id) ?? null
    : null;
  const { dirtySidebarKeys, dirtyItemIdsBySection } = useMemo(
    () => deriveDirtyState(profile, savedProfile, activeVersion, savedActiveVersion),
    [activeVersion, profile, savedActiveVersion, savedProfile]
  );

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!params.versionId || params.versionId === activeVersionId) {
      return;
    }

    const versionExists = versions.some((version) => version.id === params.versionId);
    if (versionExists) {
      setActiveVersion(params.versionId);
    }
  }, [activeVersionId, params.versionId, setActiveVersion, versions]);

  useEffect(() => {
    if (activeVersionId) {
      navigate(`/editor/${activeVersionId}`, { replace: true });
    }
  }, [activeVersionId, navigate]);

  useEffect(() => {
    if (!profile || !activeVersionId || isBootstrapping) {
      return;
    }

    if (dirtySidebarKeys.length > 0 || pdfPreviewVersionId === activeVersionId) {
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

  if (isBootstrapping || !profile || !activeVersion) {
    return <div className={styles.status}>Loading editor...</div>;
  }
  const activeTemplate = templates.find((template) => template.id === activeVersion.documentTemplateId);
  if (!activeTemplate) {
    return <div className={styles.status}>No document template found for this version.</div>;
  }

  const renderResult = buildRenderableCv(profile, activeVersion, activeTemplate);
  const enabledSections = activeVersion.sectionOrder.filter(
    (sectionType) => activeVersion.sections[sectionType].enabled
  );

  const onVersionChange = (versionId: string) => {
    setActiveVersion(versionId);
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
            onClick={() => toggleDiagnostics()}
          >
            Diagnostics
          </button>
          <p className={styles.subtitle}>
            HTML editing, template-guided layout, and debounced LaTeX preview.
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
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                className={version.id === activeVersion.id ? styles.activeVersionButton : styles.versionButton}
                onClick={() => onVersionChange(version.id)}
              >
                {version.name}
              </button>
            ))}
          </div>
          <div className={styles.versionActions}>
            {dirtySidebarKeys.length > 0 || saveState === "saving" ? (
              <button type="button" onClick={() => void persistDrafts()} disabled={saveState === "saving"}>
                {saveState === "saving" ? "Saving..." : "Save"}
              </button>
            ) : null}
            <span>
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
              hasUnsavedChanges={dirtySidebarKeys.includes(selectedSidebarKey)}
              saveState={saveState}
              onSave={() => void persistDrafts()}
            />
            <MasterContentEditor
              profile={profile}
              version={activeVersion}
              sectionType={selectedSidebarKey}
              dirtyItemIds={
                selectedSidebarKey === "education" ||
                selectedSidebarKey === "experience" ||
                selectedSidebarKey === "projects" ||
                selectedSidebarKey === "skills"
                  ? dirtyItemIdsBySection[selectedSidebarKey] ?? []
                  : []
              }
              onUpdateBasicsField={updateBasicsField}
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
              onOverflowChange={setHtmlOverflowSections}
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
