"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-md border border-atlas-border/60 bg-atlas-surface/30", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="atlas-kicker text-atlas-accent">
          {title}
        </span>
        <span className="text-sm text-atlas-muted">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-atlas-border/40 px-3 pb-3 pt-2">{children}</div>}
    </div>
  );
}
