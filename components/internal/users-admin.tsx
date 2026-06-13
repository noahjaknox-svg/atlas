"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  proposalsAssigned: number;
};

type PendingInviteRow = {
  id: string;
  email: string;
  role: string;
  invitedAt: string;
  invitedBy: string;
};

function formatInviteDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function UsersAdmin() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("sales");

  async function load() {
    const res = await fetch("/api/users?admin=1");
    if (!res.ok) return;
    const data = (await res.json()) as {
      users: UserRow[];
      pendingInvites: PendingInviteRow[];
    };
    setUsers(data.users);
    setPendingInvites(data.pendingInvites);
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendInvite() {
    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: inviteName, email: inviteEmail, role: inviteRole }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Invite failed");
      return;
    }
    alert(json.message ?? "Invited");
    setInviteOpen(false);
    setInviteName("");
    setInviteEmail("");
    void load();
  }

  async function updateRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    void load();
  }

  async function toggleActive(id: string, active: boolean) {
    if (!active && !confirm("Deactivate this user?")) return;
    await fetch(`/api/users/${id}`, { method: active ? "PATCH" : "DELETE" });
    void load();
  }

  async function revokeInvite(id: string, email: string) {
    if (!confirm(`Revoke the pending invite for ${email}? They will need a new invite to sign in.`)) {
      return;
    }
    const res = await fetch(`/api/users/invites/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Could not revoke invite");
      return;
    }
    void load();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Users</h1>
        <Button onClick={() => setInviteOpen(true)}>+ Invite user</Button>
      </div>

      {inviteOpen && (
        <div className="mt-6 rounded-lg border border-atlas-border bg-atlas-surface p-6">
          <h2 className="font-medium">Invite user</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="h-10 rounded border border-atlas-border bg-atlas-bg px-3 text-sm"
            />
            <input
              placeholder="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="h-10 rounded border border-atlas-border bg-atlas-bg px-3 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="h-10 rounded border border-atlas-border bg-atlas-bg px-3 text-sm"
            >
              <option value="admin">Admin</option>
              <option value="sales">Sales</option>
              <option value="reviewer">Reviewer</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => void sendInvite()}>Send invite</Button>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          Pending invites
        </h2>
        {pendingInvites.length === 0 ? (
          <p className="mt-3 text-sm text-atlas-muted">No pending invites.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-atlas-border text-left text-xs uppercase text-atlas-muted">
                  <th className="py-2">Email</th>
                  <th>Role</th>
                  <th>Invited</th>
                  <th>Invited by</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="border-b border-atlas-border/50">
                    <td className="py-3">{invite.email}</td>
                    <td className="capitalize">{invite.role}</td>
                    <td>{formatInviteDate(invite.invitedAt)}</td>
                    <td>{invite.invitedBy}</td>
                    <td>
                      <button
                        type="button"
                        className="text-xs text-atlas-danger hover:underline"
                        onClick={() => void revokeInvite(invite.id, invite.email)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          Active accounts
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-atlas-border text-left text-xs uppercase text-atlas-muted">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Proposals</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-atlas-border/50">
                  <td className="py-3">{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => void updateRole(u.id, e.target.value)}
                      className="rounded border border-atlas-border bg-atlas-bg px-2 py-1 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="sales">Sales</option>
                      <option value="reviewer">Reviewer</option>
                    </select>
                  </td>
                  <td>{u.active ? "Active" : "Inactive"}</td>
                  <td>{u.proposalsAssigned}</td>
                  <td>
                    {u.active && (
                      <button
                        type="button"
                        className="text-xs text-atlas-danger hover:underline"
                        onClick={() => void toggleActive(u.id, false)}
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
