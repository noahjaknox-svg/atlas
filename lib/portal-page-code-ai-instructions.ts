/** Clipboard prompt for generating a full page record (JSON) compatible with the prospect portal designer. */
export const PORTAL_PAGE_CODE_AI_INSTRUCTIONS = `You are generating a page record for the Portal Designer in a prospect portal (private aviation sales deck). Follow these rules exactly.

## CRITICAL: One single copy block
Your ENTIRE response must be exactly ONE markdown code block — nothing before it, nothing after it.

\`\`\`json
(the complete page record JSON object goes here)
\`\`\`

The user will click Copy once on your code block and paste directly into the "Page Code" box in the designer. If you split output across prose and code, or use multiple code blocks, they cannot paste it correctly.

DO NOT:
- Put any JSON outside the code block
- Add explanations, introductions, or follow-up text outside the code block
- Use multiple code blocks for any reason
- Wrap the object in extra keys — the top level of the code block IS the page record

## Page record shape (top level)
\`\`\`json
{
  "title": "string — internal page name shown in the designer page list",
  "bodyCopy": "string or null — legacy plain-text body, usually leave null when using contentBlocks.pageBlocks",
  "visible": true,
  "sortOrder": 0,
  "imageUrl": null,
  "videoUrl": null,
  "posterUrl": null,
  "calloutMetricLabel": null,
  "calloutMetricValue": null,
  "layoutVariant": null,
  "signatoryName": null,
  "signatoryTitle": null,
  "contentBlocks": { "pageBlocks": [ /* see below */ ] }
}
\`\`\`
Omit any field you don't need to change — all fields above are optional except the object itself. A page's identity (\`id\`, \`sectionType\`, which fixed page slot this is) is controlled by the app and is not part of this record — if you include those keys they are ignored.

## contentBlocks.pageBlocks — the block stack
An ordered array of blocks. Every block is one of these types (each requires an \`id\` — placeholders are fine, e.g. "1", "block-a"; the app auto-generates real unique ids and fixes duplicates, so don't worry about collisions):

- \`{ "id": "...", "type": "text", "markdown": "..." }\` — markdown-formatted body copy
- \`{ "id": "...", "type": "heading", "level": 1|2|3, "text": "..." }\`
- \`{ "id": "...", "type": "image", "url": "...", "alt"?: "...", "caption"?: "...", "imageSize"?: "icon"|"small"|"fit"|"large" }\`
- \`{ "id": "...", "type": "gallery", "items": [{ "url": "...", "caption"?: "..." }], "layout"?: "single"|"leadership"|"leadershipRow"|"editorialPair"|"welcome"|"compact" }\`
- \`{ "id": "...", "type": "html", "html": "..." }\` — raw HTML (see restrictions below)
- \`{ "id": "...", "type": "spacer", "size"?: "sm"|"md"|"lg" }\`
- \`{ "id": "...", "type": "quote", "text": "...", "attribution"?: "..." }\`
- \`{ "id": "...", "type": "cta", "label": "...", "url": "...", "variant"?: "primary"|"secondary" }\`
- \`{ "id": "...", "type": "video", "url": "...", "posterUrl"?: "...", "caption"?: "..." }\`
- \`{ "id": "...", "type": "row", "preset": "...", "gap"?: "sm"|"md"|"lg", "display"?: "columns"|"rows", "columnWeights"?: [1,1], "columns": [ [ /* blocks */ ], [ /* blocks */ ] ] }\` — side-by-side (or stacked) columns, each column is itself an array of blocks
- \`{ "id": "...", "type": "container", "rows": 1-4, "cols": 1-4, "gap"?: "sm"|"md"|"lg", "columnWeights"?: [1], "rowWeights"?: [1], "cellAlign"?: "start"|"stretch", "cells": [ [ [ /* blocks */ ] ] ] }\` — a grid; \`cells\` is rows → columns → array of blocks in that cell

## CRITICAL: centering — blocks do NOT center by default
Every block above (and \`row\`/\`container\`) accepts an optional \`"blockLayout"\` object:
\`{ "widthDesktop"?: "full"|"wide"|"normal"|"narrow"|"compact", "widthMobile"?: same options, "align"?: "left"|"center"|"right", "verticalAlign"?: "top"|"center"|"bottom", "padding"?: "none"|"sm"|"md"|"lg" }\`

If you omit \`blockLayout\`, a block defaults to \`widthDesktop: "normal"\` (80% of the page width) and \`align: "left"\` — meaning it sits flush against the left edge with empty space on the right, NOT centered. For a normal centered page (the common case), put \`"blockLayout": { "align": "center" }\` on every top-level block (headings, text, quote, cta, spacer, row, container — top-level \`html\` blocks too). Only leave a block full-width/left-aligned if that's specifically what was asked for. Blocks nested inside \`row\`/\`container\` columns/cells don't need their own \`align\` — the parent row/container already centers them.

If you use \`html\`-type blocks, its HTML must follow these rules:
- Semantic HTML only: div, p, span, h1-h3, ul, ol, li, a, img, strong, em, br, hr, table/thead/tbody/tr/th/td
- Inline styles or one self-contained \`<style>\` tag in the same block — never external stylesheets
- iframe embeds allowed (YouTube, maps, forms) with standard attributes
- No \`<script>\` tags, event handlers, or javascript: URLs — these are stripped or blocked

## Design context
- Dark theme: dark background (~rgb(10,13,20)), light text
- Body text color: rgba(255,255,255,0.85) minimum — this matches the app's own default for text/markdown blocks. Do NOT go dimmer than this (values like rgba(255,255,255,0.6-0.72) read as noticeably low-contrast and hard to read against the dark background, even though they may look fine in isolation)
- Heading text color: near-white, rgba(255,255,255,0.95) or higher (headings render brighter than body copy elsewhere on the site — match that)
- Content sits inside a centered column; blocks can be full-width or constrained (see centering rule above — this applies to your own custom \`html\` block markup too: don't rely on the outer block being centered if the HTML itself contains multiple visual sections, keep each self-contained card's internal text left- or center-aligned as appropriate but never edge-to-edge with no padding)
- Use rgba/semi-transparent whites for subtle card BACKGROUNDS only (not text), e.g. background: rgba(255,255,255,0.08)
- Accent green used in the app: #4ade80 — use sparingly for highlights, and for small caption/label text only (it's a mid-brightness color, not a substitute for a properly bright body-text color)
- Font: serif headings, sans-serif body (inherit from portal)

## What to ask me (the user) if unclear
- What sections/content should this page contain?
- Any images already uploaded (do you have URLs), or should image blocks be left as placeholders?
- Layout preference (single column, side-by-side columns, a grid)?
- Should this replace the whole page, or should I describe changes to make on top of the current content (paste the current code first if so)?

## Example — your full response should look EXACTLY like this (one code block only):

\`\`\`json
{
  "title": "Why PrismJet",
  "contentBlocks": {
    "pageBlocks": [
      { "id": "1", "type": "heading", "level": 1, "text": "Why owners choose PrismJet", "blockLayout": { "align": "center" } },
      { "id": "2", "type": "text", "markdown": "A short paragraph of body copy introducing the section.", "blockLayout": { "align": "center" } },
      { "id": "3", "type": "cta", "label": "Schedule a call", "url": "https://prismjet.com/contact", "variant": "primary", "blockLayout": { "align": "center" } }
    ]
  }
}
\`\`\`

Now generate the page record for my request. Remember: reply with ONE code block only, no other text.`;
