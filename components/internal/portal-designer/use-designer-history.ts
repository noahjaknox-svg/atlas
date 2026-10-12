"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

const MAX_HISTORY = 50;

export function useDesignerHistory<T>(initial: T) {
  const historyRef = useRef<T[]>([initial]);
  const indexRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((next: T, immediate = false) => {
    const doPush = () => {
      const current = historyRef.current[indexRef.current];
      if (JSON.stringify(current) === JSON.stringify(next)) return;

      const trimmed = historyRef.current.slice(0, indexRef.current + 1);
      trimmed.push(next);
      if (trimmed.length > MAX_HISTORY) {
        trimmed.shift();
      } else {
        indexRef.current += 1;
      }
      historyRef.current = trimmed;
      if (trimmed.length === MAX_HISTORY) {
        indexRef.current = trimmed.length - 1;
      }
    };

    if (immediate) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doPush();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(doPush, 300);
  }, []);

  const undo = useCallback((): T | null => {
    if (indexRef.current <= 0) return null;
    indexRef.current -= 1;
    return historyRef.current[indexRef.current] ?? null;
  }, []);

  const redo = useCallback((): T | null => {
    if (indexRef.current >= historyRef.current.length - 1) return null;
    indexRef.current += 1;
    return historyRef.current[indexRef.current] ?? null;
  }, []);

  const canUndo = useCallback(() => indexRef.current > 0, []);
  const canRedo = useCallback(
    () => indexRef.current < historyRef.current.length - 1,
    []
  );

  const reset = useCallback((value: T) => {
    historyRef.current = [value];
    indexRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Stable identity: consumers list this in effect deps, and a fresh object each render re-ran them.
  return useMemo(
    () => ({ push, undo, redo, canUndo, canRedo, reset }),
    [push, undo, redo, canUndo, canRedo, reset]
  );
}
