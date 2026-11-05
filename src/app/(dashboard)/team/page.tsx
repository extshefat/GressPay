"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { api } from "@/lib/api-client";
import {
  Users,
  UserPlus,
  Search,
  Copy,
  Check,
  Pencil,
  Trash2,
  Mail,
} from "lucide-react";

type TeamRole = "manager" | "support";

type TeamMember = {
  memberId: string;
  email: string;
  role: string;
  status: string;
  brandIds: string[];
  permissions: Record<string, Record<string, boolean>>;
  createdAt?: string | null;
};

type BrandOption = { brandId: string; name: string };

const ROLE_HELP: Record<TeamRole, string> = {
  manager: "Gateways, links, invoices, devices, transactions. No billing or website key rotate.",
  support: "Transactions view + resend webhook. Mostly read-only.",
};

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-5xl py-10 text-xs text-muted">Loading team…</div>
      }
    >
      <TeamPageContent />
    </Suspense>
  );
}

function TeamPageContent() {
  const searchParams = useSearchParams();
  const [isOwner, setIsOwner] = useState(true);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, invited: 0, limit: 100 });
  const [brands, setBrands] = useState<BrandOption[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptNote, setAcceptNote] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("manager");
  const [roleDefaults, setRoleDefaults] = useState<Partial<Record<TeamRole, TeamMember["permissions"]>>>({});
  const [permissions, setPermissions] = useState<TeamMember["permissions"]>({});
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [revokeTarget, setRevokeTarget] = useState<TeamMember | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const me = await api.getTeamMe();
      setIsOwner(me.isWorkspaceOwner);
      setStaffRole(me.teamRole);
      if (!me.isWorkspaceOwner) {
        setMembers([]);
        setStats({ total: 0, active: 0, invited: 0, limit: 100 });
        setIsLoading(false);
        return;
      }
      const [team, brandRes] = await Promise.all([api.listTeam(), api.listBrands()]);
      setRoleDefaults(team.roleDefaults);
      setMembers(team.members);
      setStats(team.stats);
      setBrands(brandRes.brands.map((b) => ({ brandId: b.brandId, name: b.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load team");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const token = searchParams.get("accept");
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.acceptTeamInvite(token);
        if (!cancelled) {
          if (res.brandIds[0]) api.setBrandId(res.brandIds[0]);
          window.history.replaceState(null, "", window.location.pathname);
          setAcceptNote(res.note || "Invite accepted. You now have access to the assigned brands.");
          await load();
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not accept invite");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.email.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.status.toLowerCase().includes(q)
    );
  }, [members, search]);

  const openInvite = () => {
    setEditing(null);
    setEmail("");
    setRole("manager");
    setPermissions(roleDefaults.manager ?? {});
    setSelectedBrands(brands.map((b) => b.brandId));
    setInviteUrl(null);
    setCopied(false);
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setEmail(m.email);
    setPermissions(m.permissions);
    setRole(m.role === "support" ? "support" : "manager");
    setSelectedBrands(m.brandIds.length ? m.brandIds : []);
    setInviteUrl(null);
    setCopied(false);
    setModalOpen(true);
  };

  const toggleBrand = (id: string) => {
    setSelectedBrands((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitModal = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.updateTeamMember(editing.memberId, {
          role,
          permissions,
          brandIds: selectedBrands,
        });
        setModalOpen(false);
        await load();
      } else {
        if (!email.trim() || !email.includes("@")) {
          setError("Enter a valid email address.");
          setSaving(false);
          return;
        }
        if (selectedBrands.length === 0) {
          setError("Select at least one brand.");
          setSaving(false);
          return;
        }
        const res = await api.inviteTeamMember({
          email: email.trim(),
          permissions,
          brandIds: selectedBrands,
          role,
        });
        setInviteUrl(res.acceptUrl);
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy. Select the URL manually.");
    }
  };

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.revokeTeamMember(revokeTarget.memberId);
      setRevokeTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setRevoking(false);
    }
  };

  const brandName = (id: string) => brands.find((b) => b.brandId === id)?.name || id;

  if (!isOwner && !isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">Team</h1>
          <p className="mt-1 text-xs text-muted">You joined this workspace as staff.</p>
        </div>
        {acceptNote ? (
          <div className="rounded-lg border border-success bg-success/10 px-3 py-2 text-xs text-success dark:border-success dark:bg-success/40 dark:text-success">
            {acceptNote}
          </div>
        ) : null}
        <Card className="space-y-3 border-border p-6 dark:border-border">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-sm font-bold">Your access</h2>
            <Badge variant="emerald" size="sm">
              {staffRole || "staff"}
            </Badge>
          </div>
          <p className="text-xs text-muted dark:text-muted">
            Only the workspace owner can invite or revoke members. Switch brands from the header to
            work within your assigned stores.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">Team</h1>
          <p className="mt-1 text-xs text-muted">
            Invite operators by email. Assign brands and a role preset.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openInvite} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
          Add Team Member
        </Button>
      </div>

      {acceptNote ? (
        <div className="rounded-lg border border-success bg-success/10 px-3 py-2 text-xs text-success dark:border-success dark:bg-success/40 dark:text-success">
          {acceptNote}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-danger bg-danger/10 px-3 py-2 text-xs text-danger dark:border-danger dark:bg-danger/40 dark:text-danger">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border p-4 dark:border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted">Total</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
        </Card>
        <Card className="border-border p-4 dark:border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted">Active</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-success dark:text-success">
            {stats.active}
          </p>
        </Card>
        <Card className="border-border p-4 dark:border-border">
          <p className="text-[11px] uppercase tracking-wide text-muted">Invited</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-warning dark:text-warning">
            {stats.invited}
          </p>
        </Card>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, role, or status…"
          className="w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-accent dark:border-border dark:bg-canvas"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted">Loading team…</p>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed border-border p-10 text-center dark:border-border">
          <Users className="h-8 w-8 text-muted" />
          <div>
            <p className="text-sm font-semibold">No team members yet</p>
            <p className="mt-1 text-xs text-muted">
              Invite a manager or support agent and share the accept link.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={openInvite}>
            Add Team Member
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border dark:border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-card text-[11px] uppercase tracking-wide text-muted dark:bg-surface/60">
              <tr>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Brands</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr
                  key={m.memberId}
                  className="border-t border-border dark:border-border/80"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted" />
                      <span className="font-medium">{m.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.brandIds.length === 0 ? (
                        <span className="text-xs text-muted">—</span>
                      ) : (
                        m.brandIds.slice(0, 3).map((id) => (
                          <Badge key={id} variant="slate" size="sm">
                            {brandName(id)}
                          </Badge>
                        ))
                      )}
                      {m.brandIds.length > 3 ? (
                        <Badge variant="slate" size="sm">
                          +{m.brandIds.length - 3}
                        </Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        m.status === "active" ? "emerald" : m.status === "invited" ? "amber" : "rose"
                      }
                      size="sm"
                    >
                      {m.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(m)}
                        leftIcon={<Pencil className="h-3.5 w-3.5" />}
                      >
                        Edit
                      </Button>
                      {m.status !== "revoked" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setRevokeTarget(m)}
                          leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                        >
                          Revoke
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Team Member" : "Add Team Member"}
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled={!!editing}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60 dark:border-border dark:bg-canvas"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Role
            </label>
            <div className="flex gap-2">
              {(["manager", "support"] as TeamRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setRole(r); setPermissions(roleDefaults[r] ?? {}); }}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                    role === r
                      ? "border-accent bg-accent/10 text-accent dark:border-accent dark:bg-brand/40 dark:text-accent"
                      : "border-border dark:border-border"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-muted">{ROLE_HELP[role]}</p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted">
              Allowed brands
            </label>
            {brands.length === 0 ? (
              <p className="text-xs text-muted">Create a brand first under Brands.</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-border p-2 dark:border-border">
                {brands.map((b) => (
                  <label
                    key={b.brandId}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-card dark:hover:bg-ink-solid"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b.brandId)}
                      onChange={() => toggleBrand(b.brandId)}
                    />
                    <span>{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {!inviteUrl && <details className="rounded-lg border border-[var(--border-color)] p-3 text-xs">
            <summary className="cursor-pointer font-semibold">Customize access for assigned brands</summary>
            {Object.entries({
              dashboard: ["view"], transactions: ["view", "edit"], gateways: ["view", "create", "edit", "delete"],
              devices: ["view", "create", "edit", "delete"], invoices: ["view", "create"],
              payment_links: ["view", "create", "edit"], webhooks: ["view", "edit"], brands: ["view"],
            }).map(([module, actions]) => (
              <fieldset key={module} className="mt-3 flex flex-wrap gap-3 border-t border-[var(--border-color)] pt-1">
                <legend className="pr-2 font-semibold capitalize">{module.replace("_", " ")}</legend>
                {actions.map((action) => <label key={action} className="flex gap-1">
                  <input type="checkbox" checked={!!permissions[module]?.[action]} onChange={(e) => {
                    const enabled = e.target.checked;
                    setPermissions((prev) => ({ ...prev, [module]: { ...prev[module], [action]: enabled } }));
                  }} /> {action}
                </label>)}
              </fieldset>
            ))}
          </details>}
          {error && <p role="alert" className="text-sm text-danger dark:text-danger">{error}</p>}

          {inviteUrl ? (
            <div className="space-y-2 rounded-lg border border-warning bg-warning/10 p-3 dark:border-warning dark:bg-warning/30">
              <p className="text-[11px] font-medium text-warning dark:text-warning">
                Copy this accept link and share it. Outbound email is not configured on this server.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 truncate rounded border border-warning bg-white px-2 py-1.5 text-[11px] dark:border-warning dark:bg-canvas"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copyInvite()}
                  leftIcon={copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              {inviteUrl ? "Done" : "Cancel"}
            </Button>
            {!inviteUrl ? (
              <Button
                variant="primary"
                size="sm"
                isLoading={saving}
                disabled={selectedBrands.length === 0}
                onClick={() => void submitModal()}
              >
                {editing ? "Save changes" : "Create invite link"}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!revokeTarget}
        onClose={() => setRevokeTarget(null)}
        title="Revoke team member?"
        description={
          revokeTarget
            ? `${revokeTarget.email} will lose access to assigned brands immediately.`
            : ""
        }
        confirmLabel="Revoke"
        loading={revoking}
        onConfirm={() => void confirmRevoke()}
      />
    </div>
  );
}
