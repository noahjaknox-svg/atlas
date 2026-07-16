"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CREW_SYNC_POLICY,
  type CrewSyncPolicy,
} from "@/lib/crew/performance-model";

export function CrewOrgPolicySection() {
  const [policy, setPolicy] = useState<CrewSyncPolicy>({ ...CREW_SYNC_POLICY });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/data/crew-policy")
      .then((r) => r.json())
      .then((json: { policy?: CrewSyncPolicy }) => {
        if (!active) return;
        if (json.policy) setPolicy(json.policy);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function savePolicy() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/data/crew-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Save failed");
        return;
      }
      setPolicy(json.policy);
      setMessage("Policy saved — Crew /sync will use these thresholds.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-atlas-muted">Loading policy…</p>;

  return (
    <section className="space-y-3">
      <div>
        <h3 className="mb-1 text-sm font-medium text-atlas-text">Crew org policy</h3>
        <p className="text-sm text-atlas-muted">
          Ops-tunable runway / alternate gates for Crew. Never use zero — blank fields are rejected.
          Changes ship on next <code className="text-atlas-accent">/sync</code>.
        </p>
      </div>
      <div className="grid gap-3 rounded-lg border border-atlas-border bg-atlas-surface/40 p-4 sm:grid-cols-2">
        {(Object.keys(CREW_SYNC_POLICY) as (keyof CrewSyncPolicy)[]).map((key) => (
          <div key={key}>
            <Label className="text-xs">{key}</Label>
            <Input
              type="number"
              className="mt-1 font-mono text-sm"
              value={String(policy[key])}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  [key]: Number(e.target.value),
                }))
              }
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={() => void savePolicy()} disabled={saving}>
          {saving ? "Saving…" : "Save policy"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPolicy({ ...CREW_SYNC_POLICY })}
        >
          Reset to defaults
        </Button>
        {message ? <span className="text-sm text-atlas-muted">{message}</span> : null}
      </div>
    </section>
  );
}
