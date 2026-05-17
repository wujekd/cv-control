import {
  getRenderableLinks,
  resolveLinkHref,
  type LinkRef,
  type PartialDate,
  type RenderableCv,
  type RenderableEducationSection,
  type RenderableExperienceSection,
  type RenderableProjectsSection,
  type RenderableSection,
  type RenderableSkillsSection
} from "@cv-control/shared";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatLatexNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(2).replace(/\.?0+$/, "");
}

function getDocumentClassFontSizePt(baseFontSizePt: number): number {
  return [10, 11, 12].includes(baseFontSizePt) ? baseFontSizePt : 10;
}

function getLineHeightPt(fontSizePt: number, lineHeight: number): number {
  return fontSizePt * lineHeight;
}

function escapeLatex(value: string): string {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/{/g, "\\{")
    .replace(/}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function formatPartialDate(date?: PartialDate): string {
  if (!date) {
    return "";
  }

  if (date.precision === "year" || !date.month) {
    return `${date.year}`;
  }

  const month = MONTH_LABELS[date.month - 1] ?? `${date.month}`;
  if (date.precision === "month" || !date.day) {
    return `${month} ${date.year}`;
  }

  return `${date.day} ${month} ${date.year}`;
}

function formatDateRange(startDate?: PartialDate, endDate?: PartialDate | "present"): string {
  const start = formatPartialDate(startDate);
  const end = endDate === "present" ? "Present" : formatPartialDate(endDate);

  if (start && end) {
    return `${start} - ${end}`;
  }

  return end || start;
}

function renderTitle(document: RenderableCv, title: string): string {
  const titleSizePt = document.style.typography.sectionTitleSizePt;
  const titleLineHeightPt = getLineHeightPt(titleSizePt, document.style.spacing.lineHeight);
  return [
    `{\\fontsize{${formatLatexNumber(titleSizePt)}}{${formatLatexNumber(titleLineHeightPt)}}\\selectfont\\bfseries\\MakeUppercase{${escapeLatex(title)}}\\par}`,
    "\\vspace{0.25mm}",
    "\\hrule height 0.3pt",
    "\\vspace{0.85mm}"
  ].join("\n");
}

function renderContactBar(document: RenderableCv, parts: string[]): string {
  if (parts.length === 0) {
    return "";
  }

  const separator = "\\hspace{1.9mm}{\\fontsize{6.4}{6.4}\\selectfont $\\bullet$}\\hspace{1.9mm}";
  const contactBarSizePt = document.style.typography.contactBarSizePt;
  const contactBarLineHeightPt = getLineHeightPt(contactBarSizePt, document.style.spacing.lineHeight);
  return [
    "\\vspace{0.65mm}",
    "{\\setlength{\\fboxsep}{1.7mm}",
    "\\noindent\\colorbox{black}{%",
    "\\parbox{\\dimexpr\\textwidth-2\\fboxsep\\relax}{%",
    `\\centering\\color{white}\\fontsize{${formatLatexNumber(contactBarSizePt)}}{${formatLatexNumber(contactBarLineHeightPt)}}\\selectfont ${parts.join(separator)}%`,
    "}}}"
  ].join("\n");
}

function renderLinkMarker(linkUrl: string): string {
  return `\\href{${escapeLatex(resolveLinkHref(linkUrl))}}{LINK}`;
}

function renderLinkedText(text: string, linkUrl?: string): string {
  return `${escapeLatex(text)}${linkUrl ? ` ${renderLinkMarker(linkUrl)}` : ""}`;
}

function renderBullets(
  document: RenderableCv,
  bullets: { text: string; linkUrl?: string }[] | undefined
): string {
  if (!bullets || bullets.length === 0) {
    return "";
  }

  return [
    `\\begin{itemize}[leftmargin=4mm,itemsep=${formatLatexNumber(document.style.spacing.bulletGapMm)}mm,topsep=${formatLatexNumber(
      Math.max(document.style.spacing.bulletGapMm * 0.8, 0.15)
    )}mm,parsep=0.05mm,partopsep=0mm]`,
    ...bullets.map((bullet) => `\\item ${renderLinkedText(bullet.text, bullet.linkUrl)}`),
    "\\end{itemize}"
  ].join("\n");
}

function renderMetaLine(document: RenderableCv, content: string): string {
  const metaSizePt = document.style.typography.metaSizePt;
  const metaLineHeightPt = getLineHeightPt(metaSizePt, document.style.spacing.lineHeight);
  return `{\\fontsize{${formatLatexNumber(metaSizePt)}}{${formatLatexNumber(metaLineHeightPt)}}\\selectfont ${content}}`;
}

function renderLinks(links: LinkRef[] | undefined, separator = " \\ "): string {
  return getRenderableLinks(links)
    .map((link) => renderLinkMarker(link.url))
    .join(separator);
}

function renderEducation(document: RenderableCv, section: RenderableEducationSection): string {
  if (section.items.length === 0) {
    return "";
  }

  return section.items
    .map((item) => {
      const dateLabel = formatDateRange(item.startDate, item.endDate);
      const lineLinks = renderLinks(item.links);
      const headline = [
        `\\textbf{${escapeLatex(item.qualification)}}`,
        lineLinks ? ` ${lineLinks}` : "",
        item.institution ? `, ${escapeLatex(item.institution)}` : "",
        dateLabel ? ` \\hfill \\textbf{${escapeLatex(dateLabel)}}` : ""
      ].join("");
      const metaLines = [
        item.grade ? renderMetaLine(document, escapeLatex(item.grade)) : ""
      ].filter(Boolean);
      return `${headline}${metaLines.length > 0 ? `\\\\[-0.5mm]${metaLines.join("\\\\[-0.5mm]")}` : ""}\n${renderBullets(document, item.bullets)}`;
    })
    .join(`\n\\vspace{${formatLatexNumber(document.style.spacing.itemGapMm)}mm}\n`);
}

function renderExperience(document: RenderableCv, section: RenderableExperienceSection): string {
  if (section.items.length === 0) {
    return "";
  }

  return section.items
    .map((item) => {
      const dateLabel = formatDateRange(item.startDate, item.endDate);
      const organization = item.organisation ? ` (${escapeLatex(item.organisation)})` : "";
      const lineLinks = renderLinks(item.links);
      const header = `\\textbf{${escapeLatex(item.role)}}${organization}${lineLinks ? ` ${lineLinks}` : ""}${
        dateLabel ? ` \\hfill ${escapeLatex(dateLabel)}` : ""
      }`;
      const metaLines = [
        item.location ? renderMetaLine(document, escapeLatex(item.location)) : ""
      ].filter(Boolean);
      return [header, ...metaLines, renderBullets(document, item.bullets)].filter(Boolean).join("\n");
    })
    .join(`\n\\vspace{${formatLatexNumber(document.style.spacing.itemGapMm)}mm}\n`);
}

function renderProjects(document: RenderableCv, section: RenderableProjectsSection): string {
  if (section.items.length === 0) {
    return "";
  }

  const metaSizePt = document.style.typography.metaSizePt;
  const metaLineHeightPt = getLineHeightPt(metaSizePt, document.style.spacing.lineHeight);

  return section.items
    .map((item) => {
      const category = item.category ? ` {\\textit{(${escapeLatex(item.category)})}}` : "";
      const links = renderLinks(item.links);
      const description = item.description ? renderLinkedText(item.description, item.descriptionLinkUrl) : "";
      const tech =
        item.technologies.length > 0
          ? `{\\raggedright\\fontsize{${formatLatexNumber(metaSizePt)}}{${formatLatexNumber(metaLineHeightPt)}}\\selectfont\\textit{Technologies Used: ${escapeLatex(item.technologies.join(", "))}}\\par}`
          : "";

      return [
        `{\\raggedright\\textbf{${escapeLatex(item.title)}}${category}${links ? ` ${links}` : ""}\\par}`,
        description ? `{\\raggedright ${description}\\par}` : "",
        item.bullets.length > 0 ? renderBullets(document, item.bullets) : "",
        tech
      ]
        .filter(Boolean)
        .join(`\n\\vspace{${formatLatexNumber(Math.max(document.style.spacing.itemGapMm * 0.4, 0.18))}mm}\n`);
    })
    .join(`\n\\vspace{${formatLatexNumber(document.style.spacing.itemGapMm + 0.35)}mm}\n`);
}

function renderSkills(document: RenderableCv, section: RenderableSkillsSection): string {
  if (section.groups.length === 0) {
    return "";
  }

  return section.groups
    .map(
      (group) =>
        `\\textbf{${escapeLatex(group.name)}}: ${escapeLatex(group.items.map((item) => item.label).join(", "))}`
    )
    .join(`\\\\[${formatLatexNumber(Math.max(document.style.spacing.bulletGapMm * 0.9, 0.25))}mm]\n`);
}

function renderSectionContent(document: RenderableCv, section: RenderableSection): string {
  switch (section.type) {
    case "personalInfo": {
      const basics = [
        ...[section.basics.location, section.basics.email, section.basics.phone]
          .filter(Boolean)
          .map((part) => escapeLatex(part as string)),
        ...(section.basics.linkedIn
          ? [renderLinkedText(section.basics.linkedIn, section.basics.linkedIn)]
          : []),
        ...(section.basics.website
          ? [renderLinkedText(section.basics.website, section.basics.website)]
          : [])
      ];

      return [
        "{\\centering",
        `\\fontsize{${formatLatexNumber(document.style.typography.nameSizePt)}}{${formatLatexNumber(getLineHeightPt(document.style.typography.nameSizePt, 1.03))}}\\selectfont\\bfseries\\MakeUppercase{${escapeLatex(section.basics.fullName)}}\\par`,
        renderContactBar(document, basics),
        "\\par}"
      ].join("\n");
    }
    case "summary": {
      if (!section.summary) {
        return "";
      }

      const summaryText = `{\\fontsize{${formatLatexNumber(document.style.typography.bodySizePt)}}{${formatLatexNumber(
        getLineHeightPt(document.style.typography.bodySizePt, document.style.spacing.lineHeight)
      )}}\\selectfont ${renderLinkedText(section.summary.text, section.summary.linkUrl)}}`;

      return summaryText;
    }
    case "education":
      return renderEducation(document, section);
    case "experience":
      return renderExperience(document, section);
    case "projects":
      return renderProjects(document, section);
    case "skills":
      return renderSkills(document, section);
  }
}

function renderFlowSection(document: RenderableCv, section: RenderableSection): string {
  const content = renderSectionContent(document, section);
  if (!content) {
    return "";
  }

  const title =
    section.titleHeightMm > 0 && section.type !== "summary" ? `${renderTitle(document, section.title)}\n` : "";
  const postTitleSpacing =
    title && section.contentPaddingMm.top > 0
      ? `\\vspace{${formatLatexNumber(section.contentPaddingMm.top)}mm}`
      : "";

  return [
    "\\par\\noindent",
    title,
    postTitleSpacing,
    content,
    "\\par"
  ].join("\n");
}

export function renderLatexDocument(document: RenderableCv): string {
  const sections = document.sections
    .map((section) => renderFlowSection(document, section))
    .filter(Boolean)
    .join(`\n\\vspace{${document.page.sectionGapMm}mm}\n`);
  const baseFontSizePt = document.style.typography.bodySizePt;
  const baseLineHeightPt = getLineHeightPt(baseFontSizePt, document.style.spacing.lineHeight);
  const documentClassFontSizePt = getDocumentClassFontSizePt(baseFontSizePt);
  return `
\\documentclass[${documentClassFontSizePt}pt]{${document.latexTheme.documentClass}}
\\usepackage[
  a4paper,
  top=${document.page.marginsMm.top}mm,
  right=${document.page.marginsMm.right}mm,
  bottom=${document.page.marginsMm.bottom}mm,
  left=${document.page.marginsMm.left}mm
]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage{enumitem}
\\usepackage[scaled=0.95]{helvet}
\\usepackage[hidelinks]{hyperref}
\\usepackage[table]{xcolor}
\\pagestyle{empty}
\\renewcommand{\\familydefault}{\\sfdefault}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\raggedbottom
\\begin{document}
\\fontsize{${formatLatexNumber(baseFontSizePt)}}{${formatLatexNumber(baseLineHeightPt)}}\\selectfont
\\raggedright
${sections}
\\end{document}
`.trim();
}
