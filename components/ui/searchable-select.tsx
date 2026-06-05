"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchableOption = { id: string; label: string };

export function SearchableSelect({
  label,
  placeholder,
  value,
  displayValue,
  options,
  loading,
  onSearch,
  onSelect,
  disabled,
  compact,
}: {
  label: string;
  placeholder: string;
  value: string;
  displayValue?: string;
  options: SearchableOption[];
  loading?: boolean;
  onSearch: (query: string) => void;
  onSelect: (option: SearchableOption | null) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(displayValue ?? "");
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(displayValue ?? "");
  }, [displayValue]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative space-y-1">
      <label className="atlas-kicker block">{label}</label>
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          if (!query) onSearch("");
        }}
        className={cn(
          "atlas-input",
          compact && "h-9"
        )}
      />
      {open && (options.length > 0 || loading) && (
        <ul className="atlas-scroll absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-lg">
          {loading && <li className="px-3 py-2 text-xs text-atlas-muted">Searching…</li>}
          {options.map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                className={cn(
                  "w-full px-3 py-2 text-left text-sm hover:bg-atlas-accent/10",
                  value === opt.id && "bg-atlas-accent/15 text-atlas-accent"
                )}
                onClick={() => {
                  onSelect(opt);
                  setQuery(opt.label);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
