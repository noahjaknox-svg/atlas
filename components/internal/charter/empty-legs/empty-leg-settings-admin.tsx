"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_VISIBLE_FIELDS,
  type EmptyLegBranding,
  type EmptyLegVisibleFields,
} from "@/lib/charter/empty-legs/defaults";

function previewTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}

type Settings = {
  defaultLeadRecipientEmail: string | null;
  customerConfirmationTemplate: string;
  internalNotificationTemplate: string;
  consentText: string;
  disclaimerText: string;
  brandingJson: EmptyLegBranding;
  promotionLabel: string;
  citySearchRadiusNm: number;
  defaultLayoutStyle: string;
  defaultVisibleFieldsJson: Partial<EmptyLegVisibleFields>;
  defaultPricingMode: string;
  defaultMinimumQuotableHours: number;
  defaultDiscountPercent: number | null;
  defaultDiscountDisplayMode: string;
  sendCustomerConfirmation: boolean;
};

const SAMPLE_VARS: Record<string, string> = {
  firstName: "Alex",
  lastName: "Rivera",
  fullName: "Alex Rivera",
  email: "alex@example.com",
  phone: "+1 555-0100",
  route: "KSDL → KASE",
  departure: new Date().toISOString(),
  aircraftType: "King Air 350",
  tailNumber: "N123AB",
  sourceList: "Broker Partners",
  price: "$12,500",
  notes: "Flexible on departure time",
  requestType: "direct empty leg",
  matchedEmptyLeg: "T-1001 · KSDL-KASE",
  requestedRoute: "KSDL → KASE",
  requestedDate: new Date().toISOString(),
  assignedRepresentative: "Jordan Lee",
  leadUrl: "https://example.com/charter/leads",
};

const VISIBLE_FIELD_KEYS = Object.keys(DEFAULT_VISIBLE_FIELDS) as (keyof EmptyLegVisibleFields)[];

