"use client";

import { createContext, useContext, type ReactNode } from "react";

/** static = hold final visible state; enter = play one-time entrance stagger */
export type ChapterStaggerMode = "static" | "enter";

const ChapterStaggerContext = createContext<ChapterStaggerMode>("static");

export function ChapterStaggerProvider({
  mode,
  children,
}: {
  mode: ChapterStaggerMode;
  children: ReactNode;
}) {
  return (
    <ChapterStaggerContext.Provider value={mode}>{children}</ChapterStaggerContext.Provider>
  );
}

export function useChapterStaggerMode(): ChapterStaggerMode {
  return useContext(ChapterStaggerContext);
}

/** @deprecated Use useChapterStaggerMode */
export function useChapterStaggerReady(): boolean {
  return useChapterStaggerMode() === "enter";
}
