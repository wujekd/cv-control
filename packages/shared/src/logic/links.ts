import type { LinkRef } from "../types/common";

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function trimLink(link: LinkRef): LinkRef {
  return {
    ...link,
    label: link.label.trim(),
    url: link.url.trim()
  };
}

export function getLinkDisplayLabel(link: Pick<LinkRef, "label" | "url">): string {
  const trimmedLabel = link.label.trim();
  if (trimmedLabel.length > 0) {
    return trimmedLabel;
  }

  return link.url.trim();
}

export function resolveLinkHref(url: string): string {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    return "";
  }

  if (URL_SCHEME_PATTERN.test(trimmedUrl)) {
    return trimmedUrl;
  }

  if (trimmedUrl.includes("@") && !trimmedUrl.includes("/")) {
    return `mailto:${trimmedUrl}`;
  }

  return `https://${trimmedUrl}`;
}

export function getRenderableLinks(links?: LinkRef[]): LinkRef[] {
  return (links ?? [])
    .map(trimLink)
    .filter((link) => link.url.length > 0)
    .map((link) => ({
      ...link,
      label: getLinkDisplayLabel(link)
    }));
}
