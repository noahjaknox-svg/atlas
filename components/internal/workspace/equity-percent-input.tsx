"use client";

import { useEffect, useState } from "react";
import {
  formatEquityPercentDisplay,
  parseEquityPercentInput,
} from "@/lib/proposal-owners";

export function EquityPercentInput({
  value,
  onChange,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  "aria-label": string;
}) {
  const [draft, setDraft] = useState(() => formatEquityPercentDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(formatEquityPercentDisplay(value));
    }
  }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className="atlas-input atlas-input-mono w-full text-right"
      value={draft}
      aria-label={ariaLabel}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw !== "" && !/^\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        const parsed = parseEquityPercentInput(raw);
        if (parsed != null) onChange(parsed);
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = parseEquityPercentInput(draft);
        if (parsed != null) {
          onChange(parsed);
          setDraft(formatEquityPercentDisplay(parsed));
          return;
        }
        setDraft(formatEquityPercentDisplay(value));
      }}
    />
  );
}
