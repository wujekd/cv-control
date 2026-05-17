import type { RenderDiagnostic, RenderableCv } from "../types/renderable";

export function getPageSlotOverflowDiagnostic(document: RenderableCv): RenderDiagnostic | null {
  const availableHeight =
    document.page.heightMm - document.page.marginsMm.top - document.page.marginsMm.bottom;
  const totalSectionHeight = document.sections.reduce(
    (sum, section) => sum + section.slotHeightMm,
    0
  );
  const totalGapHeight =
    document.sections.length > 1
      ? document.page.sectionGapMm * (document.sections.length - 1)
      : 0;
  const requiredHeight = totalSectionHeight + totalGapHeight;

  if (requiredHeight <= availableHeight) {
    return null;
  }

  return {
    code: "page_slot_overflow",
    level: "error",
    message: `Enabled sections require ${requiredHeight.toFixed(1)}mm but only ${availableHeight.toFixed(1)}mm is available on the page.`
  };
}

