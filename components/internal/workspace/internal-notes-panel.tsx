"use client";

import { useEffect, useRef, useState } from "react";

export function InternalNotesPanel({
  notes,
  onSave,
}: {
  notes: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(notes);
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDraft(notes);
  }, [notes]);

  function handleChange(value: string) {
    setDraft(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setSaving(true);
      onSave(value);
      setSaving(false);
    }, 700);
  }

  return (
    <div className="border-b border-atlas-border px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-wider text-atlas-muted">Internal notes</p>
        {saving && <span className="text-[9px] text-atlas-muted">Saving…</span>}
      </div>
      <textarea
        value={draft}
        onChange={(e) => handleChange(e.target.value)}
        rows={3}
        placeholder="Team notes on this proposal…"
        className="mt-1 w-full resize-none rounded border border-atlas-border/80 bg-atlas-bg px-2 py-1.5 text-[11px] leading-snug focus:border-atlas-accent focus:outline-none"
      />
    </div>
  );
}
