"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FleetShowcaseItem, PortalContentData } from "@/lib/portal-content";
import {
  DEFAULT_LAYOUT_SETTINGS,
  type LayoutWidthPreset,
  type PortalLayoutSettings,
} from "@/lib/portal-layout-settings";

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
      setMessage("Saved — cloud video updates live on all prospect portals.");
    } else {
      setMessage(json.error ?? "Save failed");
    }
  }, [content, fleet]);

  function patchContent(patch: Partial<PortalContentData>) {
    setContent((c) => ({ ...c, ...patch }));
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
    <div className="space-y-8">
      <p className="max-w-2xl text-sm text-atlas-muted">
        Global portal assets and fleet showcase. Page content (About, Services, Contact, and
        chapter copy) is edited under <strong className="text-atlas-text">Pages &amp; blocks</strong>.
      </p>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Portal assets</h2>
        <p className="atlas-caption mt-1">
          Logo and cloud backgrounds for the PIN gate, portal shell, and experience pages.
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="atlas-section-title">Layout widths</h2>
            <p className="atlas-caption mt-1">
              Named width tiers as a percent of the page column or grid cell. Blocks pick a tier
              for desktop and mobile separately.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => patchContent({ layoutSettings: DEFAULT_LAYOUT_SETTINGS })}
          >
            Reset to defaults
          </Button>
        </div>
        <LayoutWidthsTable
          settings={content.layoutSettings ?? DEFAULT_LAYOUT_SETTINGS}
          onChange={(layoutSettings) => patchContent({ layoutSettings })}
        />
      </section>

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Fleet showcase</h2>
        <p className="atlas-caption mt-1">
          Shown on the aircraft portal page for prospects browsing your managed fleet.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label>Section title</Label>
            <Input
              value={content.fleetTitle}
              onChange={(e) => patchContent({ fleetTitle: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Section intro</Label>
            <textarea
              value={content.fleetBody ?? ""}
              onChange={(e) => patchContent({ fleetBody: e.target.value || null })}
              rows={3}
              className="atlas-input mt-1 w-full"
            />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          {fleet.map((item, i) => (
            <div key={item.id} className="space-y-2 rounded border border-atlas-border/60 p-3">
              <Input
                value={item.title}
                onChange={(e) => {
                  const next = [...fleet];
                  next[i] = { ...item, title: e.target.value };
                  setFleet(next);
                }}
                placeholder="Aircraft title"
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

      <div className="flex items-center gap-4">
        <Button type="button" onClick={() => void save()} disabled={saving || uploadingField !== null}>
          {saving ? "Saving…" : "Save portal content"}
        </Button>
        {message ? <span className="text-sm text-atlas-muted">{message}</span> : null}
      </div>
    </div>
  );
}

function LayoutWidthsTable({
  settings,
  onChange,
}: {
  settings: PortalLayoutSettings;
  onChange: (next: PortalLayoutSettings) => void;
}) {
  function patchPreset(index: number, patch: Partial<LayoutWidthPreset>) {
    const next = settings.widthPresets.map((p, i) => (i === index ? { ...p, ...patch } : p));
    onChange({ ...settings, widthPresets: next });
  }

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b border-atlas-border text-left text-xs text-atlas-muted">
            <th className="pb-2 pr-4 font-medium">Preset</th>
            <th className="pb-2 pr-4 font-medium">Desktop %</th>
            <th className="pb-2 font-medium">Mobile %</th>
          </tr>
        </thead>
        <tbody>
          {settings.widthPresets.map((preset, index) => (
            <tr key={preset.id} className="border-b border-atlas-border/40">
              <td className="py-2 pr-4 font-medium text-atlas-text">{preset.label}</td>
              <td className="py-2 pr-4">
                <Input
                  type="number"
                  min={25}
                  max={100}
                  value={preset.desktopPercent}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) patchPreset(index, { desktopPercent: n });
                  }}
                  className="h-8 w-20"
                />
              </td>
              <td className="py-2">
                <Input
                  type="number"
                  min={25}
                  max={100}
                  value={preset.mobilePercent}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) patchPreset(index, { mobilePercent: n });
                  }}
                  className="h-8 w-20"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
