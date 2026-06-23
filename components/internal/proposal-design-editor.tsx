"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FleetShowcaseItem, PortalContentData, ServicePillar } from "@/lib/portal-content";

async function uploadFile(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Upload failed");
  return json.url as string;
}

export function ProposalDesignEditor({
  initialContent,
  initialFleet,
}: {
  initialContent: PortalContentData;
  initialFleet: FleetShowcaseItem[];
}) {
  const [content, setContent] = useState(initialContent);
  const [fleet, setFleet] = useState(initialFleet);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [uploadingField, setUploadingField] = useState<
    "heroCloudImageUrl" | "heroCloudVideoUrl" | "logoUrl" | null
  >(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const save = useCallback(async () => {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/portal-content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, fleet }),
    });
    const json = await res.json();
    setSaving(false);
    if (res.ok) {
      setContent(json.content);
      setFleet(json.fleet);
      setMessage("Saved — cloud video updates live on all client portals.");
    } else {
      setMessage(json.error ?? "Save failed");
    }
  }, [content, fleet]);

  function patchContent(patch: Partial<PortalContentData>) {
    setContent((c) => ({ ...c, ...patch }));
  }

  function patchPillar(index: number, patch: Partial<ServicePillar>) {
    setContent((c) => {
      const pillars = [...c.servicesPillars];
      pillars[index] = { ...pillars[index], ...patch };
      return { ...c, servicesPillars: pillars };
    });
  }

  async function handleUpload(
    field: "heroCloudImageUrl" | "heroCloudVideoUrl" | "logoUrl",
    file: File
  ) {
    setUploadingField(field);
    setUploadError(null);
    setMessage("");
    try {
      const url = await uploadFile(file);
      patchContent({ [field]: url });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingField(null);
    }
  }

  return (
    <div className="mt-8 space-y-10">
      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Branding & clouds</h2>
        <p className="atlas-caption mt-1">
          Experience pages, aircraft portal, PIN gate, and global portal pages use these assets.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Cloud image URL"
            value={content.heroCloudImageUrl}
            onChange={(v) => patchContent({ heroCloudImageUrl: v })}
            onUpload={(f) => void handleUpload("heroCloudImageUrl", f)}
            uploading={uploadingField === "heroCloudImageUrl"}
            error={uploadingField === "heroCloudImageUrl" ? uploadError : null}
          />
          <Field
            label="Cloud video URL (optional)"
            value={content.heroCloudVideoUrl ?? ""}
            onChange={(v) => patchContent({ heroCloudVideoUrl: v || null })}
            onUpload={(f) => void handleUpload("heroCloudVideoUrl", f)}
            uploading={uploadingField === "heroCloudVideoUrl"}
            error={uploadingField === "heroCloudVideoUrl" ? uploadError : null}
          />
          <Field
            label="Logo URL"
            value={content.logoUrl}
            onChange={(v) => patchContent({ logoUrl: v })}
            onUpload={(f) => void handleUpload("logoUrl", f)}
            uploading={uploadingField === "logoUrl"}
            error={uploadingField === "logoUrl" ? uploadError : null}
          />
        </div>
        {uploadError && !uploadingField ? (
          <p className="mt-3 text-sm text-red-400">{uploadError}</p>
        ) : null}
      </section>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">About</h2>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Title</Label>
            <Input
              value={content.aboutTitle}
              onChange={(e) => patchContent({ aboutTitle: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Body</Label>
            <textarea
              value={content.aboutBody}
              onChange={(e) => patchContent({ aboutBody: e.target.value })}
              rows={6}
              className="atlas-input mt-1 min-h-[8rem]"
            />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Services (5 pillars)</h2>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Page title</Label>
            <Input
              value={content.servicesTitle}
              onChange={(e) => patchContent({ servicesTitle: e.target.value })}
              className="mt-1"
            />
          </div>
          {content.servicesPillars.map((p, i) => (
            <div key={i} className="rounded border border-atlas-border/60 p-3 space-y-2">
              <Input
                value={p.title}
                onChange={(e) => patchPillar(i, { title: e.target.value })}
                placeholder="Pillar title"
              />
              <textarea
                value={p.description}
                onChange={(e) => patchPillar(i, { description: e.target.value })}
                rows={2}
                className="atlas-input w-full"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Fleet showcase</h2>
        <div className="mt-4 space-y-4">
          {fleet.map((item, i) => (
            <div key={item.id} className="rounded border border-atlas-border/60 p-3 space-y-2">
              <Input
                value={item.title}
                onChange={(e) => {
                  const next = [...fleet];
                  next[i] = { ...item, title: e.target.value };
                  setFleet(next);
                }}
              />
              <Input
                value={item.imageUrl ?? ""}
                onChange={(e) => {
                  const next = [...fleet];
                  next[i] = { ...item, imageUrl: e.target.value };
                  setFleet(next);
                }}
                placeholder="Image URL"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              setFleet((f) => [
                ...f,
                {
                  id: `new-${Date.now()}`,
                  sortOrder: f.length,
                  title: "New aircraft",
                  subtitle: null,
                  imageUrl: "/images/fleet-jet-placeholder.svg",
                  videoUrl: null,
                  posterUrl: null,
                  specs: [],
                  active: true,
                },
              ])
            }
          >
            Add fleet card
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Contact</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input
              value={content.contactTitle}
              onChange={(e) => patchContent({ contactTitle: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={content.contactEmail}
              onChange={(e) => patchContent({ contactEmail: e.target.value })}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Body</Label>
            <textarea
              value={content.contactBody ?? ""}
              onChange={(e) => patchContent({ contactBody: e.target.value })}
              rows={3}
              className="atlas-input mt-1 w-full"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-4">
        <Button type="button" onClick={() => void save()} disabled={saving || uploadingField !== null}>
          {saving ? "Saving…" : "Save portal content"}
        </Button>
        {message ? <span className="text-sm text-atlas-muted">{message}</span> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  onUpload,
  uploading = false,
  error = null,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (f: File) => void;
  uploading?: boolean;
  error?: string | null;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      <input
        type="file"
        accept="image/*,video/mp4,video/webm"
        disabled={uploading}
        className="mt-2 block text-xs text-atlas-muted disabled:opacity-50"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
      {uploading ? <p className="mt-1 text-xs text-atlas-muted">Uploading…</p> : null}
      {error ? <p className="mt-1 text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
