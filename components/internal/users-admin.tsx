"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEPARTMENTS, formatDepartmentLabels, type DepartmentId } from "@/lib/departments";
import type { UsersAdminInviteRow, UsersAdminUserRow } from "@/lib/users-admin-load";

type UserRow = UsersAdminUserRow;
type PendingInviteRow = UsersAdminInviteRow;

const tableHeadClass =
  "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-atlas-muted";
const tableCellClass = "px-4 py-3 align-middle text-sm text-atlas-text";
const fieldClass =
  "h-9 w-full min-w-0 rounded border border-atlas-border bg-atlas-bg px-3 text-sm";
const actionLinkClass =
  "text-xs transition-colors hover:underline disabled:pointer-events-none disabled:opacity-50";

function formatInviteDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DepartmentCheckboxes({
  value,
  onChange,
  disabled,
  stacked = false,
}: {
  value: DepartmentId[];
  onChange: (next: DepartmentId[]) => void;
  disabled?: boolean;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        stacked ? "flex flex-col gap-1.5" : "flex flex-wrap gap-x-4 gap-y-2"
      )}
    >
      {DEPARTMENTS.map((department) => {
        const checked = value.includes(department.id);
        return (
          <label
            key={department.id}
            className="flex items-center gap-2 text-sm leading-none text-atlas-text"
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={(event) => {
                if (event.target.checked) {
                  onChange([...value, department.id]);
                  return;
                }
                onChange(value.filter((id) => id !== department.id));
              }}
              className="size-3.5 shrink-0 rounded border-atlas-border"
            />
            <span className={stacked ? "text-xs" : undefined}>{department.label}</span>
          </label>
        );
      })}
    </div>
  );
}

function UsersTable({
  children,
  minWidth,
}: {
  children: React.ReactNode;
  minWidth: string;
}) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-atlas-border">
      <table className={cn("w-full table-fixed text-sm", minWidth)}>{children}</table>
    </div>
  );
}

function RowActions({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-end gap-1.5 whitespace-nowrap">{children}</div>
  );
}

