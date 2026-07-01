import DOMPurify from "isomorphic-dompurify";

/** Sanitize custom HTML blocks for portal rendering. */
export function sanitizePortalHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["style"],
    ADD_ATTR: ["class", "style", "id", "target", "rel"],
  });
}
