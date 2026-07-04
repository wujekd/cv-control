import {
  getRenderableLinks,
  resolveLinkHref,
  type LinkRef,
  type RenderableCv,
  type RenderableSection
} from "@cv-control/shared";
import { useEffect, useRef, type ReactNode } from "react";
import { usePageFit } from "../../hooks/usePageFit";
import type { PdfPreviewResponse } from "../../services/api/client";
import styles from "./HtmlPreviewPane.module.css";

function renderLinkMarker(linkUrl: string, className?: string) {
  return (
    <a
      className={className ? `${styles.inlineLink} ${className}` : styles.inlineLink}
      href={resolveLinkHref(linkUrl)}
      target="_blank"
      rel="noreferrer"
    >
      LINK
    </a>
  );
}

function renderLinkedText(text: string, linkUrl?: string, className?: string, markerClassName?: string) {
  return (
    <>
      <span className={className}>{text}</span>
      {linkUrl ? (
        <>
          {" "}
          {renderLinkMarker(linkUrl, markerClassName)}
        </>
      ) : null}
    </>
  );
}

function renderBullets(bullets: { id: string; text: string; linkUrl?: string }[] | undefined) {
  if (!bullets || bullets.length === 0) {
    return null;
  }

  return (
    <ul className={styles.bullets}>
      {bullets.map((bullet) => (
        <li key={bullet.id}>{renderLinkedText(bullet.text, bullet.linkUrl)}</li>
      ))}
    </ul>
  );
}

function renderInlineLinks(links: LinkRef[] | undefined, className = styles.inlineLinks) {
  const renderableLinks = getRenderableLinks(links);
  if (renderableLinks.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {renderableLinks.map((link, index) => (
        <span key={link.id}>
          {renderLinkMarker(link.url, className)}
          {index < renderableLinks.length - 1 ? <span className={styles.linkSeparator}> · </span> : null}
        </span>
      ))}
    </span>
  );
}

function renderSeparatedInline(items: Array<{ key: string; content: ReactNode }>) {
  return items.map((item, index) => (
    <span key={item.key}>
      {item.content}
      {index < items.length - 1 ? <span className={styles.contactSeparator}> • </span> : null}
    </span>
  ));
}

function getPersonalInfoParts(section: Extract<RenderableSection, { type: "personalInfo" }>) {
  const parts: Array<{ key: string; content: ReactNode }> = [section.basics.location, section.basics.email, section.basics.phone]
    .filter(Boolean)
    .map((part, index) => ({
      key: `contact-${index}-${part}`,
      content: <>{part}</>
    }));

  if (section.basics.linkedIn) {
    parts.push({
      key: "contact-linkedin",
      content: renderLinkedText(section.basics.linkedIn, section.basics.linkedIn, styles.contactText, styles.contactLink)
    });
  }

  if (section.basics.website) {
    parts.push({
      key: "contact-website",
      content: renderLinkedText(section.basics.website, section.basics.website, styles.contactText, styles.contactLink)
    });
  }

  return parts;
}

function renderSectionContent(section: RenderableSection) {
  switch (section.type) {
    case "personalInfo":
      return (
        <div className={styles.personalBlock}>
          <h1>{section.basics.fullName}</h1>
          <div className={styles.contactBar}>{renderSeparatedInline(getPersonalInfoParts(section))}</div>
        </div>
      );
    case "summary":
      return (
        <>
          <p className={styles.summary}>
            {renderLinkedText(section.summary?.text ?? "", section.summary?.linkUrl)}
          </p>
        </>
      );
    case "education":
      return section.items.map((item) => (
        <article key={item.id} className={styles.entry}>
          <header className={styles.entryHeader}>
            <div className={styles.entryHeadingGroup}>
              <strong>{item.qualification}</strong>
              {renderInlineLinks(item.links, styles.entryHeaderLinks)}
            </div>
            <span>{item.institution}</span>
          </header>
          {item.grade ? <p className={styles.mutedInline}>{item.grade}</p> : null}
          {renderBullets(item.bullets)}
        </article>
      ));
    case "experience":
      return section.items.map((item) => (
        <article key={item.id} className={styles.entry}>
          <header className={styles.entryHeader}>
            <div className={styles.entryHeadingGroup}>
              <strong>{item.role}</strong>
              {renderInlineLinks(item.links, styles.entryHeaderLinks)}
            </div>
            <span>{item.organisation}</span>
          </header>
          {item.location ? <p className={styles.mutedInline}>{item.location}</p> : null}
          {renderBullets(item.bullets)}
        </article>
      ));
    case "projects":
      return section.items.map((item) => (
        <article key={item.id} className={styles.projectEntry}>
          <p className={styles.projectTitleLine}>
            <strong>{item.title}</strong>
            {item.category ? <em> ({item.category})</em> : null}
            {getRenderableLinks(item.links).length > 0 ? (
              <>
                {" "}
                {renderInlineLinks(item.links, styles.projectLinks)}
              </>
            ) : null}
          </p>
          {item.description ? (
            <p className={styles.projectDescription}>
              {renderLinkedText(item.description, item.descriptionLinkUrl)}
            </p>
          ) : null}
          {renderBullets(item.bullets)}
          {item.technologies.length > 0 ? (
            <p className={styles.projectTechnologies}>
              <span>Technologies Used:</span> {item.technologies.join(", ")}
            </p>
          ) : null}
        </article>
      ));
    case "skills":
      return (
        <div className={styles.skillsBlock}>
          {section.groups.map((group) => (
            <p key={group.id}>
              <strong>{group.name}:</strong> {group.items.map((item) => item.label).join(", ")}
            </p>
          ))}
        </div>
      );
  }
}

