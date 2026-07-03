/** Clipboard prompt for generating Custom HTML blocks compatible with the prospect portal. */
export const PORTAL_HTML_AI_INSTRUCTIONS = `You are generating HTML for a Custom HTML block in a prospect portal (private aviation sales deck). Follow these rules exactly.

## CRITICAL: One single copy block
Your ENTIRE response must be exactly ONE markdown code block — nothing before it, nothing after it.

\`\`\`html
(complete HTML goes here — root wrapper, <style> if needed, and all markup in this one block)
\`\`\`

The user will click Copy once on your code block and paste directly into a portal textarea. If you split output across prose and code, or use multiple code blocks, they cannot paste it correctly.

DO NOT:
- Put any HTML or CSS outside the code block
- Split <style> into one block and <div> markup into another
- Start HTML in plain text and continue in a code block
- Add explanations, introductions, or follow-up text outside the code block
- Use multiple code blocks for any reason

## Your output (inside the single code block)
- Raw HTML only inside the fence — no markdown inside except the outer fence
- If you use custom class names, include a <style> block in the SAME snippet with every rule for those classes
- Prefer inline style attributes OR one self-contained <style> block at the top of the snippet — never external stylesheets
- One clear root wrapper element; well-formed tags throughout

## Allowed content
- Semantic HTML: div, p, span, h1, h2, h3, ul, ol, li, a, img, strong, em, br, hr, table, thead, tbody, tr, th, td
- Inline CSS via style attributes (preferred for layout)
- A single <style> tag for animations or complex selectors if needed
- iframe embeds (YouTube, Google Maps, Typeform, etc.) with these attributes:
  src, width, height, frameborder, allow, allowfullscreen, loading, title, referrerpolicy, class, style, id

## Forbidden (will be stripped or blocked)
- <script> tags and JavaScript
- Event handlers (onclick, onload, etc.)
- javascript: URLs
- form submissions that POST to external sites (use iframe embeds instead)

## Design context
- The portal uses a dark theme: dark backgrounds, light text (white, off-white, muted gray)
- Content sits inside a centered column; blocks can be full-width or constrained
- Use rgba or semi-transparent whites for subtle cards: e.g. background: rgba(255,255,255,0.08)
- Accent green used in the app: #4ade80 — use sparingly for highlights
- Font: serif headings, sans-serif body (inherit from portal — do not load external fonts unless embed)

## Responsive rules
- Use flex-wrap, max-width: 100%, and box-sizing on containers
- iframes: wrap in a responsive container with position:relative and padding-bottom trick
- Avoid fixed pixel widths over 100% of the viewport

## What to ask me (the user) if unclear
- What content or message should appear?
- Any embed URL (YouTube, map, form)?
- Layout preference (single column, two columns, hero banner, etc.)

## Example — your full response should look EXACTLY like this (one code block only):

\`\`\`html
<div style="width:100%;max-width:100%;box-sizing:border-box;padding:24px;background:rgba(255,255,255,0.06);border-radius:12px;border:1px solid rgba(255,255,255,0.12)">
  <style>
    .example-title { color: #fff; font-size: 1.25rem; margin: 0 0 12px; }
    .example-body { color: rgba(255,255,255,0.75); margin: 0; line-height: 1.6; }
  </style>
  <h2 class="example-title">Section title</h2>
  <p class="example-body">Body copy here.</p>
</div>
\`\`\`

Now generate HTML for my request. Remember: reply with ONE code block only, no other text.`;
