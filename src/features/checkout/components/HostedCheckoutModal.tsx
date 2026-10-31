"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { PaymentMethod, CheckoutSession, TransactionStatus } from "@/lib/types/api";
import { formatCurrency } from "@/lib/formatters";
import { api } from "@/lib/api-client";
import { foldTxid } from "@/lib/method-theme";
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

type TabCategory = "mfs" | "crypto";

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

  // Group active merchant methods into clean tabs: Mobile Banking & Crypto
  const mfsMethods = useMemo(
    () =>
      methods.filter(
        (m) =>
          m.category === "mfs" ||
          ["bkash", "nagad", "rocket", "upay", "cellfin"].includes(m.code.toLowerCase())
      ),
    [methods]
  );

  const cryptoMethods = useMemo(
    () =>
      methods.filter(
        (m) =>
          m.category === "crypto" ||
          ["binance_pay", "bybit_pay", "usdt_trc20"].includes(m.code.toLowerCase())
      ),
    [methods]
  );

  const initialTab: TabCategory = mfsMethods.length > 0 ? "mfs" : "crypto";
  const [activeTab, setActiveTab] = useState<TabCategory>(initialTab);

  const currentTabMethods = activeTab === "mfs" ? mfsMethods : cryptoMethods;
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>(() => {
    return (
      (initialTab === "mfs" ? mfsMethods[0] : cryptoMethods[0]) || methods[0]
    );
  });

  // When activeTab changes, auto-select first method in that tab if not matching
  useEffect(() => {
    if (activeTab === "mfs" && mfsMethods.length > 0) {
      if (!selectedMethod || !mfsMethods.some((m) => m.code === selectedMethod.code)) {
        setSelectedMethod(mfsMethods[0]);
      }
    } else if (activeTab === "crypto" && cryptoMethods.length > 0) {
      if (!selectedMethod || !cryptoMethods.some((m) => m.code === selectedMethod.code)) {
        setSelectedMethod(cryptoMethods[0]);
      }
    }
  }, [activeTab, mfsMethods, cryptoMethods, selectedMethod]);

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
  const [generatedQr, setGeneratedQr] = useState<string | null>(null);
  const [locale, setLocale] = useState<"en" | "bn">("en");

  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!session.expiresAt) return 15 * 60;
    const diff = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          clearInterval(interval);
          setCheckoutStatus("EXPIRED");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [checkoutStatus]);

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
        const order = await api.createBinancePayOrder(session.sessionId);
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
        // Scenario B: Customer submitted TxID first, awaiting SMS from companion APK
        setStatusMessage("Verifying your Transaction ID automatically... Please wait");
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
    const isAgent = (method as unknown as { accountType?: string }).accountType === "agent";
    const action = isAgent ? "Cash In" : "Send Money";

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
        `Enter the copied recipient number (${receiver}) and the exact amount (${formatCurrency(payableAmount, payableCurrency)}).`,
        `Copy the Transaction ID (TrxID) from your confirmation SMS and paste it below.`,
      ];
    }

    if (code === "usdt_trc20") {
      return [
        `Open your crypto wallet (Trust Wallet, Binance, OKX, TronLink, etc.).`,
        `Select USDT and choose ONLY TRON (TRC-20) network.`,
        `Send exactly ${formatCurrency(payableAmount, payableCurrency)} USDT to the address above.`,
        `Copy the 64-character TRON Transaction Hash (TxID) and enter it below.`,
      ];
    }

    if (code === "bybit_pay") {
      return [
        `Open the Bybit app and navigate to Bybit Pay / Internal Transfer.`,
        `Transfer ${formatCurrency(payableAmount, payableCurrency)} to Binance Pay UID: ${receiver}.`,
        `Copy the Bybit Transfer / Order ID and paste it below.`,
      ];
    }

    return [
      `Send ${formatCurrency(payableAmount, payableCurrency)} to ${receiver}.`,
      `Save your payment receipt or Transaction ID.`,
      `Enter the Transaction ID below to verify your payment.`,
    ];
  };

  // 1. EXPIRED STATE
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
            onClick={() => window.location.reload()}
          >
            Restart Checkout
          </Button>
        </div>
      </div>
    );
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
              "Your Transaction ID is registered. Our Android companion APK is listening for incoming carrier SMS to auto-verify your transaction."}
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

    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-zinc-950 text-white dark:bg-white dark:text-zinc-950 flex items-center justify-center mx-auto shadow-md">
          <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
            Payment Successful!
          </span>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight pt-1">
            {formatCurrency(payableAmount, payableCurrency)}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Successfully credited to{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {session.merchantName}
            </span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-left font-mono text-xs space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span>Transaction ID</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold break-all ml-4">
              {txidInput || session.sessionId}
            </span>
          </div>
          <div className="flex justify-between items-center text-zinc-500">
            <span>Payment Method</span>
            <span className="text-zinc-900 dark:text-zinc-100">{selectedMethod?.name || "—"}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-500">
            <span>Order Reference</span>
            <span className="text-zinc-900 dark:text-zinc-100">{session.sessionId}</span>
          </div>
        </div>

        {returnTarget && redirectCountdown > 0 ? (
          <p className="text-xs text-zinc-500 font-mono">
            Redirecting to store in{" "}
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {redirectCountdown}s
            </span>
            …
          </p>
        ) : null}

        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold"
            onClick={() => {
              if (returnTarget) {
                window.location.href = returnTarget;
              } else if (window.opener) {
                window.close();
              } else {
                window.location.href = "/";
              }
            }}
          >
            {returnTarget ? "Return to store" : "Close Checkout"}
          </Button>
        </div>
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
          The seller has not enabled any active payment methods for this checkout.
        </p>
      </div>
    );
  }

  const instructions = getInstructions(selectedMethod);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden transition-all">
      {/* Merchant Header */}
      <div className="p-5 sm:p-6 bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          {session.merchantLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.merchantLogo}
              alt={session.merchantName}
              className="w-12 h-12 rounded-2xl object-contain bg-white border border-zinc-200 dark:border-zinc-700 shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center font-bold text-base shrink-0 shadow-sm">
              {session.merchantName ? session.merchantName.slice(0, 2).toUpperCase() : "GP"}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {session.merchantName}
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
              {locale === "bn" ? "ইনভয়েস" : "Invoice ID"}:{" "}
              <button
                type="button"
                className="font-mono text-[10px] text-zinc-700 dark:text-zinc-300 underline-offset-2 hover:underline"
                onClick={() => copyToClipboard(session.sessionId, "invoice")}
              >
                {session.sessionId.slice(0, 8)}…{session.sessionId.slice(-6)}
              </button>
              {copiedKey === "invoice" ? (
                <Check className="inline w-3 h-3 ml-1 text-emerald-500" />
              ) : (
                <Copy className="inline w-3 h-3 ml-1 text-zinc-400" />
              )}
            </p>
          </div>
        </div>

        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200 dark:border-zinc-800 gap-2">
          <div className="flex rounded-lg border border-zinc-200 dark:border-zinc-700 overflow-hidden text-[10px] font-bold">
            <button
              type="button"
              onClick={() => setLocale("bn")}
              className={`px-2 py-1 ${locale === "bn" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-500"}`}
            >
              বাংলা
            </button>
            <button
              type="button"
              onClick={() => setLocale("en")}
              className={`px-2 py-1 ${locale === "en" ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-950" : "text-zinc-500"}`}
            >
              Eng
            </button>
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {formatCurrency(payableAmount, payableCurrency)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 mt-0.5">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>Expires in {timeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Security & Non-Custodial Strip */}
      <div className="px-5 sm:px-6 py-2 bg-zinc-100/70 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
          <span>Direct-to-Wallet · Non-Custodial Automated Verification</span>
        </div>
        <span className="hidden sm:inline font-mono text-[11px] text-zinc-400">
          REF: {session.sessionId.slice(-8).toUpperCase()}
        </span>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {session.productImageUrl && (
          <div className="rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={session.productImageUrl}
              alt={session.orderTitle || "Product"}
              className="w-full max-h-48 object-cover"
            />
          </div>
        )}

        {(session.customFields?.length ?? 0) > 0 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              Your details
            </label>
            {session.customFields!.map((field) => (
              <Input
                key={field.id}
                label={`${field.label}${field.required ? " *" : ""}`}
                type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : "text"}
                value={customFieldValues[field.id] || ""}
                onChange={(e) =>
                  setCustomFieldValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                }
                placeholder={field.label}
              />
            ))}
          </div>
        )}

        {errorMessage && (
          <Alert variant="danger" title="Payment Error">
            {errorMessage}
          </Alert>
        )}

        {/* Category Tabs: Mobile Banking vs Crypto */}
        {(mfsMethods.length > 0 && cryptoMethods.length > 0) && (
          <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setActiveTab("mfs")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "mfs"
                  ? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Banking ({mfsMethods.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("crypto")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "crypto"
                  ? "bg-white text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100 shadow-xs"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Crypto Payment ({cryptoMethods.length})</span>
            </button>
          </div>
        )}

        {/* Payment Rails Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
            Select Payment Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {currentTabMethods.map((method) => {
              const isSelected =
                (method.gatewayId && selectedMethod.gatewayId === method.gatewayId) ||
                (!method.gatewayId && selectedMethod.code === method.code && !selectedMethod.gatewayId);

              const methodIconUrl = `/methods/${method.code.toLowerCase()}.svg`;

              return (
                <button
                  key={method.gatewayId || method.code}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method);
                    setTxidInput("");
                    setErrorMessage(null);
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900 shadow-xs ring-1 ring-zinc-900 dark:ring-zinc-100"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={methodIconUrl}
                        alt={method.name}
                        className="w-5 h-5 object-contain shrink-0"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {method.name}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100 stroke-[3] shrink-0" />
                    )}
                  </div>

                  <div className="text-[11px] text-zinc-500 font-mono mt-3 flex items-center justify-between">
                    <span>{method.currency}</span>
                    <span>0% Fee</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Transfer & Verification Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 space-y-5">
          {/* Payable Amount Highlight with Copy Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
            <div>
              <span className="text-xs text-zinc-500 font-mono">
                {activeTab === "crypto" ? "Exact USDT Amount" : "Exact BDT Amount"}
              </span>
              <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {formatCurrency(payableAmount, payableCurrency)}
              </div>
              {activeTab === "crypto" && session.exchangeRateToUsd != null && (
                <span className="inline-flex mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                  Live rate badge · order {session.currency}
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
                    : (selectedMethod as unknown as { accountType?: string }).accountType === "agent"
                    ? "Cash In Only"
                    : "Send Money Only"}
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
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-semibold"
              isLoading={isVerifying}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isVerifying
                ? "Checking Settlement Ledger…"
                : selectedMethod.code === "binance_pay"
                ? "Open Binance Pay Checkout"
                : activeTab === "crypto"
                ? "Verify Crypto Payment"
                : "Verify Payment"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
