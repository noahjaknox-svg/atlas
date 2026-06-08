"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

type Preview = {
  headers: string[];
  rows: string[][];
};

function parseCsvPreview(content: string, maxRows = 8): Preview {
  const lines: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
      continue;
    }
    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && content[i + 1] === "\n") i++;
      row.push(current.trim());
      if (row.some((c) => c.length > 0)) lines.push(row);
      row = [];
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.length || row.length) {
    row.push(current.trim());
    if (row.some((c) => c.length > 0)) lines.push(row);
  }

  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].slice(1).map((h) => h.trim());
  const rows = lines.slice(1, maxRows + 1).map((line) => line.slice(1));
  return { headers, rows };
}

export function CsvImportPanel({ onImported }: { onImported?: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [msg, setMsg] = useState("");
  const [importing, setImporting] = useState(false);

  const loadFile = useCallback((file: File) => {
    setFileName(file.name);
    setMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      setContent(text);
      setPreview(parseCsvPreview(text));
    };
    reader.readAsText(file);
  }, []);

  async function commitImport() {
    if (!content.trim()) {
      setMsg("Choose a CSV file first.");
      return;
    }
    setImporting(true);
    setMsg("Importing…");
    try {
      const res = await fetch("/api/data/import-aircraft-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent: content }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setMsg(json.message ?? "Import complete.");
        onImported?.();
      } else {
        setMsg(typeof json.error === "string" ? json.error : "Import failed.");
      }
    } catch {
      setMsg("Import failed — could not reach the server.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-2 border-t border-atlas-border pt-3">
      <p className="text-xs font-medium text-atlas-text">Upload CSV</p>
      <div
        className={`rounded-md border border-dashed px-3 py-4 text-center text-xs transition-colors ${
          dragOver
            ? "border-atlas-accent bg-atlas-accent/10"
            : "border-atlas-border text-atlas-muted"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) loadFile(file);
        }}
      >
        <label className="cursor-pointer">
          <span className="text-atlas-accent hover:underline">Choose file</span>
          <span> or drag CSV here</span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) loadFile(file);
            }}
          />
        </label>
        {fileName ? <p className="mt-1 truncate text-[10px]">{fileName}</p> : null}
      </div>

      {preview && preview.headers.length > 0 ? (
        <div className="max-h-32 overflow-auto rounded border border-atlas-border text-[10px]">
          <table className="w-full">
            <thead className="sticky top-0 bg-atlas-surface">
              <tr>
                <th className="px-1 py-0.5 text-left text-atlas-muted">Row</th>
                {preview.headers.slice(0, 4).map((h) => (
                  <th key={h} className="px-1 py-0.5 text-left text-atlas-muted">
                    {h || "—"}
                  </th>
                ))}
                {preview.headers.length > 4 ? (
                  <th className="px-1 py-0.5 text-atlas-muted">…</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row, i) => (
                <tr key={i} className="border-t border-atlas-border/50">
                  <td className="px-1 py-0.5 text-atlas-muted">{row[0] ?? ""}</td>
                  {row.slice(1, 5).map((cell, j) => (
                    <td key={j} className="max-w-[4rem] truncate px-1 py-0.5">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="border-t border-atlas-border px-2 py-1 text-atlas-muted">
            {preview.headers.length} aircraft columns detected
          </p>
        </div>
      ) : null}

      <Button
        type="button"
        variant="secondary"
        className="w-full text-xs"
        disabled={!content || importing}
        onClick={() => void commitImport()}
      >
        {importing ? "Importing…" : "Import uploaded CSV"}
      </Button>
      {msg ? (
        <p
          className={`text-xs ${
            msg.includes("failed") || msg.includes("Failed") ? "text-atlas-danger" : "text-atlas-muted"
          }`}
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
