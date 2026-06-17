"use client";

import { useRef } from "react";
import { format, parseISO } from "date-fns";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export function CharterDateField({
  value,
  onChange,
  disabled,
  required,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const input = inputRef.current;
    if (!input || disabled) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.click();
    }
  }

  const label = value
    ? format(parseISO(value), "MMM d, yyyy")
    : "Select date";

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={openPicker}
        className={cn(
          "atlas-input flex h-9 min-w-[9.5rem] items-center gap-2 px-3 text-left text-sm",
          disabled && "cursor-not-allowed opacity-50",
          !value && "text-atlas-muted"
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-atlas-muted" />
        <span>{label}</span>
      </button>
      <input
        ref={inputRef}
        type="date"
        value={value}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
    </div>
  );
}
