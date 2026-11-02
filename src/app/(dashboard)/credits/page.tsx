"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CreditsPage() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getCreditBalance>> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function load() { setLoading(true); setError(''); try { setData(await api.getCreditBalance()); } catch (e) { setError(e instanceof Error ? e.message : 'Could not load credits.'); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  return <div className="dashboard-page space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Credits & Balance</h1><p className="mt-1 text-sm text-zinc-500">Your GressPay usage credits, current plan and account history.</p></div><Button variant="outline" onClick={load} isLoading={loading}>Refresh</Button></div>
    {error && <p role="alert" className="rounded-xl border p-4 text-sm">{error}</p>}
    <div className="grid gap-4 sm:grid-cols-2"><Card className="p-6"><p className="text-xs uppercase tracking-wider text-zinc-500">Available usage credits</p><p className="mt-3 text-3xl font-semibold">{data ? data.balance.toLocaleString() : '—'}</p><p className="mt-2 text-xs text-zinc-500">Credits cover platform usage. Customer payments go directly to your receiving wallet.</p></Card><Card className="p-6"><p className="text-xs uppercase tracking-wider text-zinc-500">Current subscription</p><p className="mt-3 text-xl font-semibold">{data?.subscription?.plan_id || 'No active paid subscription'}</p><Link href="/dashboard/my-payments" className="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-zinc-900">View plans & add credits</Link></Card></div>
    <Card className="overflow-hidden"><h2 className="border-b p-5 text-sm font-semibold">Credit history</h2>{!data && loading ? <p className="p-5 text-sm text-zinc-500">Loading history…</p> : !data?.history.length ? <p className="p-5 text-sm text-zinc-500">No credit activity yet. Plan purchases and account adjustments appear here.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b"><th className="p-4">Date</th><th>Reason</th><th>Change</th><th>Balance</th></tr></thead><tbody>{data.history.map((row,index)=><tr key={index} className="border-b last:border-0"><td className="p-4 whitespace-nowrap">{new Date(row.created_at).toLocaleDateString()}</td><td className="min-w-48 pr-4">{row.reason}</td><td className="pr-4">{Number(row.delta)>0?'+':''}{row.delta}</td><td className="pr-4">{row.balance_after}</td></tr>)}</tbody></table></div>}</Card>
  </div>;
}
