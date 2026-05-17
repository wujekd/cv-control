import {
  buildRenderableCv,
  CLASSIC_V1_TEMPLATE,
  type RenderDiagnostic,
  type CvProfile,
  type CvVersion,
  type DocumentTemplate
} from "@cv-control/shared";
import { renderLatexDocument } from "./renderLatex";
import { compileLatexWithTectonic } from "../latex/tectonicService";
import { getPdfPageCount } from "./pdfMetrics";

export interface PdfPreviewResult {
  pdfBase64?: string;
  latexSource: string;
  diagnostics: ReturnType<typeof buildRenderableCv>["diagnostics"];
  pageCount?: number;
  compiler: {
    engine: "tectonic";
    available: boolean;
    message: string;
    log?: string;
  };
}

export class PdfPreviewService {
  async renderPreview(
    profile: CvProfile,
    version: CvVersion,
    template: DocumentTemplate = CLASSIC_V1_TEMPLATE
  ): Promise<PdfPreviewResult> {
    const renderResult = buildRenderableCv(profile, version, template);
    const latexSource = renderLatexDocument(renderResult.document);
    const tectonicResult = await compileLatexWithTectonic(latexSource);
    const diagnostics: RenderDiagnostic[] = [...renderResult.diagnostics];
    let pageCount: number | undefined;

    if (tectonicResult.pdfBase64) {
      const pdfBytes = Buffer.from(tectonicResult.pdfBase64, "base64");
      pageCount = await getPdfPageCount(pdfBytes);
      if (pageCount > template.page.maxPages) {
        diagnostics.push({
          code: "compiled_pdf_overflow",
          level: "error",
          message: `Compiled PDF is ${pageCount} pages, exceeding the ${template.page.maxPages}-page limit.`
        });
      }
    }

    return {
      pdfBase64: tectonicResult.pdfBase64,
      latexSource,
      diagnostics,
      pageCount,
      compiler: {
        engine: "tectonic",
        available: tectonicResult.available,
        message: tectonicResult.error ?? "Preview compiled successfully.",
        log: tectonicResult.log
      }
    };
  }
}
