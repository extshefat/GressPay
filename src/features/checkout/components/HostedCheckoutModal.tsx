"use client";

import React, { useState, useEffect, useRef } from "react";
import { PaymentMethod, CheckoutSession, TransactionStatus } from "@/lib/types/api";
import { formatCurrency } from "@/lib/formatters";
import { api } from "@/lib/api-client";
import { railTheme, foldTxid } from "@/lib/method-theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { CopyField } from "@/components/ui/copy-field";
import {
  ShieldCheck,
  Clock,
  Copy,
  Check,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Lock,
  ExternalLink,
  Smartphone,
  Layers,
} from "lucide-react";

export interface HostedCheckoutModalProps {
  session: CheckoutSession;
}

const COUNTRY_CONFIG: Record<string, { label: string; flag: string }> = {
  BD: { label: "Bangladesh (bKash / Nagad)", flag: "BD" },
  GLOBAL: { label: "USDT Crypto", flag: "USDT" },
};

export const HostedCheckoutModal: React.FC<HostedCheckoutModalProps> = ({ session }) => {
  const methods = session.availableMethods || [];
  const availableCountries = Array.from(new Set(methods.map((m) => m.country)));
  const initialCountry = availableCountries[0] || "BD";

  const [selectedCountry, setSelectedCountry] = useState<string>(initialCountry);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | undefined>(
    methods.find((m) => m.country === initialCountry) || methods[0]
  );
  const [txidInput, setTxidInput] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<TransactionStatus>("PENDING");
  const [awaitingEvidence, setAwaitingEvidence] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    if (!session.expiresAt) return 15 * 60;
    const diff = Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const payableAmount = selectedMethod?.payableAmount ?? session.amount;
  const payableCurrency =
    selectedMethod?.payableCurrency ?? selectedMethod?.currency ?? session.currency;

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

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const filteredMethods = methods.filter((m) => m.country === selectedCountry);

  const startStatusPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    pollingRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const res = await api.getCheckoutStatus(session.sessionId);
        if (res.status === "COMPLETED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsVerifying(false);
          setAwaitingEvidence(false);
          setCheckoutStatus("COMPLETED");
          if (res.redirectUrl) {
            window.location.href = res.redirectUrl;
          }
        } else if (res.status === "FAILED" || res.status === "EXPIRED") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setIsVerifying(false);
          setCheckoutStatus(res.status);
        }
      } catch {
        // Retry
      }
      if (attempts >= 40) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsVerifying(false);
        setErrorMessage(
          "Still awaiting carrier SMS confirmation. Please keep this window open or verify your TxID."
        );
      }
    }, 3000);
  };

  const handleVerifyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!selectedMethod) {
      setErrorMessage("No payment method is selected.");
      return;
    }
    if (
      selectedMethod.code !== "binance_pay" &&
      !selectedMethod.depositAddressOrNumber
    ) {
      setErrorMessage("This merchant has not saved a receiving wallet address for this rail.");
      return;
    }

    const trx = foldTxid(selectedMethod, txidInput);
    if (
      selectedMethod.code !== "binance_pay" &&
      selectedMethod.requiresTxidInput &&
      !trx
    ) {
      setErrorMessage(selectedMethod.trxHint || "Please enter the Transaction ID.");
      return;
    }

    setIsVerifying(true);
    try {
      if (selectedMethod.code === "binance_pay") {
        const order = await api.createBinancePayOrder(session.sessionId);
        if (order.checkoutUrl) {
          window.open(order.checkoutUrl, "_blank", "noopener,noreferrer");
        }
        setAwaitingEvidence(true);
        setStatusMessage(
          order.liveReady === false
            ? order.message ||
                "Binance Pay is not live-configured in sandbox. Server is monitoring order status."
            : "Complete payment in the Binance app or browser. Page will confirm automatically upon settlement."
        );
        setIsVerifying(false);
        startStatusPolling();
        return;
      }

      const res = await api.verifyCheckout(
        session.sessionId,
        trx,
        selectedMethod.code,
        selectedMethod.gatewayId
      );
      if (res.status === "COMPLETED") {
        setIsVerifying(false);
        setCheckoutStatus("COMPLETED");
        if (res.redirectUrl) {
          window.location.href = res.redirectUrl;
        }
      } else {
        setAwaitingEvidence(true);
        setStatusMessage(
          selectedMethod.code === "usdt_trc20"
            ? "Waiting for TRON on-chain block confirmations. Verification requires 20 confirmed blocks."
            : "Payment details recorded. Awaiting real-time Android companion SMS verification match."
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

  // 1. EXPIRED STATE
  if (checkoutStatus === "EXPIRED") {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-rose-200 dark:border-rose-900/60 rounded-3xl shadow-xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
          <Clock className="w-7 h-7" />
        </div>
        <Badge variant="rose" size="md">
          Session Expired
        </Badge>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Checkout Window Ended
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
          This payment session has timed out for security. Please request a new checkout link or invoice from the merchant.
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

  // 2. AWAITING VERIFICATION / PENDING EVIDENCE
  if (awaitingEvidence && checkoutStatus === "PENDING") {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-amber-200 dark:border-amber-900/50 rounded-3xl shadow-xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-center mx-auto text-amber-600 dark:text-amber-400">
          <Clock className="w-7 h-7 animate-pulse" />
        </div>
        <Badge variant="amber" size="md" dot>
          Verification in Progress
        </Badge>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Awaiting Carrier Confirmation
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
          {statusMessage ||
            "Your Transaction ID was recorded. Live payments settle strictly upon carrier SMS match or on-chain verification."}
        </p>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-left font-mono text-xs space-y-2">
          <div className="flex justify-between text-zinc-500">
            <span>Submitted TxID</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold break-all text-right ml-3">
              {txidInput || "—"}
            </span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Payment Rail</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">
              {selectedMethod?.name || "—"}
            </span>
          </div>
        </div>

        <p className="text-[11px] font-mono text-zinc-400">
          Listening for matching evidence • Do not refresh this page
        </p>
      </div>
    );
  }

  // 3. COMPLETED PAYMENT
  if (checkoutStatus === "COMPLETED") {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-emerald-200 dark:border-emerald-900/60 rounded-3xl shadow-xl p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <Badge variant="emerald" size="md" dot>
          Payment Confirmed
        </Badge>
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {formatCurrency(payableAmount, payableCurrency)} Paid
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Settled to merchant:{" "}
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
            {session.merchantName}
          </span>
        </p>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-left font-mono text-xs space-y-2">
          <div className="flex justify-between text-zinc-500">
            <span>Transaction ID</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-semibold break-all ml-4">
              {txidInput || "—"}
            </span>
          </div>
          <div className="flex justify-between text-zinc-500">
            <span>Settled Rail</span>
            <span className="text-zinc-900 dark:text-zinc-100">{selectedMethod?.name || "—"}</span>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => {
              if (window.opener) window.close();
              else window.location.href = "/";
            }}
          >
            Done
          </Button>
        </div>
      </div>
    );
  }

  // 4. EMPTY RAILS STATE
  if (!methods.length || !selectedMethod) {
    return (
      <div className="w-full max-w-lg mx-auto bg-white dark:bg-zinc-950 border border-amber-200 dark:border-amber-900/50 rounded-3xl shadow-xl p-8 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          No Payment Rails Configured
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The merchant has not yet configured receiving wallet numbers or API credentials for this store.
        </p>
      </div>
    );
  }

  const steps =
    selectedMethod.instructionSteps && selectedMethod.instructionSteps.length > 0
      ? selectedMethod.instructionSteps
      : selectedMethod.instructions
      ? [{ text: selectedMethod.instructions }]
      : [];

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden transition-all">
      {/* Merchant Header */}
      <div className="p-5 sm:p-6 bg-zinc-50/70 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-[#077C74] dark:text-[#1BD1C0] shrink-0 shadow-2xs">
            {session.merchantName ? session.merchantName.slice(0, 2).toUpperCase() : "GP"}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {session.merchantName}
              </span>
              {session.merchantVerified && (
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
              {session.orderTitle || "Order Checkout"}
            </p>
          </div>
        </div>

        <div className="text-right flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-200 dark:border-zinc-800">
          <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {formatCurrency(session.amount, session.currency)}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
            <span>Expires in {timeFormatted}</span>
          </div>
        </div>
      </div>

      {/* Security strip */}
      <div className="px-5 sm:px-6 py-2.5 bg-teal-50/50 dark:bg-zinc-900/30 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
        <Lock className="w-3.5 h-3.5 text-[#077C74] dark:text-[#1BD1C0]" />
        <span>End-to-End Encrypted Settlement • Amount Locked</span>
      </div>

      {/* Main Body */}
      <div className="p-5 sm:p-6 space-y-6">
        {errorMessage && (
          <Alert variant="danger" title="Payment Notice">
            {errorMessage}
          </Alert>
        )}

        {/* Region Pills if multiple countries */}
        {availableCountries.length > 1 && (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
              Select Region
            </label>
            <div className="flex flex-wrap gap-2">
              {availableCountries.map((cCode) => {
                const conf = COUNTRY_CONFIG[cCode] || { label: cCode, flag: "" };
                const isSelected = selectedCountry === cCode;

                return (
                  <button
                    key={cCode}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(cCode);
                      const firstOfCountry = methods.find((m) => m.country === cCode);
                      if (firstOfCountry) {
                        setSelectedMethod(firstOfCountry);
                        setTxidInput("");
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950 shadow-xs"
                        : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
                    }`}
                  >
                    <span>{conf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Rails Grid */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider font-mono">
            Payment Method
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredMethods.map((method) => {
              const isSelected =
                (method.gatewayId && selectedMethod.gatewayId === method.gatewayId) ||
                (!method.gatewayId && selectedMethod.code === method.code && !selectedMethod.gatewayId);

              return (
                <button
                  key={method.gatewayId || method.code}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method);
                    setTxidInput("");
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "border-[#077C74] bg-teal-50/40 dark:border-[#1BD1C0] dark:bg-teal-950/20 shadow-xs"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {method.name}
                    </span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#077C74] dark:text-[#1BD1C0] stroke-[3]" />
                    )}
                  </div>

                  <div className="text-[11px] text-zinc-500 font-mono mt-3 flex items-center justify-between">
                    <span>{method.currency}</span>
                    <span>Fee {method.feePercentage}%</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Payment Instructions Card */}
        <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-mono text-zinc-500">Payable Amount</div>
              <div className="text-2xl font-bold font-mono text-[#077C74] dark:text-[#1BD1C0]">
                {formatCurrency(payableAmount, payableCurrency)}
              </div>
              {payableCurrency !== session.currency && (
                <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  Original Invoice: {formatCurrency(session.amount, session.currency)}
                </div>
              )}
            </div>

            <Badge variant="cyan" size="md">
              {selectedMethod.name}
            </Badge>
          </div>

          {selectedMethod.qrImageUrl ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Scan merchant QR
              </label>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedMethod.qrImageUrl}
                alt="Payment QR"
                className="w-44 h-44 object-contain mx-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white p-2"
              />
              <p className="text-[11px] text-zinc-500 text-center">
                Scanning this QR does not complete payment — wait for SMS / on-chain confirmation.
              </p>
            </div>
          ) : null}

          {/* Destination Account / Wallet */}
          {selectedMethod.depositAddressOrNumber ? (
            <div className="space-y-1">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                {selectedMethod.accountLabel || "Receiving Destination / Account"}
              </label>
              <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 font-mono text-xs">
                <span className="flex-1 select-all break-all text-zinc-900 dark:text-zinc-100 font-semibold">
                  {selectedMethod.depositAddressOrNumber}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedMethod.depositAddressOrNumber || "")}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                  aria-label="Copy address"
                >
                  {copiedText === selectedMethod.depositAddressOrNumber ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
              Receiving destination is being initialized by the merchant.
            </div>
          )}

          {/* Instruction steps */}
          {steps.length > 0 && (
            <ol className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed space-y-1.5 list-decimal pl-4 pt-1">
              {steps.map((step, i) => (
                <li key={i}>{step.text}</li>
              ))}
            </ol>
          )}

          {/* Form */}
          <form onSubmit={handleVerifyPayment} className="space-y-4 pt-2">
            {selectedMethod.code === "binance_pay" ? (
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Clicking below will open the official Binance Pay merchant checkout in your app or browser. Real-time webhook settles your order automatically.
              </p>
            ) : selectedMethod.code === "usdt_trc20" ? (
              <div className="space-y-2">
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  Send USDT on the <strong className="font-semibold">TRON (TRC-20)</strong> network to the address above. Paste your 64-character transaction hash below:
                </p>
                <Input
                  label={selectedMethod.trxHint || "TRC-20 Transaction Hash"}
                  placeholder="Paste 64-character transaction hash"
                  value={txidInput}
                  onChange={(e) => setTxidInput(foldTxid(selectedMethod, e.target.value))}
                  required
                />
              </div>
            ) : selectedMethod.requiresTxidInput ? (
              <Input
                label={selectedMethod.trxHint || "Carrier Transaction ID (TrxID)"}
                placeholder="e.g. BKH9948271"
                value={txidInput}
                onChange={(e) => setTxidInput(foldTxid(selectedMethod, e.target.value))}
                required
              />
            ) : null}

            {statusMessage && (
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                {statusMessage}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isVerifying}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isVerifying
                ? "Connecting to Settlement Node…"
                : selectedMethod.code === "binance_pay"
                ? "Open Binance Pay Checkout"
                : "I Have Completed This Payment"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
