"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_VISIBLE_FIELDS,
  type EmptyLegVisibleFields,
} from "@/lib/charter/empty-legs/defaults";

type PublicList = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  token: string;
  tokenRevokedAt: string | null;
  defaultPlacementStatus: string;
  layoutStyle: string;
  defaultPricingMode: string;
  discountPercent: number | null;
  discountDisplayMode: string;
  minimumQuotableHours: number | null;
  recipientEmailOverride: string | null;
  consentTextOverride: string | null;
  disclaimerOverride: string | null;
  visibleFieldsJson: Partial<EmptyLegVisibleFields> | Record<string, unknown>;
  placementCount?: number;
  leadCount?: number;
};

const VISIBLE_FIELD_KEYS = Object.keys(DEFAULT_VISIBLE_FIELDS) as (keyof EmptyLegVisibleFields)[];

function embedCode(token: string): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `<iframe id="atlas-empty-legs" src="${origin}/embed/empty-legs/${token}" style="width:100%;border:0;min-height:480px;" title="Empty Legs"></iframe>
<script>
(function(){
  var iframe=document.getElementById("atlas-empty-legs");
  window.addEventListener("message",function(e){
    if(!e.data||e.data.type!=="atlas-empty-legs-resize")return;
    if(e.data.token&&e.data.token!=="${token}")return;
    if(iframe&&e.data.height)iframe.style.height=e.data.height+"px";
  });
})();
</script>`;
}

