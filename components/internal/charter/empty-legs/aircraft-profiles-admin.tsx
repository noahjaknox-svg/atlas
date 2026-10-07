"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ROUTES } from "@/lib/routes";

type AircraftProfile = {
  id: string;
  name: string;
  label: string | null;
  defaultHourlyRate: number | null;
  minimumQuotableTimeFallback: number | null;
  offRoutingTimeAllowanceHours: number | null;
  isActive: boolean;
};

/**
 * Read-only view of the empty-leg pricing defaults. The Data Warehouse (Aircraft types →
 * Marketplace) is the single place they're edited.
 */
export function AircraftProfilesAdmin() {
  const [rows, setRows] = useState<AircraftProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/charter/empty-legs/aircraft-profiles");
    const json = await res.json();
    setLoading(false);
    if (res.ok) setRows(json);
    else setMessage(json.error ?? "Failed to load");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const marketplaceHref = (id?: string) =>
    `${ROUTES.dataWarehouse.data}?tab=aircraft${id ? `&typeId=${id}` : ""}&section=Marketplace`;

  return (
    <div className="space-y-6">
      {message ? <p className="text-sm text-atlas-accent">{message}</p> : null}

      <p className="text-sm text-atlas-muted">
        Empty-leg pricing defaults are managed in the{" "}
        <Link href={marketplaceHref()} className="text-atlas-accent hover:underline">
          Data Warehouse → Aircraft types → Marketplace
        </Link>{" "}
        tab. This page is a read-only summary.
      </p>

      {loading ? (
        <p className="text-sm text-atlas-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-atlas-muted">
          No aircraft types yet. Create one in the Data Warehouse first, then set its empty-leg pricing
          on the Marketplace tab.
        </p>
      ) : (
        <div className="overflow-hidden rounded border border-atlas-border">
          <table className="w-full text-sm">
            <thead className="bg-atlas-bg text-left text-xs text-atlas-muted">
              <tr>
                <th className="px-3 py-2">Aircraft type</th>
                <th className="px-3 py-2">Hourly rate</th>
                <th className="px-3 py-2">Min hours</th>
                <th className="px-3 py-2">Off-routing</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-atlas-border/50">
                  <td className="px-3 py-2">
                    {row.label || row.name}
                    {!row.isActive ? (
                      <span className="ml-1 text-xs text-atlas-muted">(draft)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    {row.defaultHourlyRate != null
                      ? `$${row.defaultHourlyRate.toLocaleString()}/hr`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{row.minimumQuotableTimeFallback ?? "—"}</td>
                  <td className="px-3 py-2">{row.offRoutingTimeAllowanceHours ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={marketplaceHref(row.id)} className="text-atlas-accent hover:underline">
                      Edit in Marketplace
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
