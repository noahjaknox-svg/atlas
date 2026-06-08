"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatFormattedNumber, parseFormattedNumber } from "@/lib/utils";

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder,
  id,
  name,
  required,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  id?: string;
  name?: string;
  required?: boolean;
  "aria-label"?: string;
}) {
  const [display, setDisplay] = useState(() => formatFormattedNumber(value));

  useEffect(() => {
    setDisplay(formatFormattedNumber(value));
  }, [value]);

  function commit(raw: string) {
    const parsed = parseFormattedNumber(raw);
    onChange(parsed);
    setDisplay(parsed ? formatFormattedNumber(parsed) : "");
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
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === "" || /^-?[\d,]*\.?\d*$/.test(raw)) {
          setDisplay(raw);
          onChange(parseFormattedNumber(raw));
        }
      }}
      onBlur={() => commit(display)}
    />
  );
}

export function moneyInputClassName(hasOverride?: boolean) {
  return cn(
    "atlas-config-input",
    hasOverride
      ? "atlas-config-input-override"
      : "text-atlas-muted/80 placeholder:italic placeholder:text-atlas-muted/60"
  );
}
