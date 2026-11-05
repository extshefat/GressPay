"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";

export function SupportInbox() {
  const [tickets, setTickets] = useState<Awaited<ReturnType<typeof api.supportInbox>>["tickets"]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    try { setTickets((await api.supportInbox()).tickets); setLoaded(true); setError(""); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not load support requests."); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  return <section className="space-y-4">
    <header className="flex items-center justify-between"><div><h2 className="text-xl font-semibold">Support inbox</h2><p className="text-sm text-[var(--text-muted)]">Replies appear in the business account that opened the ticket.</p></div><button onClick={refresh}>Refresh</button></header>
    {error && <p role="alert">{error}</p>}
    {loaded && !tickets.length && <p>No support tickets yet.</p>}
    {tickets.map(t => <article key={t.ticket_id} className="space-y-3 border border-[var(--border-color)] p-5 [overflow-wrap:anywhere]">
      <p className="text-xs text-[var(--text-muted)]">{t.ticket_id} · {t.contact_email} · {t.status}</p>
      <h3 className="font-semibold">{t.subject}</h3><p className="whitespace-pre-wrap">{t.message}</p>
      {t.reply ? <p className="whitespace-pre-wrap border-l-2 border-info pl-3">{t.reply}</p> :
        <form onSubmit={async e => {
          e.preventDefault(); const reply = String(new FormData(e.currentTarget).get("reply") || "").trim();
          if (!reply || busy) return;
          setBusy(t.ticket_id);
          try { await api.replyToTicket(t.ticket_id, reply); await refresh(); }
          catch (err) { setError(err instanceof Error ? err.message : "Reply failed."); }
          finally { setBusy(""); }
        }} className="grid gap-2">
          <textarea aria-label={"Reply to " + t.subject} name="reply" required className="min-h-24 border bg-transparent p-3" />
          <button disabled={!!busy} className="justify-self-start rounded bg-[var(--text-primary)] px-4 py-2 text-[var(--bg-page)]">{busy === t.ticket_id ? "Sending…" : "Send reply"}</button>
        </form>}
    </article>)}
  </section>;
}
