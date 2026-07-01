"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MediaLibraryItem } from "@/lib/media-library";
import { uploadMedia } from "@/components/internal/media-upload-field";
import { cn } from "@/lib/utils";

export function MediaBrowserDialog({
  open,
  onClose,
  onSelect,
  selectedUrl,
  proposalId,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
  selectedUrl?: string | null;
  proposalId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/media?imagesOnly=1");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load media library");
      setItems(json.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load media library");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadItems();
  }, [open, loadItems]);

  if (!open) return null;

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMedia(file, proposalId);
      await loadItems();
      onSelect(url);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[min(85vh,720px)] w-full max-w-3xl flex-col rounded-lg border border-atlas-border bg-atlas-surface shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-atlas-border px-4 py-3">
          <div>
            <p className="text-sm font-medium text-atlas-text">Browse Content</p>
            <p className="text-xs text-atlas-muted">Select a stock photo or uploaded image.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-atlas-muted">Loading library…</p>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-atlas-muted">No images yet. Upload one to get started.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.url}
                  type="button"
                  onClick={() => {
                    onSelect(item.url);
                    onClose();
                  }}
                  className={cn(
                    "group overflow-hidden rounded-lg border bg-atlas-bg/40 text-left transition-colors hover:border-atlas-accent/60",
                    selectedUrl === item.url
                      ? "border-atlas-accent ring-1 ring-atlas-accent/40"
                      : "border-atlas-border"
                  )}
                >
                  <div className="relative aspect-[4/3] bg-black/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.label}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <span
                      className={cn(
                        "absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                        item.source === "stock"
                          ? "bg-atlas-accent/90 text-atlas-bg"
                          : "bg-black/60 text-white/90"
                      )}
                    >
                      {item.source === "stock" ? "Stock" : "Upload"}
                    </span>
                  </div>
                  <p className="truncate px-2 py-1.5 text-[11px] text-atlas-muted">{item.label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
