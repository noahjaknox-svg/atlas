"use client";

import type { RefObject } from "react";
import { PORTAL_VARIABLES } from "@/lib/portal-variables";
import { cn } from "@/lib/utils";

type MarkdownToolbarProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string = before
): { value: string; selectionStart: number; selectionEnd: number } {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd);
  const next =
    value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  return {
    value: next,
    selectionStart: selectionStart + before.length,
    selectionEnd: selectionStart + before.length + selected.length,
  };
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  text: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const { selectionStart, selectionEnd, value } = textarea;
  const next = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
  const pos = selectionStart + text.length;
  return { value: next, selectionStart: pos, selectionEnd: pos };
}

function prefixLines(
  textarea: HTMLTextAreaElement,
  prefix: string
): { value: string; selectionStart: number; selectionEnd: number } {
  const { selectionStart, selectionEnd, value } = textarea;
  const before = value.slice(0, selectionStart);
  const selected = value.slice(selectionStart, selectionEnd);
  const after = value.slice(selectionEnd);
  const prefixed = (selected || "")
    .split("\n")
    .map((line) => (line ? `${prefix}${line}` : prefix.trimEnd()))
    .join("\n");
  const next = before + prefixed + after;
  return {
    value: next,
    selectionStart: selectionStart,
    selectionEnd: selectionStart + prefixed.length,
  };
}

const TOOLBAR_BUTTONS = [
  { id: "bold", label: "B", title: "Bold", action: (ta: HTMLTextAreaElement) => wrapSelection(ta, "**") },
  { id: "italic", label: "I", title: "Italic", action: (ta: HTMLTextAreaElement) => wrapSelection(ta, "_") },
  { id: "h2", label: "H2", title: "Heading 2", action: (ta: HTMLTextAreaElement) => prefixLines(ta, "## ") },
  { id: "h3", label: "H3", title: "Heading 3", action: (ta: HTMLTextAreaElement) => prefixLines(ta, "### ") },
  { id: "ul", label: "•", title: "Bullet list", action: (ta: HTMLTextAreaElement) => prefixLines(ta, "- ") },
  { id: "ol", label: "1.", title: "Numbered list", action: (ta: HTMLTextAreaElement) => prefixLines(ta, "1. ") },
  {
    id: "link",
    label: "Link",
    title: "Link",
    action: (ta: HTMLTextAreaElement) => wrapSelection(ta, "[", "](https://)"),
  },
] as const;

export function MarkdownToolbar({ textareaRef, value, onChange, className }: MarkdownToolbarProps) {
  function applyAction(action: (ta: HTMLTextAreaElement) => ReturnType<typeof wrapSelection>) {
    const ta = textareaRef.current;
    if (!ta) return;
    const result = action(ta);
    onChange(result.value);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  function insertVariable(key: string) {
    const ta = textareaRef.current;
    if (!ta) {
      onChange(value + `{{${key}}}`);
      return;
    }
    const result = insertAtCursor(ta, `{{${key}}}`);
    onChange(result.value);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(result.selectionStart, result.selectionEnd);
    });
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-1 rounded-t border border-b-0 border-atlas-border/80 bg-atlas-surface/40 p-2">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            type="button"
            title={btn.title}
            onClick={() => applyAction(btn.action)}
            className={cn(
              "min-h-8 min-w-8 rounded-md px-2.5 py-1.5 text-xs font-medium text-atlas-muted hover:bg-atlas-bg hover:text-atlas-text",
              (btn.id === "bold" || btn.id === "italic") && "font-serif",
              btn.id === "link" && "min-w-[3rem] px-3"
            )}
          >
            {btn.label}
          </button>
        ))}
        <span className="mx-1 text-atlas-border">|</span>
        <select
          className="h-8 min-w-[7rem] rounded-md border border-atlas-border/60 bg-atlas-bg px-2 text-xs text-atlas-muted"
          defaultValue=""
          onChange={(e) => {
            if (e.target.value) {
              insertVariable(e.target.value);
              e.target.value = "";
            }
          }}
        >
          <option value="">+ Variable</option>
          {PORTAL_VARIABLES.map(({ key, label }) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <details className="rounded-b border border-t-0 border-atlas-border/60 bg-atlas-bg/30 px-2 py-1.5">
        <summary className="cursor-pointer text-xs text-atlas-muted">Syntax help</summary>
        <ul className="mt-1.5 space-y-1 text-xs text-atlas-muted">
          <li>
            <code>**bold**</code>, <code>_italic_</code>
          </li>
          <li>
            <code>## Heading</code>, <code>- list item</code>
          </li>
          <li>
            <code>[label](url)</code>, <code>{`{{contactName}}`}</code>
          </li>
        </ul>
      </details>
    </div>
  );
}
