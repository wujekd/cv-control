import { useEffect, useState } from "react";
import type { PdfPreviewResponse } from "../../services/api/client";
import styles from "./PdfPreviewPane.module.css";

interface PdfPreviewPaneProps {
  preview: PdfPreviewResponse | null;
  state: "idle" | "loading" | "ready" | "error";
  showHeader?: boolean;
  previewMode?: "pdf" | "html";
  onPreviewModeChange?: (mode: "pdf" | "html") => void;
}

export function PdfPreviewPane({
  preview,
  state,
  showHeader = true,
  previewMode = "pdf",
  onPreviewModeChange
}: PdfPreviewPaneProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!preview?.pdfBase64) {
      setPdfUrl(null);
      return;
    }

    const binary = atob(preview.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    const blob = new Blob([bytes], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    setPdfUrl(`${objectUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [preview?.pdfBase64]);

  return (
    <section className={styles.panel}>
      {showHeader ? (
        <div className={styles.header}>
          <h2>PDF Preview</h2>
          <p>Debounced backend compile using the Tectonic LaTeX engine.</p>
        </div>
      ) : null}
      <div className={styles.toolbar}>
        <div className={styles.toolbarPrimary}>
          <strong className={styles.toolbarTitle}>Preview</strong>
          <div className={styles.previewTabs}>
            <button
              type="button"
              className={previewMode === "pdf" ? styles.activePreviewTab : styles.previewTab}
              onClick={() => onPreviewModeChange?.("pdf")}
            >
              PDF
            </button>
            <button
              type="button"
              className={previewMode === "html" ? styles.activePreviewTab : styles.previewTab}
              onClick={() => onPreviewModeChange?.("html")}
            >
              HTML
            </button>
          </div>
        </div>
        <span className={styles.statusMeta}>
          {state === "loading" ? "Compiling preview... " : null}
          {preview
            ? `${preview.compiler.engine} · ${
                preview.compiler.available ? "available" : "unavailable"
              }${preview.pageCount ? ` · ${preview.pageCount} ${preview.pageCount === 1 ? "page" : "pages"}` : ""}`
            : state === "loading"
              ? ""
              : "No preview yet"}
        </span>
        {pdfUrl ? (
          <a className={styles.downloadButton} href={pdfUrl} download="cv-preview.pdf">
            Download PDF
          </a>
        ) : null}
      </div>
      {preview?.diagnostics.some((diagnostic) => diagnostic.code === "compiled_pdf_overflow") ? (
        <div className={styles.warning}>
          Compiled PDF exceeds the one-page limit. Reduce content or tighten the template further.
        </div>
      ) : null}
      {pdfUrl ? (
        <iframe title="PDF preview" className={styles.frame} src={pdfUrl} />
      ) : (
        <div className={styles.fallback}>
          <p>{preview?.compiler.message ?? "Run the API and Tectonic backend to generate PDF previews."}</p>
          {preview?.latexSource ? (
            <details>
              <summary>Generated LaTeX source</summary>
              <pre>{preview.latexSource}</pre>
            </details>
          ) : null}
        </div>
      )}
    </section>
  );
}
