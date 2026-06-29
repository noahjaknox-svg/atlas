"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import { blockLabel, findBlockById } from "@/lib/portal-block-layout";
import type { BlockDiagnostic } from "@/lib/portal-block-diagnostics";
import { cn } from "@/lib/utils";
import type { BlockSelection } from "./portal-designer-block-tree";

const MENU_WIDTH = 300;

export function PortalDesignerWarningsMenu({
  diagnostics,
  blocks,
  onSelectBlock,
  className,
}: {
  diagnostics: BlockDiagnostic[];
  blocks: ExperiencePageBlock[];
  onSelectBlock: (selection: BlockSelection) => void;
  className?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;

    function updatePosition() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, rect.left),
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

  if (diagnostics.length === 0) return null;

  const menu =
    menuOpen && mounted ? (
      <>
        <button
          type="button"
          className="fixed inset-0 z-[200]"
          aria-label="Close warnings menu"
          onClick={() => setMenuOpen(false)}
        />
        <div
          role="menu"
          aria-label="Content warnings"
          className="fixed z-[201] overflow-hidden rounded-md border border-amber-500/30 bg-atlas-surface shadow-2xl ring-1 ring-black/40"
          style={{ top: menuPos.top, left: menuPos.left, width: MENU_WIDTH }}
        >
          <div className="border-b border-atlas-border/60 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-atlas-muted">
              Content warnings
            </p>
            <p className="mt-0.5 text-[10px] text-atlas-muted">
              Click a warning to select the block on the canvas.
            </p>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {diagnostics.map((diagnostic, index) => {
              const located = findBlockById(blocks, diagnostic.blockId);
              const blockTypeLabel = located ? blockLabel(located.block) : "Block";

              return (
                <li key={`${diagnostic.blockId}-${diagnostic.kind}-${index}`}>
                  <button
                    type="button"
                    role="menuitem"
                    className="block w-full px-3 py-2 text-left transition-colors hover:bg-amber-500/10 focus-visible:bg-amber-500/10 focus-visible:outline-none"
                    onClick={() => {
                      if (located) {
                        onSelectBlock({
                          blockId: diagnostic.blockId,
                          path: located.path,
                        });
                      }
                      setMenuOpen(false);
                    }}
                  >
                    <span className="block text-xs text-amber-200">{diagnostic.message}</span>
                    <span className="mt-0.5 block text-[10px] text-atlas-muted">
                      {blockTypeLabel}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </>
    ) : null;

  return (
    <>
      <div className={cn("relative shrink-0", className)}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${diagnostics.length} content warning${diagnostics.length === 1 ? "" : "s"} on this page. Review warnings.`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            "rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40",
            menuOpen && "bg-amber-500/20"
          )}
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen((open) => !open);
          }}
        >
          {diagnostics.length} warning{diagnostics.length === 1 ? "" : "s"}
        </button>
      </div>
      {mounted && menuOpen && menu ? createPortal(menu, document.body) : null}
    </>
  );
}
