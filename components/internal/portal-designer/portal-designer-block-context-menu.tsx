"use client";

import { useEffect, useRef, useState } from "react";
import type { ExperiencePageBlock } from "@/lib/experience-content";
import { isGridBlock, type BlockPath } from "@/lib/portal-block-layout";
import { DESIGNER_BLOCK_TYPES } from "./portal-designer-types";
import { cn } from "@/lib/utils";

export type BlockContextMenuState = {
  blockId: string;
  path: BlockPath;
  x: number;
  y: number;
  block: ExperiencePageBlock;
} | null;

const LEAF_BLOCK_TYPES = DESIGNER_BLOCK_TYPES.filter((item) => item.type !== "container");

export function PortalDesignerBlockContextMenu({
  menu,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onChangeType,
}: {
  menu: BlockContextMenuState;
  onClose: () => void;
  onEdit?: (blockId: string) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onChangeType: (blockId: string, newType: ExperiencePageBlock["type"]) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [changeTypeOpen, setChangeTypeOpen] = useState(false);

  useEffect(() => {
    if (!menu) {
      setChangeTypeOpen(false);
      return;
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const isLeaf = !isGridBlock(menu.block);

  return (
    <div
      ref={menuRef}
      className="fixed z-[70] min-w-[160px] rounded-md border border-atlas-border bg-atlas-surface py-1 shadow-xl"
      style={{ left: menu.x, top: menu.y }}
      role="menu"
    >
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-1.5 text-left text-xs text-atlas-text hover:bg-atlas-accent/10"
        onClick={() => {
          onEdit?.(menu.blockId);
          onClose();
        }}
      >
        Edit
      </button>
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-1.5 text-left text-xs text-atlas-text hover:bg-atlas-accent/10"
        onClick={() => {
          onDuplicate(menu.blockId);
          onClose();
        }}
      >
        Duplicate
      </button>
      {isLeaf ? (
        <div className="relative">
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center justify-between px-3 py-1.5 text-left text-xs text-atlas-text hover:bg-atlas-accent/10"
            onClick={() => setChangeTypeOpen((v) => !v)}
          >
            Change type
            <span className="text-atlas-muted">{changeTypeOpen ? "▾" : "▸"}</span>
          </button>
          {changeTypeOpen ? (
            <div className="border-t border-atlas-border py-1">
              {LEAF_BLOCK_TYPES.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  role="menuitem"
                  disabled={menu.block.type === item.type}
                  className={cn(
                    "block w-full px-4 py-1 text-left text-[11px] hover:bg-atlas-accent/10",
                    menu.block.type === item.type
                      ? "text-atlas-muted"
                      : "text-atlas-text"
                  )}
                  onClick={() => {
                    onChangeType(menu.blockId, item.type);
                    onClose();
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-1.5 text-left text-xs text-red-400 hover:bg-red-500/10"
        onClick={() => {
          onDelete(menu.blockId);
          onClose();
        }}
      >
        Delete
      </button>
    </div>
  );
}
