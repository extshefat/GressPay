"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function EmailVerificationBanner() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function resend() {
    setBusy(true);
    try {
      const response = await fetch("/api/v1/auth/resend-verification", {
        method: "POST", headers: { "X-GressPay-Client": "dashboard" },
      });
      setMessage(response.ok ? "Verification email sent. Check your inbox." : "Email could not be sent. Please try again later.");
    } catch { setMessage("Could not reach the server. Please try again."); }
    finally { setBusy(false); }
  }
  return <aside className="mb-6 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm leading-relaxed text-warning dark:bg-warning dark:text-warning" aria-label="Email verification">
    <p>Verify your email before creating live API keys or going live. You can continue exploring the dashboard.</p>
    <Button className="mt-3" size="sm" variant="outline" disabled={busy} onClick={resend}>{busy ? "Sending…" : "Send verification email"}</Button>
    <p role="status" className="mt-2">{message}</p>
  </aside>;
}
