"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatHours(n: number): string {
  if (!Number.isFinite(n)) return "";
  return n % 1 === 0 ? String(n) : String(n);
}

/** Number input that allows clearing the field while typing (avoids sticky zero). */
export function HoursInput({
  value,
  onChange,
  className,
  min = 0,
  step = 1,
  id,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (hours: number) => void;
  className?: string;
  min?: number;
  step?: number;
  id?: string;
  "aria-label"?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [draft, setDraft] = useState(() => formatHours(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(formatHours(value));
    }
  }, [value]);

  function parseDraft(): number {
    const trimmed = draft.trim();
    if (trimmed === "" || trimmed === "-") return 0;
    const n = parseFloat(trimmed);
    return Number.isFinite(n) ? n : 0;
  }

  function commit() {
    const n = parseDraft();
    setDraft(formatHours(n));
    if (n !== value) onChange(n);
  }

  return (
    <input
      id={inputId}
      type="number"
      min={min}
      step={step}
      aria-label={ariaLabel}
      className={cn(
        "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        className
      )}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        focusedRef.current = true;
        e.currentTarget.select();
      }}
      onBlur={() => {
        focusedRef.current = false;
        queueMicrotask(commit);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
