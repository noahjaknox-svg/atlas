import {
  BLOCK_ALIGNS,
  BLOCK_PADDINGS,
  BLOCK_VERTICAL_ALIGNS,
  CONTAINER_CELL_ALIGNS,
  CTA_VARIANTS,
  EXPERIENCE_GALLERY_LAYOUTS,
  IMAGE_DISPLAY_SIZES,
  ROW_DISPLAYS,
  ROW_GAPS,
  ROW_PRESETS,
} from "./experience-block-enums";
import { DEFAULT_LAYOUT_SETTINGS } from "./portal-layout-settings";
import { PORTAL_VARIABLES } from "./portal-variables";

const WIDTH_PRESETS = DEFAULT_LAYOUT_SETTINGS.widthPresets.map((p) => `"${p.id}"`).join("|");

/** Clipboard prompt for generating a full page record (JSON) compatible with the prospect portal designer. */
export const PORTAL_PAGE_CODE_AI_INSTRUCTIONS = `You are generating a page record for the Portal Designer in a prospect portal (private aviation sales deck). Follow these rules exactly.

## CRITICAL: raw JSON only — no code fence, no markdown, nothing else
Your ENTIRE response must be the JSON object itself and nothing else: no \`\`\`json fence, no backticks, no explanations, no introductions, no follow-up text. The user pastes your response directly into a box that runs \`JSON.parse\` on it — a code fence or any prose around the object will make it fail to parse.

(This document uses fenced code blocks below to show you the JSON *shape* for readability — that's just documentation formatting. Your actual reply must NOT be fenced.)

DO NOT:
- Wrap your answer in \`\`\`json or \`\`\` of any kind
- Put any text before or after the JSON object
- Use multiple code blocks or split the object across prose
- Wrap the object in extra keys — the top level of your reply IS the page record

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
An ordered array of blocks. Every block requires an \`id\` (placeholders are fine, e.g. "1", "block-a" — the app auto-generates real unique ids and fixes duplicates, so don't worry about collisions) and a \`type\`. Every field below marked with a fixed list of options is a strict enum — using any other value fails validation:

- \`{ "id": "...", "type": "text", "markdown": "..." }\` — markdown-formatted body copy
- \`{ "id": "...", "type": "heading", "level": 1|2|3, "text": "..." }\`
- \`{ "id": "...", "type": "image", "url": "...", "alt"?: "...", "caption"?: "...", "imageSize"?: ${IMAGE_DISPLAY_SIZES.map((v) => `"${v}"`).join("|")} }\`
- \`{ "id": "...", "type": "gallery", "items": [{ "url": "...", "caption"?: "..." }], "layout"?: ${EXPERIENCE_GALLERY_LAYOUTS.map((v) => `"${v}"`).join("|")} }\`
- \`{ "id": "...", "type": "html", "html": "..." }\` — raw HTML (see restrictions below)
- \`{ "id": "...", "type": "spacer", "size"?: ${ROW_GAPS.map((v) => `"${v}"`).join("|")} }\`
- \`{ "id": "...", "type": "quote", "text": "...", "attribution"?: "..." }\`
- \`{ "id": "...", "type": "cta", "label": "...", "url": "...", "variant"?: ${CTA_VARIANTS.map((v) => `"${v}"`).join("|")} }\`
- \`{ "id": "...", "type": "video", "url": "...", "posterUrl"?: "...", "caption"?: "..." }\`
- \`{ "id": "...", "type": "stat", "value": "100+", "label": "Years combined experience", "countUp"?: true|false }\` — one big highlighted figure with a small caption. **Animated:** when \`countUp\` is on (default) the first number in \`value\` counts up once scrolled into view (e.g. "100+", "$2.4M", "15%")
- \`{ "id": "...", "type": "blockVsFlight", "blockHours"?: number, "flightHours"?: number }\` — **animated** charter-payback bars comparing taxi-to-taxi (block) time with wheels-up (flight) time. Omit the hours to use each proposal's own aircraft numbers (almost always what you want)
- \`{ "id": "...", "type": "row", "preset": ${ROW_PRESETS.map((v) => `"${v}"`).join("|")}, "gap"?: ${ROW_GAPS.map((v) => `"${v}"`).join("|")}, "display"?: ${ROW_DISPLAYS.map((v) => `"${v}"`).join("|")}, "columnWeights"?: [1,1], "cellCardStyle"?: true|false, "columns": [ [ /* blocks */ ], [ /* blocks */ ] ] }\` — side-by-side (or stacked) columns, each column is itself an array of blocks. **\`preset\` caps at 3 columns** (\`equal-3\`) — \`equal-2\`/\`wide-narrow\`/\`narrow-wide\` are all 2 columns. For 4+ columns (or a true grid), use \`container\` instead.
- \`{ "id": "...", "type": "container", "rows": 1-4, "cols": 1-4, "gap"?: ${ROW_GAPS.map((v) => `"${v}"`).join("|")}, "columnWeights"?: [1], "rowWeights"?: [1], "cellAlign"?: ${CONTAINER_CELL_ALIGNS.map((v) => `"${v}"`).join("|")}, "cellCardStyle"?: true|false, "cells": [ [ [ /* blocks */ ] ] ] }\` — a grid up to 4×4; \`cells\` is rows → columns → array of blocks in that cell

**\`cellCardStyle\`** (on \`row\`/\`container\`, default \`false\`): set \`true\` to give every column/cell a subtle card treatment (translucent background, rounded corners, padding) — use this for a grid of distinct items (feature cards, service tiles, a 3-up comparison). Leave it \`false\`/omitted for a plain editorial split (e.g. text on one side, an image on the other) that shouldn't look boxed.

## Animation — only the two animated blocks, otherwise use a static image
The ONLY supported animation is the built-in \`stat\` count-up and \`blockVsFlight\` bars. Both degrade safely: viewers with reduced motion turned on, older browsers, and PDF/print see their finished state (final numbers, full bars) — so write them so the finished state reads well on its own.

Do NOT try to build animation any other way: no \`<script>\` (it is stripped), and avoid CSS \`@keyframes\`/\`animation\`/\`transition\` in \`html\` blocks — it doesn't play for reduced-motion viewers, in some browsers, or in PDF/print, and the designer flags it. **If the request calls for motion you can't express with \`stat\` or \`blockVsFlight\`, use an \`image\` block with a static picture instead** (set \`"url": ""\` if no image URL was provided so the user can upload one, and write a descriptive \`alt\`), and tell the user in the \`alt\` text what the static image should show.

## Personalization variables
Text, heading, quote, button-label and stat text can include \`{{variable}}\` placeholders that fill in per proposal: ${PORTAL_VARIABLES.map((v) => `\`{{${v.key}}}\``).join(", ")}. They are NOT filled in inside \`html\` blocks, image/gallery captions, or URLs.

## Centering and width — blocks are centered by default
Every block above (and \`row\`/\`container\`) accepts an optional \`"blockLayout"\` object:
\`{ "widthDesktop"?: ${WIDTH_PRESETS}, "widthMobile"?: same options, "align"?: ${BLOCK_ALIGNS.map((v) => `"${v}"`).join("|")}, "verticalAlign"?: ${BLOCK_VERTICAL_ALIGNS.map((v) => `"${v}"`).join("|")}, "padding"?: ${BLOCK_PADDINGS.map((v) => `"${v}"`).join("|")} }\`

If you omit \`blockLayout\`, a top-level block defaults to \`widthDesktop: "normal"\` (80% of the page width) and \`align: "center"\` — a centered column. Text *inside* a text block still reads left-to-right as normal; \`align\` positions the block, not the lines of text. Set \`"align": "left"\` on a block (typically with \`"widthDesktop": "full"\`) for a left-aligned editorial layout, and keep one alignment consistent down the page. Blocks nested inside \`row\`/\`container\` cells fill their cell by default.

**Always set \`widthMobile\` and \`padding\` explicitly too** — don't rely on desktop-only defaults. A \`"wide"\` or \`"full"\` width block with no \`padding\` set will run edge-to-edge with text touching the screen on phones. A safe default for most top-level blocks: \`{ "align": "center", "widthDesktop": "normal", "widthMobile": "full", "padding": "sm" }\`, adjusting \`widthDesktop\` up to \`"wide"\`/\`"full"\` only for things meant to be visually prominent (a hero image, a full-bleed banner).

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
- Use rgba/semi-transparent whites for subtle card BACKGROUNDS only (not text), e.g. background: rgba(255,255,255,0.08) — or, for a grid of \`row\`/\`container\` blocks, prefer the built-in \`cellCardStyle: true\` (above) over hand-rolled \`html\` card markup
- Accent green used in the app: #4ade80 — use sparingly for highlights, and for small caption/label text only (it's a mid-brightness color, not a substitute for a properly bright body-text color)
- Font: serif headings, sans-serif body (inherit from portal)

## What to ask me (the user) if unclear
- What sections/content should this page contain?
- Any images already uploaded (do you have URLs), or should image blocks be left as placeholders?
- Layout preference (single column, side-by-side columns, a grid)?
- Should this replace the whole page, or should I describe changes to make on top of the current content (paste the current code first if so)?

## Example — your full response should look EXACTLY like this, with no fence around it:

{
  "title": "Why PrismJet",
  "contentBlocks": {
    "pageBlocks": [
      { "id": "1", "type": "heading", "level": 1, "text": "Why owners choose PrismJet", "blockLayout": { "align": "center", "widthDesktop": "normal", "widthMobile": "full", "padding": "sm" } },
      { "id": "2", "type": "text", "markdown": "A short paragraph of body copy introducing the section.", "blockLayout": { "align": "center", "widthDesktop": "normal", "widthMobile": "full", "padding": "sm" } },
      { "id": "3", "type": "cta", "label": "Schedule a call", "url": "https://prismjet.com/contact", "variant": "primary", "blockLayout": { "align": "center", "widthDesktop": "normal", "widthMobile": "full", "padding": "sm" } }
    ]
  }
}

Now generate the page record for my request. Remember: reply with the raw JSON object only — no code fence, no other text.`;
