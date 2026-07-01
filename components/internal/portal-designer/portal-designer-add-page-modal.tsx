"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizePageSlug,
  slugifyPageTitle,
  validatePageSlug,
} from "@/lib/experience-page-slug";

export function PortalDesignerAddPageModal({
  open,
  onClose,
  onCreate,
  creating,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: { title: string; pageSlug: string }) => Promise<void>;
  creating?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const previewSlug = normalizePageSlug(slug || slugifyPageTitle(title));
  const slugError = previewSlug ? validatePageSlug(previewSlug) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Enter a page title");
      return;
    }
    if (slugError) {
      setError(slugError);
      return;
    }
    setError(null);
    try {
      await onCreate({ title: title.trim(), pageSlug: previewSlug });
      setTitle("");
      setSlug("");
      setSlugTouched(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create page");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="w-full max-w-md rounded-lg border border-atlas-border bg-atlas-surface p-5 shadow-xl"
      >
        <h2 className="font-serif text-lg text-atlas-text">Add custom page</h2>
        <p className="mt-1 text-xs text-atlas-muted">
          Custom pages appear in portal navigation with their own URL slug.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-xs">Page title</Label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugifyPageTitle(e.target.value));
              }}
              className="mt-1 h-9 text-sm"
              autoFocus
            />
          </div>
          <div>
            <Label className="text-xs">URL slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              className="mt-1 h-9 font-mono text-sm"
              placeholder="my-custom-page"
            />
            <p className="mt-1 text-[10px] text-atlas-muted">
              Preview: /experience/{previewSlug || "…"}
            </p>
            {slugError ? <p className="mt-1 text-[10px] text-red-400">{slugError}</p> : null}
          </div>
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={creating}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={creating || !!slugError || !title.trim()}>
            {creating ? "Creating…" : "Add page"}
          </Button>
        </div>
      </form>
    </div>
  );
}
