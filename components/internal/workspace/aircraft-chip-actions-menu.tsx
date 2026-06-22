"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const MENU_WIDTH = 168;

export function AircraftChipActionsMenu({
  onDuplicate,
  onRefreshWarehouse,
  onRemove,
  className,
  triggerClassName,
}: {
  onDuplicate?: () => void;
  onRefreshWarehouse?: () => void;
  onRemove?: () => void;
  className?: string;
  triggerClassName?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.right - MENU_WIDTH),
        window.innerWidth - MENU_WIDTH - 8
      );
      setMenuPos({ top: rect.bottom + 6, left });
    }

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [menuOpen]);

  if (!onDuplicate && !onRefreshWarehouse && !onRemove) return null;

  const menu =
    menuOpen && mounted ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[200]"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="menu"
          className="fixed z-[201] min-w-[10.5rem] overflow-hidden rounded-md border border-atlas-border bg-atlas-surface py-1 text-xs shadow-2xl ring-1 ring-black/40"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
        >
          {onRefreshWarehouse ? (
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-2 text-left text-atlas-text transition-colors hover:bg-atlas-border/60"
              onClick={() => {
                setMenuOpen(false);
                onRefreshWarehouse();
              }}
            >
              Refresh warehouse data
            </button>
          ) : null}
          {onDuplicate ? (
            <>
              {onRefreshWarehouse ? (
                <div className="my-1 border-t border-atlas-border/70" aria-hidden />
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-atlas-text transition-colors hover:bg-atlas-border/60"
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                Duplicate
              </button>
            </>
          ) : null}
          {onRemove ? (
            <>
              {onDuplicate || onRefreshWarehouse ? (
                <div className="my-1 border-t border-atlas-border/70" aria-hidden />
              ) : null}
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-2 text-left text-red-400 transition-colors hover:bg-red-500/15 hover:text-red-300"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
              >
                Remove
              </button>
            </>
          ) : null}
        </div>
      </>
    ) : null;

  return (
    <>
      <div className={cn("relative shrink-0", className)}>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Aircraft actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            "rounded px-1.5 py-1 text-sm leading-none text-atlas-muted transition-colors hover:bg-atlas-border/50 hover:text-atlas-text",
            menuOpen && "bg-atlas-border/50 text-atlas-text opacity-100",
            triggerClassName
          )}
          data-open={menuOpen || undefined}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
        >
          ⋮
        </button>
      </div>
      {mounted && menuOpen && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
