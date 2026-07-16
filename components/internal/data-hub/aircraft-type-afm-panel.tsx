"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CrewPerformanceModel } from "@/lib/crew/performance-model";

type PerfRow = {
  id: string;
  aircraftTypeCode: string;
  metric: string;
  source: string | null;
  gridSize: string;
  updatedAt: string;
};

type TypeMeta = {
  id: string;
  code: string;
  afmStatus?: "complete" | "partial" | "missing";
  derivedAfmNotes?: string | null;
  afmNotes?: string | null;
  performanceModel?: CrewPerformanceModel | null;
  afmPdfUrl?: string | null;
  afmPdfFileName?: string | null;
  afmPdfCategory?: string | null;
  afmPdfRevision?: string | null;
  afmPdfEffectiveDate?: string | null;
  afmPdfUploadedAt?: string | null;
};

function afmBadgeClass(status?: string) {
  if (status === "complete") return "bg-emerald-500/15 text-emerald-700";
  if (status === "partial") return "bg-amber-500/15 text-amber-800";
  return "bg-atlas-muted/20 text-atlas-muted";
}

export function AircraftTypeAfmPanel({
  aircraftTypeId,
  onUpdated,
}: {
  aircraftTypeId: string;
  onUpdated?: () => void;
}) {
  const [meta, setMeta] = useState<TypeMeta | null>(null);
  const [perf, setPerf] = useState<PerfRow[]>([]);
  const [afmJson, setAfmJson] = useState("");
  const [afmSource, setAfmSource] = useState("");
  const [afmNotes, setAfmNotes] = useState("");
  const [afmMsg, setAfmMsg] = useState("");
  const [pdfMsg, setPdfMsg] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfRevision, setPdfRevision] = useState("");
  const [pdfEffectiveDate, setPdfEffectiveDate] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, p] = await Promise.all([
        fetch("/api/data/crew-types").then((r) => r.json()),
        fetch("/api/data/crew-performance").then((r) => r.json()),
      ]);
      const rows = (t.rows ?? []) as TypeMeta[];
      const found = rows.find((r) => r.id === aircraftTypeId) ?? null;
      setMeta(found);
      if (found?.afmNotes) setAfmNotes(found.afmNotes);
      setPdfRevision(found?.afmPdfRevision ?? "");
      setPdfEffectiveDate(found?.afmPdfEffectiveDate ?? "");
      const code = found?.code;
      const allPerf = (p.rows ?? []) as PerfRow[];
      setPerf(code ? allPerf.filter((row) => row.aircraftTypeCode === code) : []);
    } finally {
      setLoading(false);
    }
  }, [aircraftTypeId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadPdf() {
    setPdfMsg("");
    if (!pdfFile) {
      setPdfMsg("Choose a PDF file first.");
      return;
    }
    setPdfBusy(true);
    try {
      const form = new FormData();
      form.set("aircraftTypeId", aircraftTypeId);
      form.set("file", pdfFile);
      form.set("category", "afm_poh");
      if (pdfRevision.trim()) form.set("revision", pdfRevision.trim());
      if (pdfEffectiveDate.trim()) form.set("effectiveDate", pdfEffectiveDate.trim());

      const res = await fetch("/api/data/crew-afm-pdf", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setPdfMsg(json.error ?? "PDF upload failed");
        return;
      }
      setPdfMsg("PDF saved.");
      setPdfFile(null);
      void load();
      onUpdated?.();
    } finally {
      setPdfBusy(false);
    }
  }

  async function removePdf() {
    if (!confirm("Remove the active AFM PDF from this type?")) return;
    setPdfBusy(true);
    setPdfMsg("");
    try {
      const res = await fetch("/api/data/crew-afm-pdf", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aircraftTypeId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPdfMsg(json.error ?? "Remove failed");
        return;
      }
      setPdfMsg("PDF removed.");
      setPdfRevision("");
      setPdfEffectiveDate("");
      void load();
      onUpdated?.();
    } finally {
      setPdfBusy(false);
    }
  }

  async function uploadAfmPackage() {
    setAfmMsg("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(afmJson);
    } catch {
      setAfmMsg("Invalid JSON");
      return;
    }

    const body =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? {
            ...(parsed as Record<string, unknown>),
            aircraftTypeId,
            ...(afmNotes.trim() ? { afmNotes: afmNotes.trim() } : {}),
          }
        : Array.isArray(parsed)
          ? {
              aircraftTypeId,
              performance: (parsed as unknown[]).map((row) => {
                if (row && typeof row === "object" && afmSource.trim()) {
                  return { ...(row as object), source: afmSource.trim() };
                }
                return row;
              }),
              ...(afmNotes.trim() ? { afmNotes: afmNotes.trim() } : {}),
            }
          : null;

    if (!body) {
      setAfmMsg("JSON must be an AFM package object or performance[] array");
      return;
    }

    const packageBody = body as Record<string, unknown>;
    if (Array.isArray(packageBody.performance) && afmSource.trim()) {
      packageBody.performance = packageBody.performance.map((row: unknown) => {
        if (!row || typeof row !== "object") return row;
        const r = row as Record<string, unknown>;
        return r.source ? r : { ...r, source: afmSource.trim() };
      });
    }

    const res = await fetch("/api/data/crew-performance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(packageBody),
    });
    const json = await res.json();
    if (!res.ok) {
      setAfmMsg(json.error ?? "AFM upload failed");
      return;
    }
    setAfmMsg(
      `Uploaded: ${json.gridsUpserted ?? 0} grid(s)` +
        (json.performanceModelUpdated ? ", performanceModel updated" : "")
    );
    setAfmJson("");
    void load();
    onUpdated?.();
  }

  if (loading && !meta) {
    return <p className="text-sm text-atlas-muted">Loading AFM…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${afmBadgeClass(meta?.afmStatus)}`}
        >
          Grids {meta?.afmStatus ?? "missing"}
        </span>
        {meta?.derivedAfmNotes || meta?.afmNotes ? (
          <p className="text-sm text-atlas-muted">{meta.derivedAfmNotes ?? meta.afmNotes}</p>
        ) : null}
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-atlas-muted">
            AFM document (PDF)
          </h3>
          <p className="mt-1 text-sm text-atlas-muted">
            Human source of truth (category <code className="text-atlas-accent">afm_poh</code>).
            Uploading a PDF does not mark grids complete — Crew still needs transcribed performance
            JSON below.
          </p>
        </div>

        {meta?.afmPdfUrl ? (
          <div className="rounded-lg border border-atlas-border bg-atlas-surface/40 px-4 py-3 text-sm">
            <p className="font-medium text-atlas-text">
              Active:{" "}
              <a
                href={meta.afmPdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-atlas-accent hover:underline"
              >
                {meta.afmPdfFileName ?? "Open PDF"}
              </a>
            </p>
            <p className="mt-1 text-xs text-atlas-muted">
              {[
                meta.afmPdfCategory ?? "afm_poh",
                meta.afmPdfRevision ? `rev ${meta.afmPdfRevision}` : null,
                meta.afmPdfEffectiveDate ? `effective ${meta.afmPdfEffectiveDate}` : null,
                meta.afmPdfUploadedAt
                  ? `uploaded ${new Date(meta.afmPdfUploadedAt).toLocaleDateString()}`
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-atlas-muted">No AFM PDF on file for this type.</p>
        )}

        <div className="space-y-3 rounded-lg border border-atlas-border bg-atlas-surface/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="afm-pdf-file">PDF file</Label>
              <Input
                id="afm-pdf-file"
                type="file"
                accept="application/pdf,.pdf"
                className="mt-1"
                onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div>
              <Label htmlFor="afm-pdf-revision">Revision</Label>
              <Input
                id="afm-pdf-revision"
                className="mt-1"
                value={pdfRevision}
                onChange={(e) => setPdfRevision(e.target.value)}
                placeholder="e.g. Rev 12 / 2024-06"
              />
            </div>
            <div>
              <Label htmlFor="afm-pdf-effective">Effective date</Label>
              <Input
                id="afm-pdf-effective"
                type="date"
                className="mt-1"
                value={pdfEffectiveDate}
                onChange={(e) => setPdfEffectiveDate(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void uploadPdf()} disabled={pdfBusy || !pdfFile}>
              {pdfBusy ? "Saving…" : meta?.afmPdfUrl ? "Replace PDF" : "Upload PDF"}
            </Button>
            {meta?.afmPdfUrl ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void removePdf()}
                disabled={pdfBusy}
              >
                Remove PDF
              </Button>
            ) : null}
          </div>
          {pdfMsg ? <p className="text-sm text-atlas-muted">{pdfMsg}</p> : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-atlas-muted">
            Performance grids (machine)
          </h3>
          <p className="mt-1 text-sm text-atlas-muted">
            Transcribe takeoff/landing grids for Crew{" "}
            <code className="text-atlas-accent">/sync</code>. Same shape as{" "}
            <code className="text-atlas-accent">performance[]</code>, optionally with{" "}
            <code className="text-atlas-accent">performanceModel</code>. Metrics:{" "}
            <code className="text-atlas-accent">takeoff_field_length</code>,{" "}
            <code className="text-atlas-accent">landing_distance</code>. Source citation required.
          </p>
        </div>

        <div className="space-y-3 rounded-lg border border-atlas-border bg-atlas-surface/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label>Default source citation</Label>
              <Input
                className="mt-1"
                value={afmSource}
                onChange={(e) => setAfmSource(e.target.value)}
                placeholder="e.g. CL35 AFM §5 Normal Takeoff"
              />
            </div>
            <div>
              <Label>AFM notes (optional)</Label>
              <Input
                className="mt-1"
                value={afmNotes}
                onChange={(e) => setAfmNotes(e.target.value)}
                placeholder="e.g. landing stand-in; takeoff POH OK"
              />
            </div>
          </div>
          <div>
            <Label>JSON package or performance[] array</Label>
            <textarea
              className="mt-1 h-40 w-full rounded border border-atlas-border bg-atlas-bg px-3 py-2 font-mono text-xs"
              value={afmJson}
              onChange={(e) => setAfmJson(e.target.value)}
              placeholder={`{\n  "performanceModel": { … },\n  "performance": [{ "metric": "takeoff_field_length", … }]\n}`}
            />
          </div>
          <Button type="button" onClick={() => void uploadAfmPackage()}>
            Upload / replace grids
          </Button>
          {afmMsg ? <p className="text-sm text-atlas-muted">{afmMsg}</p> : null}
        </div>

        <div className="atlas-scroll overflow-x-auto rounded-lg border border-atlas-border">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="border-b border-atlas-border bg-atlas-surface/50 text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Metric</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Grid</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {perf.map((row) => (
                <tr key={row.id} className="border-b border-atlas-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{row.metric}</td>
                  <td className="px-3 py-2 text-xs text-atlas-muted">{row.source ?? "—"}</td>
                  <td className="px-3 py-2">{row.gridSize}</td>
                  <td className="px-3 py-2 text-atlas-muted">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {perf.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-atlas-muted">
                    No grids for this type yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