interface HtmlPreviewPaneProps {
  document: RenderableCv;
  onOverflowChange?: (sectionTypes: string[]) => void;
  showHeader?: boolean;
  previewMode?: "pdf" | "html";
  onPreviewModeChange?: (mode: "pdf" | "html") => void;
  pdfPreview?: PdfPreviewResponse | null;
  pdfPreviewState?: "idle" | "loading" | "ready" | "error";
}

export function HtmlPreviewPane({
  document,
  onOverflowChange,
  showHeader = true,
  previewMode = "html",
  onPreviewModeChange,
  pdfPreview,
  pdfPreviewState = "idle"
}: HtmlPreviewPaneProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pageFit = usePageFit(rootRef, document.page.heightMm, [document]);
  const previewScale = 0.76;
  const minPreviewHeightPx = (document.page.heightMm / 25.4) * 96 * previewScale;
  const renderedPreviewHeightPx = Math.max(minPreviewHeightPx, pageFit.renderedPageHeightPx * previewScale);

  useEffect(() => {
    onOverflowChange?.(
      Object.entries(pageFit.sectionOverflow)
        .filter(([, hasOverflow]) => hasOverflow)
        .map(([sectionType]) => sectionType)
    );
  }, [onOverflowChange, pageFit.sectionOverflow]);

  return (
    <section className={styles.panel}>
      {showHeader ? (
        <div className={styles.header}>
          <h2>HTML Preview</h2>
          <p>The browser preview flows content naturally and uses the template slot heights as fit targets.</p>
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
        <span className={styles.statusMeta} aria-live="polite">
          {pdfPreviewState === "loading" ? "Compiling Preview… " : null}
          {pdfPreview
            ? `${pdfPreview.compiler.engine} · ${
                pdfPreview.compiler.available ? "available" : "unavailable"
              }${pdfPreview.pageCount ? ` · ${pdfPreview.pageCount} ${pdfPreview.pageCount === 1 ? "page" : "pages"}` : ""}`
            : pdfPreviewState === "loading"
              ? ""
              : "No preview yet"}
        </span>
      </div>
      <div className={styles.previewFrame}>
        <div
          className={styles.scaledCanvas}
          style={{
            width: `${document.page.widthMm * previewScale}mm`,
            height: `${renderedPreviewHeightPx}px`
          }}
        >
          <div
            ref={rootRef}
            className={styles.page}
            style={{
              width: `${document.page.widthMm}mm`,
              minHeight: `${document.page.heightMm}mm`,
              padding: `${document.page.marginsMm.top}mm ${document.page.marginsMm.right}mm ${document.page.marginsMm.bottom}mm ${document.page.marginsMm.left}mm`,
              gap: `${document.page.sectionGapMm}mm`,
              transform: `scale(${previewScale})`,
              ["--cv-font-family" as string]: document.htmlTheme.fontFamily,
              ["--cv-body-size" as string]: `${document.style.typography.bodySizePt}pt`,
              ["--cv-line-height" as string]: `${document.style.spacing.lineHeight}`,
              ["--cv-name-size" as string]: `${document.style.typography.nameSizePt}pt`,
              ["--cv-section-title-size" as string]: `${document.style.typography.sectionTitleSizePt}pt`,
              ["--cv-meta-size" as string]: `${document.style.typography.metaSizePt}pt`,
              ["--cv-contact-bar-size" as string]: `${document.style.typography.contactBarSizePt}pt`,
              ["--cv-item-gap" as string]: `${document.style.spacing.itemGapMm}mm`,
              ["--cv-bullet-gap" as string]: `${document.style.spacing.bulletGapMm}mm`,
              ["--cv-heading-tracking" as string]: `${document.htmlTheme.headingTrackingEm}em`
            }}
          >
            {document.sections.map((section) => {
              const hasOverflow = pageFit.sectionOverflow[section.type];
              const slotClassName =
                section.type === "personalInfo"
                  ? hasOverflow
                    ? styles.headerSlotOverflow
                    : styles.headerSlot
                  : hasOverflow
                    ? styles.slotOverflow
                    : styles.slot;
              return (
                <section
                  key={section.type}
                  data-section-slot={section.type}
                  data-preferred-height-mm={section.slotHeightMm}
                  className={slotClassName}
                >
                  {section.titleHeightMm > 0 ? (
                    <header
                      className={styles.sectionHeader}
                      style={{ minHeight: `${section.titleHeightMm}mm` }}
                    >
                      {section.title}
                    </header>
                  ) : null}
                  <div
                    data-section-content=""
                    className={
                      section.contentAlignY === "center"
                        ? styles.contentCenter
                        : styles.contentStart
                    }
                    style={{
                      paddingTop: `${section.contentPaddingMm.top}mm`,
                      paddingRight: `${section.contentPaddingMm.right}mm`,
                      paddingBottom: `${section.contentPaddingMm.bottom}mm`,
                      paddingLeft: `${section.contentPaddingMm.left}mm`
                    }}
                  >
                    {renderSectionContent(section)}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles.meta}>
        <span>{pageFit.globalOverflow ? "HTML preview exceeds one page" : "HTML preview fits within one page"}</span>
      </div>
    </section>
  );
}