export function PublicListsAdmin() {
  const [lists, setLists] = useState<PublicList[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PublicList> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/charter/empty-legs/public-lists");
    const json = await res.json();
    setLoading(false);
    if (res.ok) setLists(json);
    else setMessage(json.error ?? "Failed to load");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createList() {
    if (!newName.trim()) return;
    setMessage("");
    const res = await fetch("/api/charter/empty-legs/public-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Create failed");
      return;
    }
    setNewName("");
    await load();
  }

  function startEdit(list: PublicList) {
    setEditingId(list.id);
    setDraft({ ...list });
  }

  async function saveEdit() {
    if (!editingId || !draft) return;
    setMessage("");
    const res = await fetch(`/api/charter/empty-legs/public-lists/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isActive: draft.isActive,
        defaultPlacementStatus: draft.defaultPlacementStatus,
        layoutStyle: draft.layoutStyle,
        defaultPricingMode: draft.defaultPricingMode,
        discountPercent: draft.discountPercent,
        discountDisplayMode: draft.discountDisplayMode,
        minimumQuotableHours: draft.minimumQuotableHours,
        recipientEmailOverride: draft.recipientEmailOverride,
        consentTextOverride: draft.consentTextOverride,
        disclaimerOverride: draft.disclaimerOverride,
        visibleFieldsJson: draft.visibleFieldsJson,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Save failed");
      return;
    }
    setEditingId(null);
    setDraft(null);
    await load();
  }

  async function regenerateToken(id: string) {
    if (!confirm("Regenerate token? Existing embeds will stop working until updated.")) return;
    const res = await fetch(`/api/charter/empty-legs/public-lists/${id}/regenerate-token`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Regenerate failed");
      return;
    }
    await load();
  }

  async function revokeToken(id: string) {
    if (!confirm("Revoke this list token?")) return;
    const res = await fetch(`/api/charter/empty-legs/public-lists/${id}/revoke-token`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Revoke failed");
      return;
    }
    await load();
  }

  async function copyEmbed(token: string) {
    await navigator.clipboard.writeText(embedCode(token));
    setMessage("Embed code copied");
  }

  const visible = (draft?.visibleFieldsJson ?? {}) as Partial<EmptyLegVisibleFields>;

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-atlas-accent">{message}</p> : null}

      <div className="flex flex-wrap items-end gap-2 rounded border border-atlas-border bg-atlas-surface p-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-atlas-muted">New list name</label>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            placeholder="Broker Partners"
          />
        </div>
        <button
          type="button"
          onClick={() => void createList()}
          className="rounded bg-atlas-accent px-3 py-1.5 text-sm text-white"
        >
          Create list
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-atlas-muted">Loading…</p>
      ) : lists.length === 0 ? (
        <p className="text-sm text-atlas-muted">No public lists yet.</p>
      ) : (
        <ul className="space-y-4">
          {lists.map((list) => (
            <li
              key={list.id}
              className="rounded border border-atlas-border bg-atlas-surface p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-serif text-lg">{list.name}</h2>
                  <p className="mt-0.5 text-xs text-atlas-muted">
                    {list.slug} · {list.placementCount ?? 0} placements · {list.leadCount ?? 0}{" "}
                    leads · {list.isActive ? "Active" : "Inactive"}
                    {list.tokenRevokedAt ? " · Token revoked" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-atlas-border px-2 py-1 text-xs"
                    onClick={() => startEdit(list)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="rounded border border-atlas-border px-2 py-1 text-xs"
                    onClick={() => void copyEmbed(list.token)}
                  >
                    Copy embed
                  </button>
                  <a
                    href={`/embed/empty-legs/${list.token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded border border-atlas-border px-2 py-1 text-xs text-atlas-accent"
                  >
                    Preview
                  </a>
                  <button
                    type="button"
                    className="rounded border border-atlas-border px-2 py-1 text-xs"
                    onClick={() => void regenerateToken(list.id)}
                  >
                    Regenerate token
                  </button>
                  <button
                    type="button"
                    className="rounded border border-atlas-border px-2 py-1 text-xs"
                    onClick={() => void revokeToken(list.id)}
                  >
                    Revoke token
                  </button>
                </div>
              </div>
              <p className="mt-2 break-all font-mono text-xs text-atlas-muted">
                Token: {list.token}
              </p>

              {editingId === list.id && draft ? (
                <div className="mt-4 space-y-3 border-t border-atlas-border pt-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.isActive)}
                      onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                    />
                    Active
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FieldSelect
                      label="Default placement status"
                      value={draft.defaultPlacementStatus ?? "needs_approval"}
                      onChange={(v) => setDraft({ ...draft, defaultPlacementStatus: v })}
                      options={[
                        ["needs_approval", "Needs approval"],
                        ["approved", "Approved"],
                        ["hidden", "Hidden"],
                      ]}
                    />
                    <FieldSelect
                      label="Layout"
                      value={draft.layoutStyle ?? "card_grid"}
                      onChange={(v) => setDraft({ ...draft, layoutStyle: v })}
                      options={[
                        ["card_grid", "Card grid"],
                        ["compact_list", "Compact list"],
                      ]}
                    />
                    <FieldSelect
                      label="Default pricing mode"
                      value={draft.defaultPricingMode ?? "calculated"}
                      onChange={(v) => setDraft({ ...draft, defaultPricingMode: v })}
                      options={[
                        ["calculated", "Calculated"],
                        ["custom", "Custom"],
                        ["hide_price", "Hide price"],
                      ]}
                    />
                    <FieldSelect
                      label="Discount display"
                      value={draft.discountDisplayMode ?? "none"}
                      onChange={(v) => setDraft({ ...draft, discountDisplayMode: v })}
                      options={[
                        ["none", "None"],
                        ["show_both", "Show both"],
                        ["discounted_only", "Discounted only"],
                      ]}
                    />
                    <FieldNumber
                      label="Discount %"
                      value={draft.discountPercent}
                      onChange={(v) => setDraft({ ...draft, discountPercent: v })}
                    />
                    <FieldNumber
                      label="Min quotable hours"
                      value={draft.minimumQuotableHours}
                      onChange={(v) => setDraft({ ...draft, minimumQuotableHours: v })}
                    />
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-atlas-muted">
                        Recipient email override
                      </label>
                      <input
                        value={draft.recipientEmailOverride ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, recipientEmailOverride: e.target.value || null })
                        }
                        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-atlas-muted">
                        Consent text override
                      </label>
                      <textarea
                        value={draft.consentTextOverride ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, consentTextOverride: e.target.value || null })
                        }
                        rows={2}
                        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1 block text-xs text-atlas-muted">
                        Disclaimer override
                      </label>
                      <textarea
                        value={draft.disclaimerOverride ?? ""}
                        onChange={(e) =>
                          setDraft({ ...draft, disclaimerOverride: e.target.value || null })
                        }
                        rows={2}
                        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-atlas-muted">
                      Visible fields
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {VISIBLE_FIELD_KEYS.map((key) => (
                        <label key={key} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={visible[key] ?? DEFAULT_VISIBLE_FIELDS[key]}
                            onChange={(e) =>
                              setDraft({
                                ...draft,
                                visibleFieldsJson: { ...visible, [key]: e.target.checked },
                              })
                            }
                          />
                          {key}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveEdit()}
                      className="rounded bg-atlas-accent px-3 py-1.5 text-sm text-white"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setDraft(null);
                      }}
                      className="rounded border border-atlas-border px-3 py-1.5 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-atlas-muted">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </div>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs text-atlas-muted">{label}</label>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
      />
    </div>
  );
}
