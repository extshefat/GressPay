"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { PaymentMethod, CheckoutSession, TransactionStatus, Currency } from "@/lib/types/api";
import { api } from "@/lib/api-client";
import { foldTxid } from "@/lib/method-theme";
import { gatewayLogoPath } from "@/lib/gateway-library";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import {
  ShieldCheck,
  Clock,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  RefreshCw,
} from "lucide-react";

export interface HostedCheckoutModalProps {
  session: CheckoutSession;
  /** Marketing / sandbox demo: no live API calls; sample TrxID completes locally. */
  demoMode?: boolean;
}



const MFS_CODES = new Set([
  "bkash",
  "nagad",
  "rocket",
  "upay",
  "cellfin",
  "bangla_qr",
  "bangla_qr_v2",
]);
const CRYPTO_CODES = new Set(["binance_pay", "bybit_pay", "usdt_trc20"]);

const DEMO_SAMPLE_TRX: Record<string, string> = {
  bkash: "DEMOBKASH01",
  nagad: "DEMONAGAD01",
  rocket: "DEMOROCKET1",
  upay: "DEMOUPAY001",
  cellfin: "DEMOCELLFIN",
  usdt_trc20: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
  bybit_pay: "BYBIT-DEMO-ORDER-001",
  binance_pay: "BINANCE-DEMO-ORDER",
};

