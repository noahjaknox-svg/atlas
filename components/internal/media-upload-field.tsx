"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MediaBrowserDialog } from "@/components/internal/media-browser-dialog";

export async function uploadMedia(file: File, proposalId?: string): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  if (proposalId) form.append("proposalId", proposalId);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.url as string;
}

function isVideo(url: string): boolean {
  return /\.(mp4|webm)(\?|$)/i.test(url);
}

/**
 * Drag-and-drop / click media upload with thumbnail preview.
 * Posts to /api/uploads and reports the stored URL back via onChange.
 */
export function MediaUploadField({
  label,
  value,
  onChange,
  proposalId,
  accept = "image/*,video/mp4,video/webm",
  className,
  hint,
  browseContent = false,
}: {
  label?: string;
  value: string | null;
  onChange: (url: string | null) => void;
  proposalId?: string;
  accept?: string;
  className?: string;
  hint?: string;
  browseContent?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browseOpen, setBrowseOpen] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const url = await uploadMedia(file, proposalId);
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={className}>
      {label ? (
        <p className="atlas-kicker mb-1.5">{label}</p>
      ) : null}
      {browseContent ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mb-2 w-full"
          onClick={() => setBrowseOpen(true)}
        >
          Browse Content
        </Button>
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
          const file = e.dataTransfer.files?.[0];
          if (file) void handleFile(file);
        }}
        className={cn(
          "group relative flex min-h-[7rem] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-atlas-border bg-atlas-bg/40 text-center transition-colors hover:border-atlas-accent/60",
          dragging && "border-atlas-accent bg-atlas-accent/5"
        )}
      >
        {value ? (
          <>
            {isVideo(value) ? (
              <video
                src={value}
                className="h-32 w-full object-cover"
                muted
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={value} alt="" className="h-32 w-full object-cover" />
            )}
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
              <span className="rounded bg-white/15 px-2 py-1 text-xs text-white">Replace</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
                className="rounded bg-red-500/80 px-2 py-1 text-xs text-white hover:bg-red-500"
              >
                Remove
              </button>
            </div>
          </>
        ) : (
          <div className="px-4 py-6">
            <p className="text-sm text-atlas-text">
              {uploading ? "Uploading…" : "Drop a file or click to upload"}
            </p>
            <p className="mt-1 text-xs text-atlas-muted">
              {hint ?? "JPG, PNG, WebP, SVG, MP4 or WebM (max 12MB)"}
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
      {browseContent ? (
        <MediaBrowserDialog
          open={browseOpen}
          onClose={() => setBrowseOpen(false)}
          onSelect={(url) => onChange(url)}
          selectedUrl={value}
          proposalId={proposalId}
        />
      ) : null}
    </div>
  );
}
