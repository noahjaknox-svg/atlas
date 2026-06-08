"use client";

import { useEffect, useState } from "react";

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
  const [draft, setDraft] = useState(() => formatHours(value));

  useEffect(() => {
    setDraft(formatHours(value));
  }, [value]);

  return (
    <input
      id={id}
      type="number"
      min={min}
      step={step}
      aria-label={ariaLabel}
      className={className}
      value={draft}
      onChange={(e) => {
        const raw = e.target.value;
        setDraft(raw);
        if (raw === "" || raw === "-") return;
        const n = parseFloat(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        const trimmed = draft.trim();
        if (trimmed === "" || trimmed === "-") {
          onChange(0);
          setDraft("0");
          return;
        }
        const n = parseFloat(trimmed);
        if (!Number.isFinite(n)) {
          onChange(0);
          setDraft("0");
          return;
        }
        onChange(n);
        setDraft(formatHours(n));
      }}
    />
  );
}
