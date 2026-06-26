"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ExperiencePageLink } from "@/lib/experience-content";

export function SectionLinksEditor({
  links,
  onChange,
  listTitle = "Buttons on this page",
  addLabel = "Add button",
  emptyHint = "No buttons yet. Each button needs a label and URL (external link or portal path).",
}: {
  links: ExperiencePageLink[];
  onChange: (next: ExperiencePageLink[]) => void;
  listTitle?: string;
  addLabel?: string;
  emptyHint?: string;
}) {
  function update(index: number, patch: Partial<ExperiencePageLink>) {
    onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  }

  function add() {
    onChange([...links, { label: "", url: "" }]);
  }

  function remove(index: number) {
    onChange(links.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= links.length) return;
    const next = [...links];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onChange(next);
  }

  const iconButton =
    "rounded border border-atlas-border/70 p-1 text-atlas-muted transition-colors hover:text-atlas-text disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <div className="rounded border border-atlas-border/50 bg-atlas-bg/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-atlas-text">{listTitle}</span>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 text-xs font-medium text-atlas-accent hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      </div>
      {links.length === 0 ? (
        <p className="mt-2 text-xs text-atlas-muted">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {links.map((link, i) => (
            <li key={i} className="space-y-1.5 rounded border border-atlas-border/40 bg-atlas-bg/50 p-2">
              <div className="flex items-center gap-1">
                <Input
                  value={link.label}
                  onChange={(e) => update(i, { label: e.target.value })}
                  className="h-8 flex-1 text-xs"
                  placeholder="Button label"
                />
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className={iconButton}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === links.length - 1}
                  className={iconButton}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className={iconButton}
                  aria-label="Remove link"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <Input
                value={link.url}
                onChange={(e) => update(i, { url: e.target.value })}
                className="h-8 text-xs"
                placeholder="https://example.com or /experience/welcome"
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