export const HostedCheckoutModal: React.FC<HostedCheckoutModalProps> = ({
  session,
  demoMode = false,
}) => {
  const methods = useMemo(() => session.availableMethods || [], [session.availableMethods]);

  // Brand gateways only (session already scoped) — show every rail in a tab, no silent drops.
  const mfsMethods = useMemo(
    () =>
      methods.filter(
        (m) => m.category === "mfs" || MFS_CODES.has(m.code.toLowerCase())
      ),
    [methods]
  );

  const cryptoMethods = useMemo(
    () =>
      methods.filter(
        (m) => m.category === "crypto" || CRYPTO_CODES.has(m.code.toLowerCase())
      ),
    [methods]
  );

  const otherMethods = useMemo(() => {
    const claimed = new Set(
      [...mfsMethods, ...cryptoMethods].map((m) => m.gatewayId || m.code)
    );
    return methods.filter((m) => !claimed.has(m.gatewayId || m.code));
  }, [methods, mfsMethods, cryptoMethods]);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>(() =>
    methods.find(m => m.gatewayId === session.submittedGateway && !!session.submittedGateway) ??
    methods.find(m => m.code === session.submittedMethod) ?? methods[0]
  );
  const isCrypto = !!selectedMethod && cryptoMethods.includes(selectedMethod);
  const [methodChosen, setMethodChosen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [txidInput, setTxidInput] = useState<string>(session.submittedTxid || "");
  const [senderNumber, setSenderNumber] = useState<string>("");
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of session.customFields || []) {
      init[f.id] = "";
    }
    return init;
  });
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<TransactionStatus>(session.paymentStatus ?? "PENDING");
  const [providerUrl, setProviderUrl] = useState<string | null>(null);
  const [isPollingVerification, setIsPollingVerification] = useState(!!session.awaitingEvidence);
  const [pollingSeconds, setPollingSeconds] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(4);
  const [cancelRedirectSec, setCancelRedirectSec] = useState(2);
  const [cancelRedirectUrl, setCancelRedirectUrl] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [walletQr, setWalletQr] = useState<{destination: string; url: string} | null>(null);
  const generatedQr = walletQr && walletQr.destination === selectedMethod?.depositAddressOrNumber ? walletQr.url : null;
  const [locale, setLocale] = useState<"en" | "bn">("en");
  const checkoutAmount = (amount: number, currency: Currency) =>
    amount.toLocaleString(locale === "bn" ? "bn-BD" : "en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: currency === "USDT" ? 6 : 2,
    }) + " " + currency;

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!session.expiresAt) return 15 * 60;
    const diff = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkingExpiryRef = useRef(false);

  const payableAmount = selectedMethod?.payableAmount ?? session.amount;
  const payableCurrency =
    selectedMethod?.payableCurrency ?? selectedMethod?.currency ?? session.currency;

  // Generate scannable QR for crypto destination (wallet / UID)
  useEffect(() => {
    let cancelled = false;
    async function buildQr() {
      const dest = selectedMethod?.depositAddressOrNumber;
      const code = selectedMethod?.code?.toLowerCase() || "";
      const isCrypto = ["usdt_trc20", "binance_pay", "bybit_pay"].includes(code);
      if (!dest || !isCrypto) {
        setWalletQr(null);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(dest, {
          width: 200,
          margin: 1,
          color: { dark: "#09090b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setWalletQr({ destination: dest, url: dataUrl });
      } catch {
        if (!cancelled) setWalletQr(null);
      }
    }
    buildQr();
    return () => {
      cancelled = true;
    };
  }, [selectedMethod?.depositAddressOrNumber, selectedMethod?.code]);

  // Countdown timer for session expiration
  useEffect(() => {
    if (
      checkoutStatus === "COMPLETED" ||
      checkoutStatus === "EXPIRED" ||
      checkoutStatus === "FAILED" || checkoutStatus === "REFUNDED"
    ) {
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (demoMode) {
            setCheckoutStatus("EXPIRED");
            return 0;
          }
          if (!checkingExpiryRef.current) {
            checkingExpiryRef.current = true;
            void api.getCheckoutStatus(session.sessionId).then((res) => {
              if (res.status === "COMPLETED") {
                setCheckoutStatus("COMPLETED");
                handleSuccessfulRedirect(res.redirectUrl || res.returnUrl || session.returnUrl);
              } else if (res.status !== "PENDING") {
                setCheckoutStatus(res.status);
              } else {
                setStatusMessage("Confirming the payment window with the server. Retry status if this persists.");
              }
            }).catch(() => setErrorMessage("Could not confirm server status. Reload status before attempting another payment."));
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutStatus, demoMode, session.sessionId, session.returnUrl]);

  useEffect(() => {
    if (checkoutStatus !== "EXPIRED" || !session.returnUrl) return;
    const timer = setTimeout(() => { window.location.href = session.returnUrl!; }, 4000);
    return () => clearTimeout(timer);
  }, [checkoutStatus, session.returnUrl]);

  // Clean up polling & redirect intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
    };
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const copyToClipboard = (text: string, key: string) => {
    if (!navigator.clipboard) { setErrorMessage("Select and copy the value manually."); return; }
    void navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    }).catch(() => setErrorMessage("Select and copy the value manually."));
  };

  const handleCancelCheckout = async () => {
    if (demoMode || isCanceling) return;
    if (!window.confirm(locale === "bn" ? "ইনভয়েস বাতিল করবেন?" : "Cancel this invoice?")) return;
    setIsCanceling(true);
    setErrorMessage(null);
    try {
      const res = await api.cancelCheckout(session.sessionId);
      setCancelMessage(res.message || "Invoice canceled successfully.");
      const target = res.redirectUrl || "";
      setCancelRedirectUrl(target);
      setCheckoutStatus("FAILED");
      if (target) { const timer = setInterval(() => {
        setCancelRedirectSec((s) => {
          if (s <= 1) {
            clearInterval(timer);
            window.location.href = target;
            return 0;
          }
          return s - 1;
        });
      }, 1000); }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Could not cancel checkout.");
    } finally {
      setIsCanceling(false);
    }
  };

  // Start 3-second status polling for Scenario B (customer enters TxID before SMS arrives)
  const startStatusPolling = () => {
    if (demoMode) {
      setIsPollingVerification(true);
      setPollingSeconds(0);
      setTimeout(() => {
        setIsPollingVerification(false);
        setIsVerifying(false);
        setCheckoutStatus("COMPLETED");
      }, 1200);
      return;
    }
    if (pollingRef.current) clearInterval(pollingRef.current);
    setIsPollingVerification(true);
    setPollingSeconds(0);

    const startTime = Date.now();
    let pollCount = 0;

    pollingRef.current = setInterval(async () => {
      pollCount += 1;
      setPollingSeconds(Math.floor((Date.now() - startTime) / 1000));

      try {
        const res = await api.getCheckoutStatus(session.sessionId);
        if (res.status === "COMPLETED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsPollingVerification(false);
          setIsVerifying(false);
          setCheckoutStatus("COMPLETED");
          handleSuccessfulRedirect(
            res.redirectUrl || res.returnUrl || session.successRedirectUrl || session.returnUrl
          );
          return;
        }

        if (res.status !== "PENDING") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsPollingVerification(false);
          setIsVerifying(false);
          setCheckoutStatus(res.status);
          return;
        }
      } catch {
        // Soft error during network jitter — continue polling
      }

      // Stop after 2.5 minutes (50 attempts * 3s)
      if (pollCount >= 50) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsPollingVerification(false);
        setIsVerifying(false);
        setErrorMessage(
          "Payment is still pending. If you have already paid, keep your reference and contact the seller before sending money again."
        );
      }
    }, 3000);
  };

  useEffect(() => {
    if (session.awaitingEvidence && session.paymentStatus === "PENDING") startStatusPolling();
    // The initial session is immutable. User submissions start polling directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  const handleSuccessfulRedirect = (targetUrl?: string | null) => {
    const finalUrl =
      targetUrl || session.successRedirectUrl || session.returnUrl;
    if (!finalUrl) return;

    let countdown = 4;
    setRedirectCountdown(countdown);
    redirectTimerRef.current = setInterval(() => {
      countdown -= 1;
      setRedirectCountdown(countdown);
      if (countdown <= 0) {
        if (redirectTimerRef.current) clearInterval(redirectTimerRef.current);
        window.location.href = finalUrl;
      }
    }, 1000);
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedMethod) {
      setErrorMessage("Please select a payment method.");
      return;
    }

    if (
      selectedMethod.code !== "binance_pay" &&
      !demoMode && !selectedMethod.depositAddressOrNumber
    ) {
      setErrorMessage("Receiving account has not been configured for this method.");
      return;
    }

    const cleanTrx = foldTxid(selectedMethod, txidInput);
    if (
      selectedMethod.code !== "binance_pay" &&
      selectedMethod.requiresTxidInput &&
      !cleanTrx
    ) {
      setErrorMessage(selectedMethod.trxHint || "Please enter the Transaction ID (TrxID).");
      return;
    }

    for (const field of session.customFields || []) {
      const val = (customFieldValues[field.id] || "").trim();
      if (field.required && !val) {
        setErrorMessage(`Please fill in: ${field.label}`);
        return;
      }
    }

    setIsVerifying(true);
    try {
      if (demoMode) {
        setStatusMessage("Demo mode — simulating auto-verification…");
        setIsVerifying(false);
        startStatusPolling();
        return;
      }

      if (selectedMethod.code === "binance_pay") {
        const order = await api.createBinancePayOrder(session.sessionId, selectedMethod.gatewayId);
        if (order.checkoutUrl) {
          setProviderUrl(order.checkoutUrl);
          window.open(order.checkoutUrl, "_blank", "noopener,noreferrer");
        }
        setStatusMessage(
          order.liveReady === false
            ? order.message || "Binance Pay order registered. Monitoring for incoming webhook confirmation."
            : "Complete payment in the Binance app. This window will automatically confirm upon settlement."
        );
        setIsVerifying(false);
        startStatusPolling();
        return;
      }

      const res = await api.verifyCheckout(
        session.sessionId,
        cleanTrx,
        selectedMethod.code,
        selectedMethod.gatewayId,
        senderNumber.trim() || undefined,
        customFieldValues
      );

      if (res.status === "COMPLETED") {
        setIsVerifying(false);
        setCheckoutStatus("COMPLETED");
        handleSuccessfulRedirect(
          res.redirectUrl || res.returnUrl || session.successRedirectUrl || session.returnUrl
        );
      } else if (res.status !== "PENDING") {
        setIsVerifying(false);
        setCheckoutStatus(res.status);
      } else {
        setStatusMessage(
          smsAuto && !cleanTrx
            ? "Waiting for Companion SMS confirmation… Please keep this page open."
            : "Waiting for payment confirmation"
        );
        setIsVerifying(false);
        startStatusPolling();
      }
    } catch (err: unknown) {
      setIsVerifying(false);
      setErrorMessage(
        err instanceof Error ? err.message : "Could not verify this Transaction ID."
      );
    }
  };

  // Step-by-Step English Instructions Generator based on Method Code
  const getInstructions = (method: PaymentMethod) => {
    if (demoMode) return locale === "bn"
      ? ["নমুনা TrxID বোতামে চাপুন।", "ডেমো রসিদ দেখতে পেমেন্ট নিশ্চিত করুন।"]
      : ["Use the sample transaction ID below.", "Confirm the sample payment to view your receipt."];
    const code = method.code.toLowerCase();
    const receiver = method.depositAddressOrNumber || "the number above";
    const accountType = String(method.accountType ?? "personal").toLowerCase();
    if (method.instructions && !MFS_CODES.has(code) && !CRYPTO_CODES.has(code)) return [method.instructions];
    const isAgent = accountType === "agent";
    const isPayment = accountType === "payment";
    const isBusiness = accountType === "merchant";
    const action = isAgent
      ? "Cash Out"
      : isPayment
        ? "Payment"
        : isBusiness
          ? "Business payment"
          : "Send Money";

    const walletNames: Record<string, string> = { bkash: "bKash", nagad: "Nagad", rocket: "Rocket", upay: "upay", cellfin: "CellFin" };
    const methodName = walletNames[code];
    if (methodName) {
      if (locale === "bn") return [
        methodName + " অ্যাপে " + action + " বেছে নিন।",
        receiver + " নম্বরে " + checkoutAmount(payableAmount, payableCurrency) + " পাঠান।",
        method.requiresTxidInput ? "রসিদ থেকে TrxID লিখুন।" : "যে নম্বর থেকে টাকা পাঠিয়েছেন সেটি লিখুন।",
      ];
      return [
        `Open your ${methodName} app.`,
        `Choose "${action}" option.`,
        `Enter the copied recipient number (${receiver}) and the exact amount (${checkoutAmount(payableAmount, payableCurrency)}).`,
        method.requiresTxidInput ? "Copy the transaction ID from your receipt and enter it below." : "Enter your paying phone number and wait for confirmation.",
      ];
    }

    if (code === "usdt_trc20") {
      if (locale === "bn") return ["ওয়ালেটে USDT এবং TRON (TRC-20) নেটওয়ার্ক বেছে নিন।", "উপরের ঠিকানায় দেখানো পরিমাণ পাঠান।", "TRON লেনদেনের ৬৪ অক্ষরের হ্যাশ লিখুন।"];
      return [
        `Open your crypto wallet (Trust Wallet, Binance, OKX, TronLink, etc.).`,
        `Select USDT and choose ONLY TRON (TRC-20) network.`,
        `Send exactly ${checkoutAmount(payableAmount, payableCurrency)} to the address above.`,
        `Paste the 64-character TRON Transaction Hash below — GressPay confirms on-chain via TronGrid (not SMS).`,
      ];
    }

    if (code === "bybit_pay") {
      return [
        `Open the Bybit app and navigate to Bybit Pay / Internal Transfer.`,
        `Transfer ${checkoutAmount(payableAmount, payableCurrency)} to Bybit Pay UID: ${receiver}.`,
        `Copy the Bybit Transfer / Order ID and paste it below for manual review (provider verify when configured).`,
      ];
    }

    return [
      `Send ${checkoutAmount(payableAmount, payableCurrency)} to ${receiver}.`,
      `Save your payment receipt or Transaction ID.`,
      `Enter the Transaction ID below to verify your payment.`,
    ];
  };

  // 1. EXPIRED STATE
  if (cancelMessage) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Invoice Canceled</h2>
        <p className="text-xs text-zinc-500">{cancelMessage}</p>
        {cancelRedirectUrl && <p className="text-[11px] font-mono text-zinc-400">
          Redirecting in {cancelRedirectSec} seconds…
        </p>}
        <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-rose-500 transition-all duration-1000"
            style={{ width: `${Math.max(0, (cancelRedirectSec / 2) * 100)}%` }}
          />
        </div>
      </div>
    );
  }

  if (checkoutStatus === "FAILED" || checkoutStatus === "REFUNDED") {
    return <section className="mx-auto max-w-lg space-y-3 rounded-2xl border bg-[var(--bg-card)] p-8 text-center">
      <h2 className="text-xl font-semibold">{checkoutStatus === "FAILED" ? "Payment unsuccessful" : "Payment refunded"}</h2>
      <p className="text-sm text-[var(--text-secondary)]">Contact {session.merchantName} with your order reference before sending another payment.</p>
      <p className="break-all font-mono text-xs">{session.sessionId}</p>
      {session.returnUrl && <a className="inline-block underline" href={session.returnUrl}>Return to seller</a>}
    </section>;
  }

  if (checkoutStatus === "EXPIRED") {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-900 dark:text-zinc-100">
          <Clock className="w-7 h-7" />
        </div>
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
          Session Expired
        </span>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Payment Window Ended
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
          This payment session has timed out for security. Please request a new checkout link or invoice from the seller.
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            size="md"
            className="w-full"
            onClick={() => {
              if (session.returnUrl) window.location.href = session.returnUrl;
              else window.location.reload();
            }}
          >
            {session.returnUrl ? "Return to seller" : "Reload status"}
          </Button>
        </div>
      </div>
    );
  }

  if (secondsLeft === 0 && checkoutStatus !== "COMPLETED") {
    return <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold">Confirming payment status</h2>
      <p className="text-sm text-zinc-500">{errorMessage || statusMessage || "The server is checking whether this payment window has ended."}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>Retry status</Button>
    </div>;
  }

  // 2. ACTIVE VERIFICATION POLLING STATE (Scenario B)
  if (isPollingVerification) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-zinc-900 dark:border-zinc-700 rounded-3xl shadow-2xl p-8 text-center space-y-5">
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent animate-spin" />
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
            <RefreshCw className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Payment submitted
          </span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 pt-2">
            Waiting for payment confirmation
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {statusMessage ||
              "Your Transaction ID is registered. The merchant GressPay app is listening for incoming carrier SMS to auto-verify your payment."}
          </p>
        </div>

        {providerUrl && <a className="inline-block rounded-lg border px-4 py-2 text-sm font-semibold" href={providerUrl} target="_blank" rel="noopener noreferrer">Continue to Binance Pay ↗</a>}

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-left font-mono text-xs space-y-2.5">
          <div className="flex justify-between items-center text-zinc-500">
            <span>Submitted TrxID</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold break-all text-right ml-3 font-mono">
              {txidInput || "—"}
            </span>
          </div>
          {senderNumber && (
            <div className="flex justify-between items-center text-zinc-500">
              <span>Sender Number</span>
              <span className="text-zinc-900 dark:text-zinc-100 font-medium font-mono">
                {senderNumber}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-zinc-500">
            <span>Payment Rail</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">
              {selectedMethod?.name || "—"}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-500">
            <span>Time Elapsed</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-mono">
              {pollingSeconds}s
            </span>
          </div>
        </div>

        <p className="text-[11px] font-mono text-zinc-400">
          Syncing automatically every 3 seconds • Do not close this window
        </p>

        <Button
          variant="outline"
          size="sm"
          className="text-xs text-zinc-600 dark:text-zinc-400"
          onClick={() => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsPollingVerification(false);
          }}
        >
          Back to Payment Form
        </Button>
      </div>
    );
  }

  // 3. COMPLETED STATE
  if (checkoutStatus === "COMPLETED") {
    const restored = session.paymentStatus === "COMPLETED";
    const receiptMethod = restored
      ? (methods.find(m => session.submittedGateway && m.gatewayId === session.submittedGateway) ?? methods.find(m => m.code === session.submittedMethod))?.name || session.submittedMethod
      : selectedMethod?.name;
    const returnTarget = session.successRedirectUrl || session.returnUrl;
    const doneTheme = session.checkoutTheme || "default";
    const doneThemeClass =
      doneTheme === "luxury" ? "gp-theme-luxury" : doneTheme === "minimal" ? "gp-theme-minimal" : "gp-theme-default";

    return (
      <div className={`gp-checkout-card mx-auto w-full max-w-lg overflow-hidden p-8 text-center space-y-5 ${doneThemeClass}`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--gp-ck-accent)", color: "var(--gp-ck-on-accent, #04110f)" }}>
          <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
        </div>
        {session.merchantLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.merchantLogo} alt="" className="mx-auto h-10 w-10 rounded-xl object-contain bg-white/90 p-1" />
        ) : null}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--gp-ck-accent)" }}>
            {demoMode ? "Sample payment successful" : "Payment successful"}
          </p>
          <h2 className="pt-1 text-3xl font-bold tracking-tight" style={{ color: "var(--gp-ck-text)" }}>
            {restored ? checkoutAmount(session.settledAmount ?? session.amount, session.settledCurrency ?? session.currency) : checkoutAmount(payableAmount, payableCurrency)}
          </h2>
          <p className="text-xs" style={{ color: "var(--gp-ck-muted)" }}>
            {demoMode ? "Demo receipt for " : "Settled to "}<span className="font-semibold" style={{ color: "var(--gp-ck-text)" }}>{session.merchantName}</span>
          </p>
        </div>
        <div className="space-y-2 rounded-2xl border p-4 text-left font-mono text-xs" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-surface)" }}>
          <div className="flex items-center justify-between gap-3" style={{ color: "var(--gp-ck-muted)" }}>
            <span>TrxID</span>
            <span className="break-all text-right font-semibold" style={{ color: "var(--gp-ck-text)" }}>{txidInput || "—"}</span>
          </div>
          <div className="flex items-center justify-between" style={{ color: "var(--gp-ck-muted)" }}>
            <span>Method</span>
            <span style={{ color: "var(--gp-ck-text)" }}>{receiptMethod || "—"}</span>
          </div>
        </div>
        {!restored && returnTarget && redirectCountdown > 0 ? (
          <p className="font-mono text-xs" style={{ color: "var(--gp-ck-muted)" }}>
            Returning in <span className="font-bold" style={{ color: "var(--gp-ck-text)" }}>{redirectCountdown}s</span>…
          </p>
        ) : null}
        <Button
          variant="primary"
          size="lg"
          className="w-full font-semibold"
          style={{ background: "var(--gp-ck-accent)", color: "var(--gp-ck-on-accent, #04110f)" }}
          onClick={() => {
            if (returnTarget) window.location.href = returnTarget;
            else if (window.opener) window.close();
            else window.location.href = "/";
          }}
        >
          {returnTarget ? "Return to store" : "Done"}
        </Button>
        <p className="text-[10px] tracking-wide" style={{ color: "var(--gp-ck-muted)" }}>Secured by GressPay</p>
      </div>
    );
  }

  // 4. EMPTY RAILS STATE
  if (!methods.length || !selectedMethod) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-zinc-400 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          No payment methods available
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          Contact the seller to request another way to pay.
        </p>
      </div>
    );
  }

  const instructions = getInstructions(selectedMethod);
  const theme = session.checkoutTheme || "default";
  const themeClass =
    theme === "luxury"
      ? "gp-theme-luxury"
      : theme === "minimal"
        ? "gp-theme-minimal"
        : "gp-theme-default";
  const smsAuto =
    (session.verificationMode || "trx_id") === "sms_auto" &&
    !selectedMethod.requiresTxidInput;

  const feeLabel = (() => {
    const pct = Number(selectedMethod.feePercentage || 0);
    const fixed = Number(selectedMethod.fixedFee || 0);
    const brandFee = Number(session.brandFee || 0);
    const brandType = session.brandFeeType || "fixed";
    const parts: string[] = [];
    if (pct > 0) parts.push(`${pct}%`);
    if (fixed > 0) parts.push(`${fixed} fixed`);
    if (brandFee > 0) parts.push(brandType === "percentage" ? `${brandFee}% brand` : `${brandFee} brand`);
    return parts.length ? parts.join(" + ") : "0% Fee";
  })();

  const whatsappHref = session.supportWhatsapp
    ? `https://wa.me/${session.supportWhatsapp.replace(/[^\d]/g, "")}`
    : null;
  const telHref = session.supportMobile ? `tel:${session.supportMobile}` : null;
  const mailHref = session.supportEmail ? `mailto:${session.supportEmail}` : null;
  const tgHref = session.supportTelegram
    ? session.supportTelegram.startsWith("http")
      ? session.supportTelegram
      : `https://t.me/${session.supportTelegram.replace(/^@/, "")}`
    : null;

  return (
    <div className={`gp-checkout-card gp-checkout-layout mx-auto w-full overflow-hidden ${themeClass}`}>
      <aside className="gp-order-summary">
        <div className="flex items-center justify-between gap-3">
          <p className="gp-kicker">{locale === "bn" ? "অর্ডারের সারাংশ" : "Order summary"}</p>
          <div className="gp-language" aria-label="Language">
            {(["en", "bn"] as const).map((lang) => (
              <button key={lang} type="button" lang={lang} aria-pressed={locale === lang} onClick={() => setLocale(lang)}>
                {lang === "en" ? "EN" : "বাংলা"}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 flex items-center gap-3 sm:mt-8">
          {session.merchantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.merchantLogo} alt="" className="gp-brand-mark bg-white object-contain p-1" />
          ) : (
            <span aria-hidden className="gp-brand-mark gp-monogram">{session.merchantName?.slice(0, 2).toUpperCase() || "GP"}</span>
          )}
          <div className="min-w-0">
            <p className="text-xs text-[var(--gp-ck-muted)]">{locale === "bn" ? "পেমেন্ট গ্রহণকারী" : "Paying to"}</p>
            <h1 className="flex items-center gap-1.5 break-words text-base font-semibold">
              {session.merchantName}{session.merchantVerified && <ShieldCheck aria-label="Verified business" className="h-4 w-4 shrink-0 text-[var(--gp-ck-accent)]" />}
            </h1>
          </div>
        </div>
        <div className="gp-order-total">
          <p className="text-xs font-semibold text-[var(--gp-ck-muted)]">{locale === "bn" ? "প্রদেয় পরিমাণ" : "Total due"}</p>
          <p className="mt-1 break-words text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {methodChosen ? checkoutAmount(payableAmount, payableCurrency) : checkoutAmount(session.amount, session.currency)}
          </p>
          {session.orderTitle && <p className="mt-1 break-words text-sm text-[var(--gp-ck-muted)]">{session.orderTitle}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-[var(--gp-ck-muted)]"><Clock size={14} />{locale === "bn" ? "বাকি" : "Time left"} <b className="tabular-nums">{timeFormatted}</b></span>
          <button type="button" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} className="inline-flex items-center gap-1 py-2 font-semibold">
            {locale === "bn" ? "বিবরণ" : "Details"} <ChevronDown size={14} className={detailsOpen ? "rotate-180" : ""}/>
          </button>
        </div>
      {detailsOpen && (
        <dl className="grid grid-cols-2 gap-3 border-b px-6 py-4 text-xs" style={{ borderColor: "var(--gp-ck-border)", color: "var(--gp-ck-muted)" }}>
          <dt>Invoice</dt>
          <dd className="break-all font-mono" style={{ color: "var(--gp-ck-text)" }}>
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => copyToClipboard(session.sessionId, "invoice")}>
              {session.sessionId.slice(0, 10)}…{copiedKey === "invoice" ? " ✓" : ""}
            </button>
          </dd>
          <dt>Order</dt><dd style={{ color: "var(--gp-ck-text)" }}>{session.orderTitle || "Payment"}</dd>
          <dt>Amount</dt><dd style={{ color: "var(--gp-ck-text)" }}>{checkoutAmount(session.amount, session.currency)}</dd>
          {methodChosen && (
            <>
              <dt>Gateway</dt><dd style={{ color: "var(--gp-ck-text)" }}>{selectedMethod.name}</dd>
              <dt>Fees</dt><dd style={{ color: "var(--gp-ck-text)" }}>{feeLabel}</dd>
            </>
          )}
        </dl>
      )}

          {(whatsappHref || telHref || mailHref || tgHref || session.websiteUrl) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-accent-soft)", color: "var(--gp-ck-accent)" }}>WhatsApp</a>}
              {telHref && <a href={telHref} className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Call</a>}
              {mailHref && <a href={mailHref} className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Email</a>}
              {tgHref && <a href={tgHref} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Telegram</a>}
              {session.websiteUrl && <a href={session.websiteUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Website</a>}
            </div>
          )}
        {!demoMode && <button type="button" onClick={handleCancelCheckout} disabled={isCanceling} className="mt-3 text-xs text-[var(--gp-ck-muted)] underline underline-offset-4">{locale === "bn" ? "চেকআউট বাতিল করুন" : "Cancel checkout"}</button>}
      </aside>
      <div className="gp-payment-panel space-y-5">
        <header>
          <p className="gp-kicker">{methodChosen ? "02" : "01"} / 02</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{methodChosen ? (locale === "bn" ? selectedMethod.name + " দিয়ে পেমেন্ট" : "Pay with " + selectedMethod.name) : (locale === "bn" ? "পেমেন্ট পদ্ধতি বেছে নিন" : "Choose a payment method")}</h2>
          {!methodChosen && <p className="mt-1 text-sm text-[var(--gp-ck-muted)]">{locale === "bn" ? "প্রতিটি পদ্ধতির পাশে মোট প্রদেয় পরিমাণ দেখানো হয়েছে।" : "Each method shows the total you’ll pay."}</p>}
        </header>
        {session.productImageUrl && (
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-surface)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={session.productImageUrl} alt={session.orderTitle || "Product"} className="max-h-48 w-full object-cover" />
          </div>
        )}

        {(session.customFields?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--gp-ck-muted)" }}>Your details</label>
            {session.customFields!.map((field) => (
              <Input
                key={field.id}
                label={`${field.label}${field.required ? " *" : ""}`}
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                value={customFieldValues[field.id] || ""}
                onChange={(e) => setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))}
                placeholder={field.label}
              />
            ))}
          </div>
        )}

        {errorMessage && (
          <Alert variant="danger" title="Payment Error">{errorMessage}</Alert>
        )}

        {!methodChosen && [
          {label: locale === "bn" ? "মোবাইল ব্যাংকিং" : "Mobile banking", pool: mfsMethods},
          {label: locale === "bn" ? "ক্রিপ্টো" : "Crypto", pool: cryptoMethods},
          {label: locale === "bn" ? "অন্যান্য" : "Other methods", pool: otherMethods},
        ].filter(group => group.pool.length > 0).map(group => (
          <section key={group.label}>
            <h3 className="gp-kicker mb-2">{group.label}</h3>
            <div className="gp-method-list">
              {group.pool.map(method => (
                <button className="gp-method-row" type="button" key={method.gatewayId || method.code}
                  onClick={() => { setSelectedMethod(method); setMethodChosen(true); setTxidInput(""); setSenderNumber(""); setErrorMessage(null); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gatewayLogoPath(method.code)} alt="" width="48" height="32" />
                  <span className="min-w-0 flex-1 break-words text-left font-semibold">{method.name}</span>
                  <span className="text-xs tabular-nums text-[var(--gp-ck-muted)]">{checkoutAmount(method.payableAmount ?? session.amount, method.payableCurrency ?? method.currency)}</span>
                  <ArrowRight size={15} aria-hidden />
                </button>
              ))}
            </div>
          </section>
        ))}
        {methodChosen && <>
        <button type="button" onClick={() => { setMethodChosen(false); setErrorMessage(null); }} className="text-sm font-semibold text-[var(--gp-ck-accent)]">
          ← {locale === "bn" ? "অন্য পদ্ধতি বেছে নিন" : "Change payment method"}
        </button>
        <div className="space-y-5 rounded-2xl border p-5" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-surface)" }}>
          <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-elevated)" }}>
            <div>
              <span className="font-mono text-xs" style={{ color: "var(--gp-ck-muted)" }}>
                {locale === "bn" ? "পাঠানোর পরিমাণ" : "Exact amount to send"}
              </span>
              <div className="text-2xl font-semibold tracking-tight tabular-nums" style={{ color: "var(--gp-ck-text)" }}>
                {checkoutAmount(payableAmount, payableCurrency)}
              </div>
              {isCrypto && session.exchangeRateToUsd != null && (
                <span className="inline-flex mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  Order currency · {session.currency}
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                copyToClipboard(
                  String(payableAmount),
                  "amount"
                )
              }
              className="font-mono text-xs"
              leftIcon={
                copiedKey === "amount" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )
              }
            >
              {copiedKey === "amount" ? "Amount Copied!" : (locale === "bn" ? "পরিমাণ কপি করুন" : "Copy amount")}
            </Button>
          </div>

          {/* Receiving Destination Account / Wallet */}
          {selectedMethod.code !== "binance_pay" && (selectedMethod.depositAddressOrNumber ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[var(--gp-ck-text)]">
                  {selectedMethod.accountLabel ||
                    (isCrypto
                      ? "Receiving wallet address"
                      : "Receiving wallet number")}
                </label>
                <span className="text-[11px] font-mono text-[var(--gp-ck-muted)]">
                  {selectedMethod.code === "usdt_trc20"
                    ? "TRC-20 Network Only"
                    : (() => {
                        const t = String(
                          selectedMethod.accountType ?? "personal"
                        ).toLowerCase();
                        if (t === "agent") return "Cash Out only";
                        if (t === "payment") return "Payment only";
                        if (t === "merchant") return "Merchant payment";
                        return "Send Money";
                      })()}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 font-mono text-sm">
                <span className="select-all break-all text-zinc-900 dark:text-zinc-100 font-bold tracking-wider">
                  {selectedMethod.depositAddressOrNumber}
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copyToClipboard(selectedMethod.depositAddressOrNumber || "", "wallet")
                  }
                  className="shrink-0 text-xs font-mono"
                  leftIcon={
                    copiedKey === "wallet" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                >
                  {copiedKey === "wallet"
                    ? "Copied!"
                    : isCrypto
                    ? "Copy Address / UID"
                    : "Copy Number"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
              {demoMode ? "Practice checkout. Use the sample reference below." : "No receiving account is available for this method."}
            </div>
          ))}

          {/* Crypto QR (generated) or merchant static QR */}
          {selectedMethod.code !== "binance_pay" && (generatedQr || selectedMethod.qrImageUrl) && (
            <div className="space-y-2 text-center pt-1">
              <label className="block text-xs font-mono text-[var(--gp-ck-muted)]">
                {isCrypto
                  ? "Scan Wallet Address / UID QR"
                  : "Scan deposit QR code"}
              </label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedQr || selectedMethod.qrImageUrl || ""}
                alt="Payment QR"
                className="w-44 h-44 object-contain mx-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-2 shadow-xs"
              />
            </div>
          )}

          {/* Numbered Step-by-Step Instructions */}
          {selectedMethod.code !== "binance_pay" && <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--gp-ck-muted)] font-mono">
              {locale === "bn" ? "যেভাবে পেমেন্ট করবেন" : "Payment instructions"}
            </span>
            <ol className="text-xs text-[var(--gp-ck-muted)] leading-relaxed space-y-1.5 list-decimal pl-4">
              {instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>}

          {/* Verification Form */}
          <form onSubmit={handleVerifyPayment} className="space-y-4 pt-2">
            {selectedMethod.code === "binance_pay" ? (
              <p className="text-xs text-[var(--gp-ck-muted)] leading-relaxed">
                Clicking below initiates Binance Pay checkout. You will complete payment via Binance app, and this window will verify automatically.
              </p>
            ) : selectedMethod.code === "usdt_trc20" || selectedMethod.code === "bybit_pay" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[var(--gp-ck-text)]">
                  {selectedMethod.code === "usdt_trc20"
                    ? "Transaction Hash (TxID)"
                    : "Transaction Hash (TxID) / Bybit Order ID"}
                </label>
                <Input
                  placeholder={
                    selectedMethod.code === "usdt_trc20"
                      ? "Paste 64-character TRON transaction hash"
                      : "Paste Bybit transfer / order ID"
                  }
                  value={txidInput}
                  onChange={(e) => setTxidInput(e.target.value.trim())}
                  required
                />
              </div>
            ) : selectedMethod.requiresTxidInput ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label htmlFor="checkout-txid" className="block text-xs font-semibold text-[var(--gp-ck-text)]">
                    {locale === "bn" ? "লেনদেনের আইডি (TrxID)" : "Transaction ID (TrxID)"}
                  </label>
                  <Input id="checkout-txid"
                    placeholder={
                      selectedMethod.code === "bkash"
                        ? "e.g. BKH9948271"
                        : selectedMethod.code === "nagad"
                        ? "e.g. 7H8A9B2C"
                        : "Enter received Transaction ID"
                    }
                    value={txidInput}
                    onChange={(e) =>
                      setTxidInput(e.target.value.trim().toUpperCase())
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="checkout-payer" className="block text-xs font-semibold text-[var(--gp-ck-text)]">
                    {locale === "bn" ? "আপনার মোবাইল নম্বর (ঐচ্ছিক)" : "Your mobile number (optional)"}
                  </label>
                  <Input id="checkout-payer"
                    placeholder="e.g. 01XXXXXXXXX"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value.trim())}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            ) : smsAuto ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-200/70 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  Pay the exact amount to the number above. Confirmation is automatic via the merchant&apos;s
                  GressPay SMS listener — you do not need to paste a TrxID.
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="checkout-payer" className="block text-xs font-semibold text-[var(--gp-ck-text)]">
                    {locale === "bn" ? "যে নম্বর থেকে পেমেন্ট করেছেন" : "Phone number used for payment"}
                  </label>
                  <Input id="checkout-payer"
                    placeholder="e.g. 01XXXXXXXXX"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value.trim())}
                    required type="tel" className="font-mono text-xs"
                  />
                </div>
                <details className="text-xs text-[var(--gp-ck-muted)]">
                  <summary className="cursor-pointer font-semibold text-zinc-600 dark:text-zinc-300">
                    Advanced: enter TrxID manually
                  </summary>
                  <div className="mt-2">
                    <Input
                      placeholder="Optional Transaction ID"
                      value={txidInput}
                      onChange={(e) => setTxidInput(e.target.value.trim().toUpperCase())}
                    />
                  </div>
                </details>
              </div>
            ) : null}

            {demoMode && selectedMethod.code !== "binance_pay" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full font-mono text-xs"
                onClick={() => {
                  const sample =
                    DEMO_SAMPLE_TRX[selectedMethod.code] || "DEMO-SAMPLE-TRX";
                  setTxidInput(
                    selectedMethod.category === "mfs" ||
                      ["bkash", "nagad", "rocket", "upay", "cellfin"].includes(
                        selectedMethod.code
                      )
                      ? sample.toUpperCase()
                      : sample
                  );
                }}
              >
                {locale === "bn" ? "নমুনা TrxID ব্যবহার করুন" : "Use sample transaction ID"}
              </Button>
            )}

            {statusMessage && (
              <p className="text-xs text-[var(--gp-ck-text)] font-medium">
                {statusMessage}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              style={{ background: "var(--gp-ck-accent)", color: "var(--gp-ck-on-accent, #04110f)" }}
              isLoading={isVerifying}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isVerifying
                ? "Verifying…"
                : selectedMethod.code === "binance_pay"
                  ? "Open Binance Pay"
                  : smsAuto
                    ? locale === "bn"
                      ? "পেমেন্ট করে অপেক্ষা করুন"
                      : "I have paid — wait for SMS"
                    : locale === "bn" ? "পেমেন্ট যাচাই করুন" : "Verify payment"}
            </Button>
            {(selectedMethod.category === "mfs" ||
              ["bkash", "nagad", "rocket", "upay", "cellfin"].includes(selectedMethod.code)) && (
              <p className="text-center text-[11px]" style={{ color: "var(--gp-ck-muted)" }}>
                {smsAuto
                  ? "After sending money, wait here — GressPay matches the payment SMS automatically."
                  : "After sending money, paste the TrxID — we match it against the merchant SMS feed."}
              </p>
            )}
          </form>
        </div>
        </>}

        <div className="flex items-center justify-center gap-2 pt-1 text-[10px] tracking-wide" style={{ color: "var(--gp-ck-muted)" }}>
          <Lock className="h-3 w-3" style={{ color: "var(--gp-ck-accent)" }} />
          <span>Checkout by GressPay</span>
        </div>
      </div>
    </div>
  );
};
