"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { PaymentMethod, CheckoutSession, TransactionStatus, Currency } from "@/lib/types/api";
import { formatCurrency } from "@/lib/formatters";
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
  Smartphone,
  Layers,
  RefreshCw,
} from "lucide-react";

export interface HostedCheckoutModalProps {
  session: CheckoutSession;
  /** Marketing / sandbox demo: no live API calls; sample TrxID completes locally. */
  demoMode?: boolean;
}

type TabCategory = "mfs" | "crypto" | "other";

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

  const initialTab: TabCategory =
    mfsMethods.length > 0 ? "mfs" : cryptoMethods.length > 0 ? "crypto" : "other";
  const [activeTab, setActiveTab] = useState<TabCategory>(initialTab);

  const currentTabMethods =
    activeTab === "mfs" ? mfsMethods : activeTab === "crypto" ? cryptoMethods : otherMethods;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>(() => {
    return (
      (initialTab === "mfs"
        ? mfsMethods[0]
        : initialTab === "crypto"
          ? cryptoMethods[0]
          : otherMethods[0]) || methods[0]
    );
  });

  // When activeTab changes, auto-select first method in that tab if not matching
  useEffect(() => {
    const pool =
      activeTab === "mfs" ? mfsMethods : activeTab === "crypto" ? cryptoMethods : otherMethods;
    if (pool.length === 0) return;
    const key = (m: PaymentMethod) => m.gatewayId || m.code;
    if (!selectedMethod || !pool.some((m) => key(m) === key(selectedMethod))) {
      setSelectedMethod(pool[0]);
    }
  }, [activeTab, mfsMethods, cryptoMethods, otherMethods, selectedMethod]);

  const [methodChosen, setMethodChosen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [txidInput, setTxidInput] = useState<string>("");
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
  const [checkoutStatus, setCheckoutStatus] = useState<TransactionStatus>("PENDING");
  const [isPollingVerification, setIsPollingVerification] = useState(false);
  const [pollingSeconds, setPollingSeconds] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(4);
  const [cancelRedirectSec, setCancelRedirectSec] = useState(2);
  const [cancelRedirectUrl, setCancelRedirectUrl] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  const [locale, setLocale] = useState<"en" | "bn">("en");
  const checkoutAmount = (amount: number, currency: Currency) => locale === "en"
    ? `${amount.toLocaleString("en-US", {minimumFractionDigits: 2, maximumFractionDigits: currency === "USDT" ? 4 : 2})} ${currency}`
    : formatCurrency(amount, currency);

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
        setGeneratedQr(null);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(dest, {
          width: 200,
          margin: 1,
          color: { dark: "#09090b", light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setGeneratedQr(dataUrl);
      } catch {
        if (!cancelled) setGeneratedQr(null);
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
      checkoutStatus === "FAILED"
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
              } else if (res.status === "EXPIRED") {
                setCheckoutStatus("EXPIRED");
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
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
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

        if (res.status === "FAILED" || res.status === "EXPIRED") {
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
          "Verification is taking longer than usual. If your money was deducted, our Android companion APK will reconcile it automatically."
        );
      }
    }, 3000);
  };

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
      !selectedMethod.depositAddressOrNumber
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
      } else {
        setStatusMessage(
          smsAuto && !cleanTrx
            ? "Waiting for Companion SMS confirmation… Please keep this page open."
            : "Verifying your Transaction ID automatically... Please wait"
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
    const code = method.code.toLowerCase();
    const receiver = method.depositAddressOrNumber || "the number above";
    const accountType = String(method.accountType ?? "personal").toLowerCase();
    const isAgent = accountType === "agent";
    const isPayment = accountType === "payment";
    const isBusiness = accountType === "merchant";
    const action = isAgent
      ? "Cash Out"
      : isPayment
        ? "Payment"
        : isBusiness
          ? "Business payment"
          : "Send Money / Cash In";

    let ussd = "";
    let methodName = method.name || "Mobile Banking";
    if (code === "bkash") {
      ussd = " or dial *247#";
      methodName = "bKash";
    } else if (code === "nagad") {
      ussd = " or dial *167#";
      methodName = "Nagad";
    } else if (code === "rocket") {
      ussd = " or dial *322#";
      methodName = "Rocket";
    } else if (code === "upay") {
      ussd = " or dial *268#";
      methodName = "Upay";
    } else if (code === "cellfin") {
      methodName = "Cellfin";
    }

    if (["bkash", "nagad", "rocket", "upay", "cellfin"].includes(code)) {
      return [
        `Open your ${methodName} App${ussd}.`,
        `Choose "${action}" option.`,
        `Enter the copied recipient number (${receiver}) and the exact amount (${checkoutAmount(payableAmount, payableCurrency)}).`,
        `Copy the Transaction ID (TrxID) from your confirmation SMS and paste it below.`,
      ];
    }

    if (code === "usdt_trc20") {
      return [
        `Open your crypto wallet (Trust Wallet, Binance, OKX, TronLink, etc.).`,
        `Select USDT and choose ONLY TRON (TRC-20) network.`,
        `Send exactly ${checkoutAmount(payableAmount, payableCurrency)} USDT to the address above.`,
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

  if (secondsLeft === 0 && checkoutStatus !== "COMPLETED" && checkoutStatus !== "FAILED") {
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
            Auto-Verifying Payment
          </span>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 pt-2">
            Verifying your Transaction ID automatically... Please wait
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {statusMessage ||
              "Your Transaction ID is registered. The merchant GressPay app is listening for incoming carrier SMS to auto-verify your payment."}
          </p>
        </div>

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
    const returnTarget = session.returnUrl;
    const doneTheme = session.checkoutTheme || "default";
    const doneThemeClass =
      doneTheme === "luxury" ? "gp-theme-luxury" : doneTheme === "minimal" ? "gp-theme-minimal" : "gp-theme-default";

    return (
      <div className={`gp-checkout-card mx-auto w-full max-w-lg overflow-hidden p-8 text-center space-y-5 ${doneThemeClass}`}>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl" style={{ background: "var(--gp-ck-accent)", color: "#04110f" }}>
          <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
        </div>
        {session.merchantLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.merchantLogo} alt="" className="mx-auto h-10 w-10 rounded-xl object-contain bg-white/90 p-1" />
        ) : null}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: "var(--gp-ck-accent)" }}>
            Payment successful
          </p>
          <h2 className="pt-1 text-3xl font-bold tracking-tight" style={{ color: "var(--gp-ck-text)" }}>
            {checkoutAmount(payableAmount, payableCurrency)}
          </h2>
          <p className="text-xs" style={{ color: "var(--gp-ck-muted)" }}>
            Settled to <span className="font-semibold" style={{ color: "var(--gp-ck-text)" }}>{session.merchantName}</span>
          </p>
        </div>
        <div className="space-y-2 rounded-2xl border p-4 text-left font-mono text-xs" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-surface)" }}>
          <div className="flex items-center justify-between gap-3" style={{ color: "var(--gp-ck-muted)" }}>
            <span>TrxID</span>
            <span className="break-all text-right font-semibold" style={{ color: "var(--gp-ck-text)" }}>{txidInput || "—"}</span>
          </div>
          <div className="flex items-center justify-between" style={{ color: "var(--gp-ck-muted)" }}>
            <span>Method</span>
            <span style={{ color: "var(--gp-ck-text)" }}>{selectedMethod?.name || "—"}</span>
          </div>
        </div>
        {returnTarget && redirectCountdown > 0 ? (
          <p className="font-mono text-xs" style={{ color: "var(--gp-ck-muted)" }}>
            Returning in <span className="font-bold" style={{ color: "var(--gp-ck-text)" }}>{redirectCountdown}s</span>…
          </p>
        ) : null}
        <Button
          variant="primary"
          size="lg"
          className="w-full font-semibold"
          style={{ background: "var(--gp-ck-accent)", color: "#04110f" }}
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
          No Payment Rails Available
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
          No live-ready gateways for this brand yet. The business must finish setup under Payment Gateways
          (wallet number / Binance API keys / Companion device) and keep the rails enabled.
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
    <div className={`gp-checkout-card mx-auto w-full max-w-md overflow-hidden transition-all sm:max-w-lg ${themeClass}`}>
      {/* Merchant-first hero */}
      <div className="gp-checkout-hero relative px-5 pb-5 pt-5 sm:px-6 sm:pt-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold" style={{ color: "var(--gp-ck-muted)" }}>
            <Lock className="h-3.5 w-3.5" style={{ color: "var(--gp-ck-accent)" }} />
            {locale === "bn" ? "নিরাপদ পেমেন্ট" : "Secure payment"}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border text-[10px] font-bold" style={{ borderColor: "var(--gp-ck-border)" }}>
              <button type="button" onClick={() => setLocale("bn")} className="px-2 py-1" style={locale === "bn" ? { background: "var(--gp-ck-accent)", color: "#04110f" } : { color: "var(--gp-ck-muted)" }}>BN</button>
              <button type="button" onClick={() => setLocale("en")} className="px-2 py-1" style={locale === "en" ? { background: "var(--gp-ck-accent)", color: "#04110f" } : { color: "var(--gp-ck-muted)" }}>EN</button>
            </div>
            {!demoMode && (
              <button type="button" aria-label="Cancel" onClick={handleCancelCheckout} disabled={isCanceling} className="text-lg leading-none opacity-60 hover:opacity-100" style={{ color: "var(--gp-ck-muted)" }}>×</button>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center text-center">
          {session.merchantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={session.merchantLogo} alt={session.merchantName} className="mb-3 h-16 w-16 rounded-2xl object-contain bg-white p-1.5 shadow-md" />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl text-lg font-bold shadow-md" style={{ background: "var(--gp-ck-accent)", color: "#04110f" }}>
              {session.merchantName ? session.merchantName.slice(0, 2).toUpperCase() : "GP"}
            </div>
          )}
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-lg font-bold tracking-tight sm:text-xl" style={{ color: "var(--gp-ck-text)" }}>{session.merchantName}</h1>
            {session.merchantVerified && <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />}
          </div>
          {session.orderTitle && (
            <p className="mt-1 max-w-sm text-xs" style={{ color: "var(--gp-ck-muted)" }}>{session.orderTitle}</p>
          )}
          <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl" style={{ color: "var(--gp-ck-text)" }}>
            {methodChosen ? checkoutAmount(payableAmount, payableCurrency) : checkoutAmount(session.amount, session.currency)}
          </p>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px]" style={{ color: "var(--gp-ck-muted)" }}>
            <Clock className="h-3.5 w-3.5" />
            <span>{locale === "bn" ? "মেয়াদ" : "Expires"} {timeFormatted}</span>
          </div>
          <button type="button" onClick={() => setDetailsOpen(!detailsOpen)} aria-expanded={detailsOpen} className="mt-3 text-[11px] font-semibold underline-offset-2 hover:underline" style={{ color: "var(--gp-ck-accent)" }}>
            {detailsOpen ? (locale === "bn" ? "বিবরণ লুকান" : "Hide details") : (locale === "bn" ? "বিবরণ দেখুন" : "View details")}
          </button>
          {(whatsappHref || telHref || mailHref || tgHref || session.websiteUrl) && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
              {whatsappHref && <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-accent-soft)", color: "var(--gp-ck-accent)" }}>WhatsApp</a>}
              {telHref && <a href={telHref} className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Call</a>}
              {mailHref && <a href={mailHref} className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Email</a>}
              {tgHref && <a href={tgHref} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Telegram</a>}
              {session.websiteUrl && <a href={session.websiteUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg px-2 py-1 text-[10px] font-semibold" style={{ background: "var(--gp-ck-surface)", color: "var(--gp-ck-muted)" }}>Website</a>}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <div className="gp-checkout-step" data-active={!methodChosen}>
            <span className="gp-checkout-step-dot">1</span>
            {locale === "bn" ? "পদ্ধতি" : "Method"}
          </div>
          <div className="h-px w-6" style={{ background: "var(--gp-ck-border)" }} />
          <div className="gp-checkout-step" data-active={methodChosen && checkoutStatus !== "COMPLETED"}>
            <span className="gp-checkout-step-dot">2</span>
            {locale === "bn" ? "পেমেন্ট" : "Pay"}
          </div>
          <div className="h-px w-6" style={{ background: "var(--gp-ck-border)" }} />
          <div className="gp-checkout-step" data-active={false}>
            <span className="gp-checkout-step-dot">3</span>
            {locale === "bn" ? "নিশ্চিত" : "Confirm"}
          </div>
        </div>
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

      <div className="space-y-5 p-5 sm:p-6" style={{ background: "var(--gp-ck-bg)" }}>
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

        {!methodChosen && <>
        {([mfsMethods, cryptoMethods, otherMethods].filter((g) => g.length > 0).length > 1) && (
          <div className="flex flex-wrap gap-1 rounded-xl border p-1" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-surface)" }}>
            {mfsMethods.length > 0 && (
              <button type="button" onClick={() => setActiveTab("mfs")} className="flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all" style={activeTab === "mfs" ? { background: "var(--gp-ck-accent)", color: "#04110f" } : { color: "var(--gp-ck-muted)" }}>
                <Smartphone className="h-3.5 w-3.5" /> MFS ({mfsMethods.length})
              </button>
            )}
            {cryptoMethods.length > 0 && (
              <button type="button" onClick={() => setActiveTab("crypto")} className="flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all" style={activeTab === "crypto" ? { background: "var(--gp-ck-accent)", color: "#04110f" } : { color: "var(--gp-ck-muted)" }}>
                <Layers className="h-3.5 w-3.5" /> Crypto ({cryptoMethods.length})
              </button>
            )}
            {otherMethods.length > 0 && (
              <button type="button" onClick={() => setActiveTab("other")} className="flex min-w-[110px] flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all" style={activeTab === "other" ? { background: "var(--gp-ck-accent)", color: "#04110f" } : { color: "var(--gp-ck-muted)" }}>
                Other ({otherMethods.length})
              </button>
            )}
          </div>
        )}

        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--gp-ck-muted)" }}>
            {locale === "bn" ? "পেমেন্ট পদ্ধতি বেছে নিন" : "Choose how to pay"}
          </p>
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
            {currentTabMethods.map((method) => {
              const methodIconUrl = gatewayLogoPath(method.code);
              return (
                <button
                  key={method.gatewayId || method.code}
                  type="button"
                  className="gp-method-tile flex cursor-pointer flex-col justify-between"
                  onClick={() => {
                    setSelectedMethod(method);
                    setMethodChosen(true);
                    setTxidInput("");
                    setErrorMessage(null);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={methodIconUrl}
                      alt={method.name}
                      className="h-11 w-14 shrink-0 rounded-xl bg-white object-contain p-1"
                      onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                    />
                    <span className="text-sm font-semibold" style={{ color: "var(--gp-ck-text)" }}>{method.name}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[11px]" style={{ color: "var(--gp-ck-muted)" }}>
                    <span>{method.currency}</span>
                    <span>
                      {(() => {
                        const pct = Number(method.feePercentage || 0);
                        const fixed = Number(method.fixedFee || 0);
                        const bf = Number(session.brandFee || 0);
                        if (pct <= 0 && fixed <= 0 && bf <= 0) return "No fee";
                        const bits: string[] = [];
                        if (pct > 0) bits.push(`${pct}%`);
                        if (fixed > 0) bits.push(`${fixed}`);
                        if (bf > 0) bits.push("fee");
                        return bits.join("+");
                      })()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        </>}
        {methodChosen && <>
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={() => { setMethodChosen(false); setErrorMessage(null); }} className="text-xs font-semibold" style={{ color: "var(--gp-ck-accent)" }}>
            ← {locale === "bn" ? "পদ্ধতি" : "Methods"}
          </button>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gatewayLogoPath(selectedMethod.code)} alt="" className="h-8 w-8 object-contain" />
            <div className="text-right">
              <h2 className="text-sm font-semibold" style={{ color: "var(--gp-ck-text)" }}>{selectedMethod.name}</h2>
              <p className="text-[11px]" style={{ color: "var(--gp-ck-muted)" }}>{locale === "bn" ? "নির্দেশনা অনুসরণ করুন" : "Follow the steps below"}</p>
            </div>
          </div>
        </div>
        <div className="space-y-5 rounded-2xl border p-5" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-surface)" }}>
          <div className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center" style={{ borderColor: "var(--gp-ck-border)", background: "var(--gp-ck-elevated)" }}>
            <div>
              <span className="font-mono text-xs" style={{ color: "var(--gp-ck-muted)" }}>
                {activeTab === "crypto" ? "Exact USDT amount" : "Exact amount to send"}
              </span>
              <div className="text-2xl font-semibold tracking-tight tabular-nums" style={{ color: "var(--gp-ck-text)" }}>
                {checkoutAmount(payableAmount, payableCurrency)}
              </div>
              {activeTab === "crypto" && session.exchangeRateToUsd != null && (
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
              {copiedKey === "amount" ? "Amount Copied!" : "Copy Amount"}
            </Button>
          </div>

          {/* Receiving Destination Account / Wallet */}
          {selectedMethod.depositAddressOrNumber ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {selectedMethod.accountLabel ||
                    (activeTab === "crypto"
                      ? "Receiving wallet address"
                      : "Receiving wallet number")}
                </label>
                <span className="text-[11px] font-mono text-zinc-500">
                  {selectedMethod.code === "usdt_trc20"
                    ? "TRC-20 Network Only"
                    : (() => {
                        const t = String(
                          selectedMethod.accountType ?? "personal"
                        ).toLowerCase();
                        if (t === "agent") return "Cash Out only";
                        if (t === "payment") return "Payment only";
                        if (t === "merchant") return "API key + secret";
                        return "Send Money / Cash In";
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
                    : activeTab === "crypto"
                    ? "Copy Address / UID"
                    : "Copy Number"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-300">
              Receiving destination wallet is configured by the seller for this checkout.
            </div>
          )}

          {/* Crypto QR (generated) or merchant static QR */}
          {(generatedQr || selectedMethod.qrImageUrl) && (
            <div className="space-y-2 text-center pt-1">
              <label className="block text-xs font-mono text-zinc-500">
                {activeTab === "crypto"
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
          <div className="space-y-2 pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
              Step-by-Step Payment Instructions
            </span>
            <ol className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-1.5 list-decimal pl-4">
              {instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          {/* Verification Form */}
          <form onSubmit={handleVerifyPayment} className="space-y-4 pt-2">
            {selectedMethod.code === "binance_pay" ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Clicking below initiates Binance Pay checkout. You will complete payment via Binance app, and this window will verify automatically.
              </p>
            ) : selectedMethod.code === "usdt_trc20" || selectedMethod.code === "bybit_pay" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Carrier Transaction ID (TrxID)
                  </label>
                  <Input
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Your Mobile Number (Optional)
                  </label>
                  <Input
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Phone number used for payment
                  </label>
                  <Input
                    placeholder="e.g. 01XXXXXXXXX"
                    value={senderNumber}
                    onChange={(e) => setSenderNumber(e.target.value.trim())}
                    required type="tel" className="font-mono text-xs"
                  />
                </div>
                <details className="text-xs text-zinc-500">
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
                Use One-Click Sample TrxID
              </Button>
            )}

            {statusMessage && (
              <p className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                {statusMessage}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              style={{ background: "var(--gp-ck-accent)", color: "#04110f" }}
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
                    : `Confirm ${checkoutAmount(payableAmount, payableCurrency)}`}
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
          <span>Non-custodial verification · Secured by GressPay</span>
        </div>
      </div>
    </div>
  );
};
