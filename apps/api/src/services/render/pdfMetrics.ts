import { PDFDocument } from "pdf-lib";

export async function getPdfPageCount(pdfBytes: Uint8Array): Promise<number> {
  const pdfDocument = await PDFDocument.load(pdfBytes);
  return pdfDocument.getPageCount();
}

