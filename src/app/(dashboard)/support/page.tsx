"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/formatters";
import { BookOpen, LifeBuoy, Mail, MessageSquare, RefreshCw } from "lucide-react";

export default function SupportPage() {
  const { success, error: toastError } = useToast();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [tickets, setTickets] = useState<
    { ticketId: string; subject: string; status: string; createdAt: string }[]
  >([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const loadTickets = useCallback(async () => {
    setLoadingTickets(true);
    try {
      const data = await api.listSupportTickets();
      setTickets(data.tickets || []);
    } catch {
      setTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.createSupportTicket({
        subject: subject.trim(),
        message: message.trim(),
        contactEmail: email.trim() || undefined,
      });
      success(res.message || `Ticket ${res.ticketId} submitted.`);
      setSubject("");
      setMessage("");
      await loadTickets();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Could not submit ticket.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Support</h1>
        <p className="mt-1 text-xs text-zinc-500">Documentation, contact options, and merchant support tickets.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-zinc-200 p-5 dark:border-zinc-800">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h2 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">Developers</h2>
          <p className="mt-1 text-xs text-zinc-500">REST reference, auth headers, and integration snippets.</p>
          <Link href="/developers" className="mt-3 inline-block text-xs font-semibold text-blue-600 underline">
            Open API docs
          </Link>
        </Card>
        <Card className="border-zinc-200 p-5 dark:border-zinc-800">
          <Mail className="h-5 w-5 text-zinc-600" />
          <h2 className="mt-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">Help center</h2>
          <p className="mt-1 text-xs text-zinc-500">Hosted checkout, companion devices, and verification flows.</p>
          <Link href="/help" className="mt-3 inline-block text-xs font-semibold underline">
            Browse help articles
          </Link>
        </Card>
      </div>

      <Card className="border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <h2 className="text-sm font-bold">Submit a ticket</h2>
        </div>
        <form onSubmit={submit} className="space-y-3 text-sm">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Contact email (optional if on file)"
            type="email"
          />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" required />
          <textarea
            className="min-h-[120px] w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe the issue, order ID, or integration question…"
            required
          />
          <Button type="submit" variant="primary" size="sm" disabled={busy} leftIcon={<LifeBuoy className="h-3.5 w-3.5" />}>
            {busy ? "Sending…" : "Submit ticket"}
          </Button>
        </form>
      </Card>

      <Card className="border-zinc-200 p-6 dark:border-zinc-800">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Your recent tickets</h2>
          <Button size="sm" variant="ghost" onClick={loadTickets} isLoading={loadingTickets}>
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
        {tickets.length === 0 ? (
          <p className="text-xs text-zinc-500">No tickets yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {tickets.map((t) => (
              <li key={t.ticketId} className="flex items-center justify-between py-3 text-xs">
                <div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{t.subject}</div>
                  <div className="font-mono text-[10px] text-zinc-500">
                    {t.ticketId} · {formatDate(t.createdAt)}
                  </div>
                </div>
                <span className="rounded bg-zinc-100 px-2 py-0.5 font-mono text-[10px] uppercase dark:bg-zinc-800">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
