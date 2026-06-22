"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatFormattedNumber, parseFormattedNumber } from "@/lib/utils";

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder,
  id,
  name,
  required,
  currency = false,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  currency?: boolean;
  "aria-label"?: string;
}) {
  const [display, setDisplay] = useState(() => formatDisplayValue(value, currency));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(formatDisplayValue(value, currency));
    }
  }, [value, currency, focused]);

  function commit(raw: string) {
    const parsed = parseFormattedNumber(raw);
    onChange(parsed);
    setDisplay(parsed ? formatDisplayValue(parsed, currency) : "");
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      required={required}
      aria-label={ariaLabel}
      className={className}
      value={display}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        const parsed = parseFormattedNumber(display);
        setDisplay(parsed ? formatFormattedNumber(parsed) : "");
      }}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || /^-?\$?[\d,]*\.?\d*$/.test(raw)) {
          setDisplay(raw.replace(/^\$/, ""));
          onChange(parseFormattedNumber(raw));
        }
      }}
      onBlur={() => {
        setFocused(false);
        commit(display);
      }}
    />
  );
}

function formatDisplayValue(value: string, currency: boolean): string {
  const parsed = parseFormattedNumber(value);
  if (!parsed) return "";
  const n = parseFloat(parsed);
  if (!Number.isFinite(n)) return parsed;
  return currency ? formatCurrency(n) : formatFormattedNumber(parsed);
}

export function moneyInputClassName(hasOverride?: boolean) {
  return cn(
    "atlas-config-input",
    hasOverride ? "atlas-config-input-override" : "text-atlas-muted/90"
  );
}
