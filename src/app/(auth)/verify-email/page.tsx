"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token") || query.get("token") || "");
    setEmail(query.get("email") || "");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function verify() {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/verify-email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, email }) });
      setDone(response.ok);
      setMessage(response.ok ? "Email verified. Sign in again to continue." : "This link is invalid or expired. Request another email from your dashboard.");
    } catch { setMessage("Could not reach the server. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto w-full max-w-md px-4 py-16 text-zinc-900 dark:text-zinc-100">
    <h1 className="text-2xl font-semibold">Verify your email</h1>
    <p className="my-4 text-sm leading-relaxed">Confirm the email address for the GressPay account you created. Only continue if you requested this verification.</p>
    {!done && <Button onClick={verify} disabled={busy || !token}>{busy ? "Verifying…" : "Verify email"}</Button>}
    <p role="status" className="my-4 text-sm leading-relaxed">{message}</p>
    <Link href={done ? "/login" : "/overview"} className="underline underline-offset-4 focus-visible:outline focus-visible:outline-2">{done ? "Sign in" : "Return to dashboard"}</Link>
  </main>;
}
