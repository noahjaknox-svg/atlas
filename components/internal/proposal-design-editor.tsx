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
      setMessage("Saved");
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
    const url = await uploadFile(file);
    patchContent({ [field]: url });
  }

  return (
    <div className="mt-8 space-y-10">
      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="atlas-section-title">Branding & clouds</h2>
        <p className="atlas-caption mt-1">
          PIN gate, deck cover, and global portal pages use these assets.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field
            label="Cloud image URL"
            value={content.heroCloudImageUrl}
            onChange={(v) => patchContent({ heroCloudImageUrl: v })}
            onUpload={(f) => void handleUpload("heroCloudImageUrl", f)}
          />
          <Field
            label="Cloud video URL (optional)"
            value={content.heroCloudVideoUrl ?? ""}
            onChange={(v) => patchContent({ heroCloudVideoUrl: v || null })}
            onUpload={(f) => void handleUpload("heroCloudVideoUrl", f)}
          />
          <Field
            label="Logo URL"
            value={content.logoUrl}
            onChange={(v) => patchContent({ logoUrl: v })}
            onUpload={(f) => void handleUpload("logoUrl", f)}
          />
        </div>
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
        <Button type="button" onClick={() => void save()} disabled={saving}>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onUpload: (f: File) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      <input
        type="file"
        accept="image/*,video/mp4,video/webm"
        className="mt-2 block text-xs text-atlas-muted"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
        }}
      />
    </div>
  );
}
