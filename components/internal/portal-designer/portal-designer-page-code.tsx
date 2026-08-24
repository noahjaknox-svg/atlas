"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Check } from "lucide-react";
import type { ZodIssue } from "zod";
import { Button } from "@/components/ui/button";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import {
  proposalSectionPatchSchema,
  sanitizeSectionContentBlocks,
} from "@/lib/experience-section-schema";
import { createBlockId } from "@/lib/page-blocks-utils";
import { walkBlocks } from "@/lib/portal-block-layout";
import { PORTAL_PAGE_CODE_AI_INSTRUCTIONS } from "@/lib/portal-page-code-ai-instructions";
import type { DesignerSection } from "./portal-designer-types";

/** `id` is DB-internal, not part of the published page record — never shown or editable here. */
const pageRecordSchema = proposalSectionPatchSchema.omit({ id: true });

function pageRecordJson(section: DesignerSection): string {
  const record: Record<string, unknown> = { ...section };
  delete record.id;
  return JSON.stringify(record, null, 2);
}

/** Some AI tools fence code regardless of instructions — tolerate a wrapping
 * ```json / ``` fence even though the instructions no longer ask for one. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
  return match ? match[1]!.trim() : trimmed;
}

const KNOWN_BLOCK_TYPES = new Set([
  "text",
  "heading",
  "image",
  "gallery",
  "html",
  "spacer",
  "quote",
  "cta",
  "video",
  "row",
  "container",
]);

/** Find the nearest ancestor of a failing field that looks like a block (has a
 * recognized `type`), and describe it in plain terms, e.g. "row block #2". */
function describeIssueLocation(parsed: unknown, path: (string | number)[]): string | null {
  for (let i = path.length - 1; i >= 0; i--) {
    const candidatePath = path.slice(0, i);
    let node: unknown = parsed;
    for (const key of candidatePath) {
      node = node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined;
    }
    if (
      node &&
      typeof node === "object" &&
      typeof (node as Record<string, unknown>).type === "string" &&
      KNOWN_BLOCK_TYPES.has((node as Record<string, unknown>).type as string)
    ) {
      const indexSegment = candidatePath[candidatePath.length - 1];
      const label = typeof indexSegment === "number" ? ` #${indexSegment + 1}` : "";
      return `${(node as Record<string, unknown>).type} block${label}`;
    }
  }
  return null;
}

/** Translate a Zod issue into something a non-technical user can act on directly,
 * or hand back to an AI to self-correct — falls back to a labeled raw message for
 * issue shapes not specifically handled below. */
function formatZodIssue(issue: ZodIssue, parsed: unknown): string {
  const location = describeIssueLocation(parsed, issue.path);
  const field = issue.path[issue.path.length - 1];
  let detail: string;
  if (issue.code === "invalid_enum_value") {
    detail = `'${field}' must be one of ${issue.options.join(", ")}`;
  } else if (field != null) {
    detail = `'${field}': ${issue.message}`;
  } else {
    detail = issue.message;
  }
  return location ? `${location} — ${detail}` : detail;
}

/** Backfill missing/duplicate block ids in place — safe here since `blocks` is a freshly
 * JSON.parse'd graph nothing else references yet. Zod already confirmed the shape, so the
 * only thing left to fix up is ids an AI can't be trusted to make unique. */
function backfillBlockIds(blocks: ExperiencePageBlock[]): void {
  const seen = new Set<string>();
  walkBlocks(blocks, (block) => {
    if (!block.id || seen.has(block.id)) {
      block.id = createBlockId();
    }
    seen.add(block.id);
  });
}

export function PortalDesignerPageCode({
  section,
  sectionKey,
  onApply,
}: {
  section: DesignerSection;
  sectionKey: string;
  onApply: (patch: Partial<DesignerSection>) => void;
}) {
  const [code, setCode] = useState(() => pageRecordJson(section));
  const [copied, setCopied] = useState(false);
  const [aiCopied, setAiCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiInstructionsFallback, setAiInstructionsFallback] = useState(false);
  const prevSectionKeyRef = useRef(sectionKey);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  // Only resync the buffer when switching to a different page — not on every edit to the
  // current one, so an in-progress paste isn't clobbered by unrelated visual-editor changes.
  useEffect(() => {
    if (prevSectionKeyRef.current === sectionKey) return;
    prevSectionKeyRef.current = sectionKey;
    setCode(pageRecordJson(section));
    setError(null);
    setApplied(false);
  }, [sectionKey, section]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked (permissions, non-HTTPS, sandboxed iframe) — the
      // code is already visible above, so just select it for a manual copy.
      codeRef.current?.select();
      setError("Clipboard unavailable — the code above is selected, press Cmd/Ctrl+C to copy it.");
    }
  }

  async function copyAiInstructions() {
    try {
      await navigator.clipboard.writeText(PORTAL_PAGE_CODE_AI_INSTRUCTIONS);
      setAiCopied(true);
      window.setTimeout(() => setAiCopied(false), 2000);
    } catch {
      // No prompt() fallback here — it throws in sandboxed/embedded contexts just like
      // clipboard can. Reveal the instructions inline instead so they're still copyable.
      setAiInstructionsFallback(true);
    }
  }

  function applyCode() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripCodeFence(code));
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    const result = pageRecordSchema.safeParse(parsed);
    if (!result.success) {
      const issue = result.error.issues[0];
      setError(issue ? formatZodIssue(issue, parsed) : "Invalid page record.");
      return;
    }

    const data = result.data;
    const patch: Record<string, unknown> = { ...data };
    if (data.contentBlocks) {
      if (data.contentBlocks.pageBlocks) {
        // pageBlockSchema validates the same shape as ExperiencePageBlock field-for-field;
        // this bridges Zod's loosely-typed inference to the app's exact discriminated union.
        backfillBlockIds(data.contentBlocks.pageBlocks as unknown as ExperiencePageBlock[]);
      }
      patch.contentBlocks = sanitizeSectionContentBlocks(data.contentBlocks);
    }

    onApply(patch as Partial<DesignerSection>);
    setError(null);
    setApplied(true);
    window.setTimeout(() => setApplied(false), 2000);
  }

  return (
    <div className="space-y-3 p-3">
      <p className="text-xs leading-relaxed text-atlas-muted">
        Full JSON record for this page — what gets published. Edit it directly, or have an AI
        agent build it: copy the instructions below, paste them into another AI along with your
        request (and the current code, if it should build on what&apos;s here), then paste its
        single code block back into the field and click Apply.
      </p>
      <textarea
        ref={codeRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        spellCheck={false}
        className="atlas-input min-h-[38vh] w-full resize-y font-mono text-xs"
      />
      {error ? (
        <p className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-sm text-amber-200">
          {error}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => void copyCode()}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy code
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => void copyAiInstructions()}
        >
          {aiCopied ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden />
              Copy AI instructions
            </>
          )}
        </Button>
      </div>
      {aiInstructionsFallback ? (
        <div className="space-y-1.5">
          <p className="text-xs text-atlas-muted">
            Clipboard unavailable — select all the text below and copy it manually.
          </p>
          <textarea
            readOnly
            value={PORTAL_PAGE_CODE_AI_INSTRUCTIONS}
            onFocus={(e) => e.currentTarget.select()}
            rows={6}
            className="atlas-input w-full font-mono text-xs"
          />
        </div>
      ) : null}
      <Button type="button" size="sm" className="w-full" onClick={applyCode}>
        {applied ? "Applied!" : "Apply"}
      </Button>
    </div>
  );
}
