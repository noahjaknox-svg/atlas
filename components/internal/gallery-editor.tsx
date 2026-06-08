"use client";

import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { uploadMedia } from "@/components/internal/media-upload-field";
import type { ExperienceGalleryItem } from "@/lib/experience-content";
import { cn } from "@/lib/utils";

function isVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

/** Multi-photo gallery editor: upload, caption, reorder, remove. */
export function GalleryEditor({
  items,
  onChange,
  proposalId,
  label = "Photo gallery",
}: {
  items: ExperienceGalleryItem[];
  onChange: (next: ExperienceGalleryItem[]) => void;
  proposalId?: string;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: FileList | File[]) {
    setUploading(true);
    setError(null);
    try {
      const added: ExperienceGalleryItem[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadMedia(file, proposalId);
        added.push({ url });
      }
      onChange([...items, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function update(index: number, patch: Partial<ExperienceGalleryItem>) {
    const next = [...items];
    next[index] = { ...next[index]!, ...patch };
    onChange(next);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  }

  return (
    <div>
      <p className="atlas-kicker mb-1.5">{label}</p>

      {items.length > 0 ? (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((item, index) => (
            <div
              key={`${item.url}-${index}`}
              className="overflow-hidden rounded-lg border border-atlas-border bg-atlas-bg/40"
            >
              <div className="relative h-24 w-full bg-black/30">
                {isVideo(item.url) ? (
                  <video src={item.url} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                )}
                <div className="absolute right-1 top-1 flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white disabled:opacity-30"
                    aria-label="Move left"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === items.length - 1}
                    className="rounded bg-black/60 px-1.5 py-0.5 text-xs text-white disabled:opacity-30"
                    aria-label="Move right"
                  >
                    →
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="rounded bg-red-500/80 px-1.5 py-0.5 text-xs text-white hover:bg-red-500"
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <Input
                value={item.caption ?? ""}
                onChange={(e) => update(index, { caption: e.target.value || undefined })}
                className="h-8 rounded-none border-0 border-t border-atlas-border text-xs"
                placeholder="Caption (optional)"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex min-h-[4rem] cursor-pointer items-center justify-center rounded-lg border border-dashed border-atlas-border bg-atlas-bg/40 px-4 py-4 text-center text-sm text-atlas-muted transition-colors hover:border-atlas-accent/60",
          dragging && "border-atlas-accent bg-atlas-accent/5"
        )}
      >
        {uploading ? "Uploading…" : "Drop photos or click to add to the gallery"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/mp4,video/webm"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
