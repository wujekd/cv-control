import { useEffect, useState, type RefObject } from "react";

export interface PageFitState {
  globalOverflow: boolean;
  sectionOverflow: Record<string, boolean>;
  renderedPageHeightPx: number;
}

const CSS_PIXELS_PER_MM = 96 / 25.4;

export function usePageFit(
  rootSelectorRef: RefObject<HTMLElement | null>,
  pageHeightMm: number,
  deps: unknown[]
): PageFitState {
  const [state, setState] = useState<PageFitState>({
    globalOverflow: false,
    sectionOverflow: {},
    renderedPageHeightPx: 0
  });

  useEffect(() => {
    const root = rootSelectorRef.current;
    if (!root) {
      return;
    }

    const measure = () => {
      const nextSectionOverflow: Record<string, boolean> = {};
      const expectedPageHeightPx = pageHeightMm * CSS_PIXELS_PER_MM;

      root.querySelectorAll<HTMLElement>("[data-section-slot]").forEach((slot) => {
        const sectionType = slot.dataset.sectionSlot ?? "";
        const preferredHeightMm = Number(slot.dataset.preferredHeightMm ?? "0");
        const preferredHeightPx = preferredHeightMm * CSS_PIXELS_PER_MM;
        nextSectionOverflow[sectionType] = slot.offsetHeight > preferredHeightPx + 1;
      });

      setState({
        globalOverflow: root.scrollHeight > expectedPageHeightPx + 1,
        sectionOverflow: nextSectionOverflow,
        renderedPageHeightPx: root.scrollHeight
      });
    };

    const observer = new ResizeObserver(() => {
      measure();
    });

    observer.observe(root);
    root.querySelectorAll<HTMLElement>("[data-section-slot]").forEach((slot) => observer.observe(slot));
    measure();

    return () => {
      observer.disconnect();
    };
  }, [pageHeightMm, ...deps]);

  return state;
}