export function EmptyLegSettingsAdmin() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [testTo, setTestTo] = useState("");
  const [previewKind, setPreviewKind] = useState<"internal" | "customer">("internal");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/charter/empty-legs/settings");
    const json = await res.json();
    setLoading(false);
    if (res.ok) setSettings(json);
    else setMessage(json.error ?? "Failed to load");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const previewHtml = useMemo(() => {
    if (!settings) return "";
    const template =
      previewKind === "customer"
        ? settings.customerConfirmationTemplate
        : settings.internalNotificationTemplate;
    return previewTemplate(template, SAMPLE_VARS);
  }, [settings, previewKind]);

  async function save() {
    if (!settings) return;
    setMessage("");
    const res = await fetch("/api/charter/empty-legs/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.error ?? "Save failed");
      return;
    }
    setSettings(json);
    setMessage("Saved");
  }

  async function sendTest(template: "internal" | "customer") {
    if (!testTo.trim()) {
      setMessage("Enter a test email address");
      return;
    }
    setMessage("");
    const res = await fetch("/api/charter/empty-legs/settings/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo.trim(), template }),
    });
    const json = await res.json();
    setMessage(res.ok ? `Test ${template} email sent to ${testTo}` : json.error ?? "Send failed");
  }

  if (loading || !settings) {
    return <p className="text-sm text-atlas-muted">{loading ? "Loading…" : "No settings"}</p>;
  }

  const branding = settings.brandingJson ?? {};
  const visible = settings.defaultVisibleFieldsJson ?? {};

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-atlas-accent">{message}</p> : null}

      <section className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">Lead & email</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-atlas-muted">
              Default lead recipient email
            </label>
            <input
              value={settings.defaultLeadRecipientEmail ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultLeadRecipientEmail: e.target.value || null,
                })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={settings.sendCustomerConfirmation}
              onChange={(e) =>
                setSettings({ ...settings, sendCustomerConfirmation: e.target.checked })
              }
            />
            Send customer confirmation
          </label>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-atlas-muted">
              Internal notification template
            </label>
            <textarea
              value={settings.internalNotificationTemplate}
              onChange={(e) =>
                setSettings({ ...settings, internalNotificationTemplate: e.target.value })
              }
              rows={6}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 font-mono text-xs"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-atlas-muted">
              Customer confirmation template
            </label>
            <textarea
              value={settings.customerConfirmationTemplate}
              onChange={(e) =>
                setSettings({ ...settings, customerConfirmationTemplate: e.target.value })
              }
              rows={6}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 font-mono text-xs"
            />
          </div>
        </div>
      </section>

      <section className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">Template preview</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded border px-2 py-1 text-xs ${
              previewKind === "internal"
                ? "border-atlas-accent text-atlas-accent"
                : "border-atlas-border"
            }`}
            onClick={() => setPreviewKind("internal")}
          >
            Internal
          </button>
          <button
            type="button"
            className={`rounded border px-2 py-1 text-xs ${
              previewKind === "customer"
                ? "border-atlas-accent text-atlas-accent"
                : "border-atlas-border"
            }`}
            onClick={() => setPreviewKind("customer")}
          >
            Customer
          </button>
        </div>
        <div
          className="mt-3 rounded border border-atlas-border bg-white p-3 text-sm text-slate-900"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs text-atlas-muted">Test send to</label>
            <input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="button"
            className="rounded border border-atlas-border px-2 py-1.5 text-xs"
            onClick={() => void sendTest("internal")}
          >
            Test internal
          </button>
          <button
            type="button"
            className="rounded border border-atlas-border px-2 py-1.5 text-xs"
            onClick={() => void sendTest("customer")}
          >
            Test customer
          </button>
        </div>
      </section>

      <section className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">Consent & disclaimer</h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Consent text</label>
            <textarea
              value={settings.consentText}
              onChange={(e) => setSettings({ ...settings, consentText: e.target.value })}
              rows={3}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Disclaimer text</label>
            <textarea
              value={settings.disclaimerText}
              onChange={(e) => setSettings({ ...settings, disclaimerText: e.target.value })}
              rows={3}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </section>

      <section className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">Branding</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["logoUrl", "Logo URL"],
              ["accentColor", "Accent color"],
              ["headerText", "Header text"],
              ["buttonText", "Button text"],
              ["footerText", "Footer text"],
              ["poweredByText", "Powered-by text"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label className="mb-1 block text-xs text-atlas-muted">{label}</label>
              <input
                value={branding[key] ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    brandingJson: { ...branding, [key]: e.target.value || null },
                  })
                }
                className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-atlas-border bg-atlas-surface p-4">
        <h2 className="font-serif text-lg">Defaults</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Promotion label</label>
            <input
              value={settings.promotionLabel}
              onChange={(e) => setSettings({ ...settings, promotionLabel: e.target.value })}
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">City search radius (nm)</label>
            <input
              type="number"
              value={settings.citySearchRadiusNm}
              onChange={(e) =>
                setSettings({ ...settings, citySearchRadiusNm: Number(e.target.value) })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Default layout</label>
            <select
              value={settings.defaultLayoutStyle}
              onChange={(e) =>
                setSettings({ ...settings, defaultLayoutStyle: e.target.value })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            >
              <option value="card_grid">Card grid</option>
              <option value="compact_list">Compact list</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Default pricing mode</label>
            <select
              value={settings.defaultPricingMode}
              onChange={(e) =>
                setSettings({ ...settings, defaultPricingMode: e.target.value })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            >
              <option value="calculated">Calculated</option>
              <option value="custom">Custom</option>
              <option value="hide_price">Hide price</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">
              Default min quotable hours
            </label>
            <input
              type="number"
              value={settings.defaultMinimumQuotableHours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultMinimumQuotableHours: Number(e.target.value),
                })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">Default discount %</label>
            <input
              type="number"
              value={settings.defaultDiscountPercent ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultDiscountPercent:
                    e.target.value === "" ? null : Number(e.target.value),
                })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-atlas-muted">
              Default discount display
            </label>
            <select
              value={settings.defaultDiscountDisplayMode}
              onChange={(e) =>
                setSettings({ ...settings, defaultDiscountDisplayMode: e.target.value })
              }
              className="w-full rounded border border-atlas-border bg-atlas-bg px-2 py-1.5 text-sm"
            >
              <option value="none">None</option>
              <option value="show_both">Show both</option>
              <option value="discounted_only">Discounted only</option>
            </select>
          </div>
        </div>
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-atlas-muted">
            Default visible fields
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {VISIBLE_FIELD_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={visible[key] ?? DEFAULT_VISIBLE_FIELDS[key]}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultVisibleFieldsJson: { ...visible, [key]: e.target.checked },
                    })
                  }
                />
                {key}
              </label>
            ))}
          </div>
        </div>
      </section>

      <button
        type="button"
        onClick={() => void save()}
        className="rounded bg-atlas-accent px-4 py-2 text-sm text-white"
      >
        Save settings
      </button>
    </div>
  );
}
