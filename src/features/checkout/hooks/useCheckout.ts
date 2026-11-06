"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { foldTxid } from "@/lib/method-theme";
import type { CheckoutSession, CheckoutStatusResponse, PaymentMethod, TransactionStatus } from "@/lib/types/api";
import { hasSubmittedPayment, initialMethod, isMobileMethod, isSmsAuto, normalizePayerNumber, remainingSeconds, type CheckoutStep, validateReference, validPayerNumber } from "../checkoutMachine";

export interface CheckoutPreviewSeed { step?: CheckoutStep; payerNumber?: string; cancelMessage?: string; }
export function useCheckout(session: CheckoutSession, demoMode: boolean, previewSeed?: CheckoutPreviewSeed) {
  const preview = demoMode ? previewSeed : undefined;
  const restoredMethod = initialMethod(session);
  const restoredSubmission = hasSubmittedPayment(session) && !!restoredMethod;
  const [method, setMethod] = useState<PaymentMethod | undefined>(restoredSubmission || session.paymentStatus === "COMPLETED" ? restoredMethod : preview?.step && preview.step !== "choose" ? restoredMethod || session.availableMethods[0] : undefined);
  const [step, setStep] = useState<CheckoutStep>(preview?.step || (restoredSubmission || session.paymentStatus === "COMPLETED" ? "payment" : "choose"));
  const [status, setStatus] = useState<TransactionStatus>(session.paymentStatus || "PENDING");
  const [sender, setSender] = useState(preview?.payerNumber || "");
  const [txid, setTxid] = useState(session.submittedTxid || "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [referenceError, setReferenceError] = useState<string | undefined>();
  const [payerError, setPayerError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(restoredSubmission);
  const [message, setMessage] = useState<string | null>(null);
  const [providerUrl, setProviderUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(() => remainingSeconds(session.expiresAt));
  const [online, setOnline] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [cancelled, setCancelled] = useState<string | null>(preview?.cancelMessage || null);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [redirectTarget, setRedirectTarget] = useState<string | null>(null);
  const [redirectSeconds, setRedirectSeconds] = useState(4);
  const lock = useRef(false);
  const mounted = useRef(true);
  const expiryChecked = useRef(false);
  const submittedAt = useRef(restoredSubmission ? Date.now() : 0);
  const statusRequest = useRef<Promise<CheckoutStatusResponse> | null>(null);
  const [pollVersion, setPollVersion] = useState(0);
  const smsAuto = isSmsAuto(session, method);
  const terminal = ["COMPLETED", "EXPIRED", "FAILED", "REFUNDED"].includes(status) || !!cancelled;
  const readStatus = useCallback(() => {
    if (!statusRequest.current) {
      const request = api.getCheckoutStatus(session.sessionId);
      statusRequest.current = request;
      const clear = () => { if (statusRequest.current === request) statusRequest.current = null; };
      void request.then(clear, clear);
    }
    return statusRequest.current;
  }, [session.sessionId]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const sync = () => { if (navigator.onLine) expiryChecked.current = false; setOnline(navigator.onLine); };
    sync(); window.addEventListener("online", sync); window.addEventListener("offline", sync);
    return () => { window.removeEventListener("online", sync); window.removeEventListener("offline", sync); };
  }, []);
  useEffect(() => {
    if (terminal) return;
    const update = () => setSecondsLeft(remainingSeconds(session.expiresAt));
    update(); const timer = setInterval(update, 1000);
    document.addEventListener("visibilitychange", update);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", update); };
  }, [session.expiresAt, terminal]);

  const acceptStatus = useCallback((result: CheckoutStatusResponse) => {
    if (!mounted.current) return;
    if (result.message) setMessage(result.message);
    if (result.status === "COMPLETED") {
      setStatus("COMPLETED"); setSubmitted(false); setBusy(false);
      if (result.txid) setTxid(result.txid);
      const target = result.redirectUrl || result.returnUrl || session.successRedirectUrl || session.returnUrl;
      if (target) { setRedirectSeconds(4); setRedirectTarget(target); }
    } else if (["EXPIRED", "FAILED", "REFUNDED"].includes(result.status)) {
      setStatus(result.status); setSubmitted(false); setBusy(false);
    }
  }, [session.returnUrl, session.successRedirectUrl]);

  // Deadline checks never turn a network failure or an unpaid PENDING response into paid.
  useEffect(() => {
    if (secondsLeft > 0 || terminal || !online || expiryChecked.current) return;
    expiryChecked.current = true;
    if (demoMode) return;
    let active = true;
    void readStatus().then(result => {
      if (!active) return;
      acceptStatus(result);
      if (result.status === "PENDING") setMessage("The payment window has ended. Checking the final server status; do not send another payment.");
    }).catch(() => { if (active) setError("Could not check the final status. Reconnect and try again; do not pay twice."); });
    return () => { active = false; };
  }, [secondsLeft, terminal, online, demoMode, session.sessionId, acceptStatus, pollVersion, readStatus]);

  // One request at a time. A retry backs off; returning from offline triggers a fresh check.
  useEffect(() => {
    if (!submitted || terminal || !online || demoMode) return;
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined; let attempts = 0; let failures = 0;
    async function poll() {
      if (!active) return;
      attempts += 1;
      try {
        const result = await readStatus();
        if (!active) return;
        failures = 0; acceptStatus(result);
        if (result.status !== "PENDING") return;
      } catch { if (!active) return; failures += 1; }
      if (!active) return;
      if (attempts >= 50) { setMessage("Confirmation is taking longer. Keep your receipt and contact the merchant before paying again."); return; }
      timer = setTimeout(poll, Math.min(15000, 3000 * 2 ** Math.min(failures, 2)));
    }
    timer = setTimeout(poll, 1000);
    return () => { active = false; clearTimeout(timer); };
  }, [submitted, terminal, online, demoMode, session.sessionId, acceptStatus, pollVersion, readStatus]);
  useEffect(() => {
    if (!submitted) return;
    const update = () => setElapsed(Math.max(0, Math.floor((Date.now() - submittedAt.current) / 1000)));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, [submitted]);
  useEffect(() => {
    if (!redirectTarget || demoMode) return;
    const end = Date.now() + redirectSeconds * 1000;
    const timer = setInterval(() => setRedirectSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    const navigate = setTimeout(() => window.location.assign(redirectTarget), Math.max(0, end - Date.now()));
    return () => { clearInterval(timer); clearTimeout(navigate); };
    // The initial duration is captured once per target, not restarted on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTarget, demoMode]);

  function choose(next: PaymentMethod) {
    if (submitted || lock.current || terminal) return;
    setMethod(next); setTxid(""); setSender(""); setError(null); setMessage(null); setReferenceError(undefined); setPayerError(undefined);
    setStep(isMobileMethod(next) || !!session.customFields?.length ? "payer" : "payment");
  }
  function continueToPayment(): boolean {
    if (isMobileMethod(method)) {
      const required = smsAuto || session.requirePayerMatch;
      if ((required || sender.trim()) && !validPayerNumber(sender)) { setPayerError("Enter the 11-digit Bangladesh number you will pay from (01XXXXXXXXX)."); return false; }
      setSender(normalizePayerNumber(sender));
    }
    for (const field of session.customFields || []) if (field.required && !(fields[field.id] || "").trim()) { setError(`Please fill in: ${field.label}`); return false; }
    setError(null); setPayerError(undefined); setStep("payment"); return true;
  }
  function markSubmitted() { submittedAt.current = Date.now(); setElapsed(0); setSubmitted(true); setPollVersion(value => value + 1); }
  async function verify() {
    if (lock.current || terminal || !method) return;
    setError(null); setReferenceError(undefined);
    if (!online) { setError("You are offline. Reconnect before submitting your payment reference."); return; }
    if (!demoMode && method.code !== "binance_pay" && !method.depositAddressOrNumber) { setError("This receiving account is not configured. Choose another method or contact the merchant."); return; }
    const cleanTrx = foldTxid(method, txid);
    if (method.code !== "binance_pay") {
      const validation = validateReference(method, cleanTrx, !method.requiresTxidInput);
      if (validation) { setReferenceError(validation); setStep("verify"); return; }
    }
    if (isMobileMethod(method) && (smsAuto || session.requirePayerMatch || sender.trim()) && !validPayerNumber(sender)) { setPayerError("Enter the phone number used for this payment."); setStep("payer"); return; }
    for (const field of session.customFields || []) if (field.required && !(fields[field.id] || "").trim()) { setError(`Please fill in: ${field.label}`); setStep("payer"); return; }
    lock.current = true; setBusy(true);
    try {
      if (demoMode) { setMessage("Preview: the reference is submitted. A live payment needs server-side confirmation."); markSubmitted(); return; }
      if (method.code === "binance_pay") {
        const order = await api.createBinancePayOrder(session.sessionId, method.gatewayId);
        if (!mounted.current) return;
        if (order.checkoutUrl) { setProviderUrl(order.checkoutUrl); window.open(order.checkoutUrl, "_blank", "noopener,noreferrer"); }
        setMessage(order.message || "Complete the payment with Binance Pay. GressPay is waiting for provider confirmation.");
        markSubmitted();
      } else {
        const result = await api.verifyCheckout(session.sessionId, cleanTrx, method.code, method.gatewayId, normalizePayerNumber(sender) || undefined, fields);
        if (!mounted.current) return;
        acceptStatus(result);
        if (result.status === "PENDING") { setMessage(result.message || (smsAuto ? "Waiting for the companion payment SMS to match." : "Your transaction reference is registered. Waiting for server verification.")); markSubmitted(); }
      }
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Could not verify this payment. Keep your receipt and try again."); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function cancel() {
    if (lock.current || terminal) return;
    lock.current = true; setCancelBusy(true); setError(null);
    try {
      if (demoMode) { setCancelled("Preview checkout cancelled. No money moved."); return; }
      const result = await api.cancelCheckout(session.sessionId);
      if (!mounted.current) return;
      setCancelled(result.message || "Checkout cancelled.");
      setRedirectSeconds(3); setRedirectTarget(result.redirectUrl || "/");
    } catch (err) { if (mounted.current) setError(err instanceof Error ? err.message : "Could not cancel this checkout."); }
    finally { lock.current = false; if (mounted.current) setCancelBusy(false); }
  }
  function editReference() { if (lock.current || terminal) return; setSubmitted(false); setError(null); setStep("verify"); }
  function retryStatus() { expiryChecked.current = false; setError(null); setPollVersion(value => value + 1); }
  return { method, step, setStep, status, sender, setSender, txid, setTxid, fields, setFields, error, referenceError, setReferenceError, payerError, busy, submitted, message, providerUrl, secondsLeft, online, elapsed, cancelled, cancelBusy, redirectTarget, redirectSeconds, smsAuto, choose, continueToPayment, verify, cancel, retryStatus, editReference };
}
export type CheckoutController = ReturnType<typeof useCheckout>;
