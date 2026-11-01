"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    setSelectedBrands(brands.map((b) => b.brandId));
    setInviteUrl(null);
    setCopied(false);
    setModalOpen(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditing(m);
    setEmail(m.email);
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Team</h1>
          <p className="mt-1 text-xs text-zinc-500">You joined this workspace as staff.</p>
        </div>
        {acceptNote ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {acceptNote}
          </div>
        ) : null}
        <Card className="space-y-3 border-zinc-200 p-6 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <h2 className="text-sm font-bold">Your access</h2>
            <Badge variant="emerald" size="sm">
              {staffRole || "staff"}
            </Badge>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Team</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Invite operators by email. Assign brands and a role preset.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openInvite} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
          Add Team Member
        </Button>
      </div>

      {acceptNote ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
          {acceptNote}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Total</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.total}</p>
        </Card>
        <Card className="border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Active</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {stats.active}
          </p>
        </Card>
        <Card className="border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">Invited</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {stats.invited}
          </p>
        </Card>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email, role, or status…"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-600 dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>

      {isLoading ? (
        <p className="text-xs text-zinc-500">Loading team…</p>
      ) : filtered.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-dashed border-zinc-300 p-10 text-center dark:border-zinc-700">
          <Users className="h-8 w-8 text-zinc-400" />
          <div>
            <p className="text-sm font-semibold">No team members yet</p>
            <p className="mt-1 text-xs text-zinc-500">
              Invite a manager or support agent and share the accept link.
            </p>
          </div>
          <Button size="sm" variant="primary" onClick={openInvite}>
            Add Team Member
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[11px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-900/60">
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
                  className="border-t border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-medium">{m.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {m.brandIds.length === 0 ? (
                        <span className="text-xs text-zinc-400">—</span>
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
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled={!!editing}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-600 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Role
            </label>
            <div className="flex gap-2">
              {(["manager", "support"] as TeamRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                    role === r
                      ? "border-teal-700 bg-teal-50 text-teal-900 dark:border-teal-400 dark:bg-teal-950/40 dark:text-teal-200"
                      : "border-zinc-200 dark:border-zinc-700"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-zinc-500">{ROLE_HELP[role]}</p>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              Allowed brands
            </label>
            {brands.length === 0 ? (
              <p className="text-xs text-zinc-500">Create a brand first under Brands.</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                {brands.map((b) => (
                  <label
                    key={b.brandId}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900"
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

          {inviteUrl ? (
            <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-[11px] font-medium text-amber-900 dark:text-amber-200">
                Copy this accept link and share it. Outbound email is not configured on this server.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={inviteUrl}
                  className="min-w-0 flex-1 truncate rounded border border-amber-200 bg-white px-2 py-1.5 text-[11px] dark:border-amber-900 dark:bg-zinc-950"
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
                onClick={() => void submitModal()}
              >
                {editing ? "Save changes" : "Send Invite"}
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