function DepartmentLabel({ user }: { user: UserRow }) {
  if (user.role === "admin") {
    return <span className="text-sm text-atlas-muted">All departments</span>;
  }
  return (
    <span className="text-sm text-atlas-muted">
      {formatDepartmentLabels(user.departments)}
    </span>
  );
}

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export function UsersAdmin({
  initialData,
  currentUser,
}: {
  initialData?: {
    users: UserRow[];
    pendingInvites: PendingInviteRow[];
  };
  currentUser: CurrentUser;
}) {
  const [users, setUsers] = useState<UserRow[]>(initialData?.users ?? []);
  const [pendingInvites, setPendingInvites] = useState<PendingInviteRow[]>(
    initialData?.pendingInvites ?? []
  );
  const skipInitialLoad = useRef(!!initialData);
  const [loadError, setLoadError] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [inviteDepartments, setInviteDepartments] = useState<DepartmentId[]>([
    "aircraft_management",
  ]);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [reactivatingUserId, setReactivatingUserId] = useState<string | null>(null);
  const [showInactiveAccounts, setShowInactiveAccounts] = useState(false);

  const activeUsers = useMemo(
    () => users.filter((user) => user.active && user.id !== currentUser.id),
    [users, currentUser.id]
  );
  const inactiveUsers = useMemo(() => users.filter((user) => !user.active), [users]);

  async function load() {
    setLoadError("");
    const res = await fetch("/api/users?admin=1");
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      setLoadError(json.error ?? "Could not load users and invites.");
      return;
    }
    const data = (await res.json()) as {
      users: UserRow[];
      pendingInvites: PendingInviteRow[];
    };
    setUsers(data.users);
    setPendingInvites(data.pendingInvites);

    const inactiveCount = data.users.filter((user) => !user.active).length;
    if (inactiveCount === 0) {
      setShowInactiveAccounts(false);
    }
  }

  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    void load();
  }, []);

  async function sendInvite() {
    const res = await fetch("/api/users/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: inviteName,
        email: inviteEmail,
        role: inviteRole,
        departments: inviteRole === "staff" ? inviteDepartments : [],
      }),
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
    setInviteRole("staff");
    setInviteDepartments(["aircraft_management"]);
    void load();
  }

  async function updateUser(
    id: string,
    patch: { role?: string; departments?: DepartmentId[] }
  ) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      alert(json.error ?? "Could not update user");
      return;
    }
    void load();
  }

  async function deactivateUser(id: string) {
    if (id === currentUser.id) {
      alert("You cannot deactivate your own account.");
      return;
    }
    if (!confirm("Deactivate this user?")) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: false }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(json.error ?? "Could not deactivate user");
        return;
      }
      void load();
    } catch {
      alert(
        "Could not reach the server. Check that npm run dev is running, then try again."
      );
    }
  }

  async function reactivateUser(id: string, email: string) {
    if (!confirm(`Reactivate ${email}? They will be able to sign in again.`)) return;

    setReactivatingUserId(id);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        alert(json.error ?? "Could not reactivate user");
        return;
      }
      void load();
    } finally {
      setReactivatingUserId(null);
    }
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

  async function resendInvite(id: string, email: string) {
    const res = await fetch(`/api/users/invites/${id}/resend`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error ?? "Could not resend invite");
      return;
    }
    alert(json.message ?? "Invite resent");
    void load();
  }

  async function resetPassword(id: string, email: string) {
    if (!confirm(`Send a password reset email to ${email}?`)) return;

    setResettingUserId(id);
    try {
      const res = await fetch(`/api/users/${id}/reset-password`, { method: "POST" });
      const json = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        alert(json.error ?? "Could not send password reset email");
        return;
      }
      alert(json.message ?? "Password reset email sent");
    } finally {
      setResettingUserId(null);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Users</h1>
          <p className="mt-1 text-sm text-atlas-muted">
            Invite accounts, assign departments, and manage access.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>+ Invite user</Button>
      </div>

      {loadError ? (
        <p className="rounded-md border border-atlas-danger/30 bg-atlas-danger/10 px-3 py-2 text-sm text-atlas-danger">
          {loadError}
        </p>
      ) : null}

      <section className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
        <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          Your account
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-atlas-text">{currentUser.name}</p>
            <p className="mt-0.5 text-sm text-atlas-muted">{currentUser.email}</p>
            <p className="mt-2 text-sm capitalize text-atlas-text">{currentUser.role}</p>
          </div>
          <button
            type="button"
            className={cn(actionLinkClass, "text-atlas-accent sm:self-end")}
            disabled={resettingUserId === currentUser.id}
            onClick={() => void resetPassword(currentUser.id, currentUser.email)}
          >
            {resettingUserId === currentUser.id ? "Sending…" : "Reset password"}
          </button>
        </div>
      </section>

      {inviteOpen && (
        <div className="rounded-lg border border-atlas-border bg-atlas-surface p-6">
          <h2 className="font-medium">Invite user</h2>
          <p className="mt-1 text-sm text-atlas-muted">
            They will receive an email to set their password and sign in.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
                Name
              </span>
              <input
                placeholder="Full name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
                Email
              </span>
              <input
                placeholder="you@prismjet.com"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block space-y-1.5 sm:col-span-2 sm:max-w-xs">
              <span className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
                Role
              </span>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className={fieldClass}
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
              </select>
            </label>
          </div>
          {inviteRole === "staff" ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-atlas-muted">
                Departments
              </p>
              <DepartmentCheckboxes
                value={inviteDepartments}
                onChange={setInviteDepartments}
              />
            </div>
          ) : null}
          <div className="mt-6 flex gap-2">
            <Button onClick={() => void sendInvite()}>Send invite</Button>
            <Button variant="secondary" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          Pending invites
        </h2>
        {pendingInvites.length === 0 ? (
          <p className="mt-3 text-sm text-atlas-muted">No pending invites.</p>
        ) : (
          <UsersTable minWidth="min-w-[880px]">
            <colgroup>
              <col className="w-[28%]" />
              <col className="w-[10%]" />
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-surface/40">
                <th className={tableHeadClass}>Email</th>
                <th className={tableHeadClass}>Role</th>
                <th className={tableHeadClass}>Departments</th>
                <th className={tableHeadClass}>Invited</th>
                <th className={tableHeadClass}>Invited by</th>
                <th className={cn(tableHeadClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((invite) => (
                <tr key={invite.id} className="border-b border-atlas-border/50 last:border-0">
                  <td className={cn(tableCellClass, "truncate")}>{invite.email}</td>
                  <td className={cn(tableCellClass, "capitalize")}>{invite.role}</td>
                  <td className={cn(tableCellClass, "text-atlas-muted")}>
                    {invite.role === "admin"
                      ? "All departments"
                      : formatDepartmentLabels(invite.departments)}
                  </td>
                  <td className={cn(tableCellClass, "whitespace-nowrap")}>
                    {formatInviteDate(invite.invitedAt)}
                  </td>
                  <td className={cn(tableCellClass, "truncate")}>{invite.invitedBy}</td>
                  <td className={cn(tableCellClass, "text-right")}>
                    <RowActions>
                      <button
                        type="button"
                        className={cn(actionLinkClass, "text-atlas-accent")}
                        onClick={() => void resendInvite(invite.id, invite.email)}
                      >
                        Resend
                      </button>
                      <button
                        type="button"
                        className={cn(actionLinkClass, "text-atlas-danger")}
                        onClick={() => void revokeInvite(invite.id, invite.email)}
                      >
                        Revoke
                      </button>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </UsersTable>
        )}
      </section>

      <section>
        <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
          Active accounts
        </h2>
        {activeUsers.length === 0 ? (
          <p className="mt-3 text-sm text-atlas-muted">No active accounts.</p>
        ) : (
          <UsersTable minWidth="min-w-[920px]">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[26%]" />
              <col className="w-[12%]" />
              <col className="w-[34%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-surface/40">
                <th className={tableHeadClass}>Name</th>
                <th className={tableHeadClass}>Email</th>
                <th className={tableHeadClass}>Role</th>
                <th className={tableHeadClass}>Departments</th>
                <th className={cn(tableHeadClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id} className="border-b border-atlas-border/50 last:border-0">
                  <td className={cn(tableCellClass, "font-medium")}>{u.name}</td>
                  <td className={cn(tableCellClass, "truncate text-atlas-muted")}>{u.email}</td>
                  <td className={tableCellClass}>
                    <select
                      value={u.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        void updateUser(u.id, {
                          role,
                          departments:
                            role === "staff"
                              ? u.departments.length > 0
                                ? u.departments
                                : ["aircraft_management"]
                              : [],
                        });
                      }}
                      className="h-9 w-full max-w-[7.5rem] rounded border border-atlas-border bg-atlas-bg px-2 text-xs"
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                    </select>
                  </td>
                  <td className={tableCellClass}>
                    {u.role === "admin" ? (
                      <span className="text-sm text-atlas-muted">All departments</span>
                    ) : (
                      <DepartmentCheckboxes
                        stacked
                        value={u.departments}
                        onChange={(departments) => void updateUser(u.id, { departments })}
                      />
                    )}
                  </td>
                  <td className={cn(tableCellClass, "text-right")}>
                    <RowActions>
                      <button
                        type="button"
                        className={cn(actionLinkClass, "text-atlas-accent")}
                        disabled={resettingUserId === u.id}
                        onClick={() => void resetPassword(u.id, u.email)}
                      >
                        {resettingUserId === u.id ? "Sending…" : "Reset password"}
                      </button>
                      <button
                        type="button"
                        className={cn(actionLinkClass, "text-atlas-danger")}
                        onClick={() => void deactivateUser(u.id)}
                      >
                        Deactivate
                      </button>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </UsersTable>
        )}

        {inactiveUsers.length > 0 ? (
          <button
            type="button"
            className="mt-3 text-sm text-atlas-accent hover:underline"
            onClick={() => setShowInactiveAccounts((open) => !open)}
          >
            {showInactiveAccounts
              ? "Hide inactive accounts"
              : `Show inactive accounts (${inactiveUsers.length})`}
          </button>
        ) : null}
      </section>

      {showInactiveAccounts && inactiveUsers.length > 0 ? (
        <section>
          <h2 className="text-xs font-medium uppercase tracking-wider text-atlas-muted">
            Inactive accounts
          </h2>
          <UsersTable minWidth="min-w-[880px]">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[28%]" />
              <col className="w-[12%]" />
              <col className="w-[32%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-atlas-border bg-atlas-surface/40">
                <th className={tableHeadClass}>Name</th>
                <th className={tableHeadClass}>Email</th>
                <th className={tableHeadClass}>Role</th>
                <th className={tableHeadClass}>Departments</th>
                <th className={cn(tableHeadClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {inactiveUsers.map((u) => (
                <tr key={u.id} className="border-b border-atlas-border/50 last:border-0">
                  <td className={cn(tableCellClass, "font-medium")}>{u.name}</td>
                  <td className={cn(tableCellClass, "truncate text-atlas-muted")}>{u.email}</td>
                  <td className={cn(tableCellClass, "capitalize")}>{u.role}</td>
                  <td className={tableCellClass}>
                    <DepartmentLabel user={u} />
                  </td>
                  <td className={cn(tableCellClass, "text-right")}>
                    <RowActions>
                      <button
                        type="button"
                        className={cn(actionLinkClass, "text-atlas-accent")}
                        disabled={reactivatingUserId === u.id}
                        onClick={() => void reactivateUser(u.id, u.email)}
                      >
                        {reactivatingUserId === u.id ? "Reactivating…" : "Reactivate"}
                      </button>
                    </RowActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </UsersTable>
        </section>
      ) : null}
    </div>
  );
}
