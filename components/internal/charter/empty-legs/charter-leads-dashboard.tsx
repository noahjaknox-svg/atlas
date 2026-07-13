"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type LeadRow = {
  id: string;
  submittedAt: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string | null;
  requestType: string;
  requestedDep: string | null;
  requestedArr: string | null;
  requestedDate: string | null;
  emailStatus: string;
  emailError: string | null;
  emptyLeg: { id: string; tripNumber: string; routeKey: string; tailNumber: string } | null;
  publicList: { id: string; name: string } | null;
  assignedRepresentative: { id: string; name: string } | null;
};

type CharterUser = { id: string; name: string; email: string };
type PublicListOption = { id: string; name: string };

export function CharterLeadsDashboard() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [users, setUsers] = useState<CharterUser[]>([]);
  const [lists, setLists] = useState<PublicListOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignedFilter, setAssignedFilter] = useState("");
  const [listFilter, setListFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (assignedFilter) params.set("assignedRepresentativeUserId", assignedFilter);
    if (listFilter) params.set("sourcePublicListId", listFilter);
    if (typeFilter) params.set("requestType", typeFilter);
    if (emailFilter) params.set("emailStatus", emailFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const [leadsRes, metaRes] = await Promise.all([
      fetch(`/api/charter/leads?${params}`),
      fetch("/api/charter/leads/meta"),
    ]);
    const leadsJson = await leadsRes.json();
    const metaJson = await metaRes.json();
    setLoading(false);
    if (leadsRes.ok) setLeads(leadsJson);
    if (metaRes.ok) {
      setUsers(metaJson.users ?? []);
      setLists(metaJson.lists ?? []);
    }
  }, [assignedFilter, listFilter, typeFilter, emailFilter, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  async function assign(id: string, assignedRepresentativeUserId: string | null) {
    await fetch(`/api/charter/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignedRepresentativeUserId }),
    });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          value={assignedFilter}
          onChange={(e) => setAssignedFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
        >
          <option value="">All representatives</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select
          value={listFilter}
          onChange={(e) => setListFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
        >
          <option value="">All lists</option>
          {lists.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
        >
          <option value="">All request types</option>
          <option value="direct_empty_leg">Direct Empty Leg</option>
          <option value="off_routing_empty_leg">Off-Routing Empty Leg</option>
          <option value="custom_quote">Custom Quote</option>
        </select>
        <select
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
        >
          <option value="">All email statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded border border-atlas-border bg-atlas-surface px-2 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-atlas-border">
        <table className="w-full text-sm">
          <thead className="border-b border-atlas-border bg-atlas-surface/80 text-left text-xs text-atlas-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Submitted At</th>
              <th className="px-3 py-2 font-medium">Lead Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Request Type</th>
              <th className="px-3 py-2 font-medium">Route Requested</th>
              <th className="px-3 py-2 font-medium">Matched Empty Leg</th>
              <th className="px-3 py-2 font-medium">Source List</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="px-3 py-2 font-medium">Email Sent</th>
              <th className="px-3 py-2 font-medium">Assigned</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-atlas-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-atlas-muted">
                  No leads yet.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-atlas-border/50">
                <td className="px-3 py-2 text-xs text-atlas-muted">
                  {new Date(lead.submittedAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  {lead.firstName} {lead.lastName}
                </td>
                <td className="px-3 py-2">{lead.email}</td>
                <td className="px-3 py-2">{lead.phone}</td>
                <td className="px-3 py-2 capitalize text-xs">
                  {lead.requestType.replace(/_/g, " ")}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {lead.requestedDep && lead.requestedArr
                    ? `${lead.requestedDep}→${lead.requestedArr}`
                    : "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs">
                  {lead.emptyLeg
                    ? `${lead.emptyLeg.tripNumber} · ${lead.emptyLeg.routeKey}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-xs">{lead.publicList?.name ?? "—"}</td>
                <td className="max-w-[160px] truncate px-3 py-2 text-xs text-atlas-muted">
                  {lead.notes ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      "rounded px-2 py-0.5 text-xs capitalize",
                      lead.emailStatus === "sent" && "bg-emerald-500/20 text-emerald-300",
                      lead.emailStatus === "failed" && "bg-red-500/20 text-red-300",
                      lead.emailStatus === "pending" && "bg-slate-500/20 text-slate-300"
                    )}
                  >
                    {lead.emailStatus}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={lead.assignedRepresentative?.id ?? ""}
                    onChange={(e) =>
                      void assign(lead.id, e.target.value ? e.target.value : null)
                    }
                    className="max-w-[140px] rounded border border-atlas-border bg-atlas-bg px-1 py-1 text-xs"
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
