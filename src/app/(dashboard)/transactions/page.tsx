"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api-client";
import { Transaction } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { Drawer } from "@/components/ui/drawer";
import { CopyField } from "@/components/ui/copy-field";
import { StatusTimeline, TimelineEvent } from "@/components/ui/status-timeline";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useToast } from "@/components/ui/toast";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Filter,
} from "lucide-react";

export default function TransactionsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-7xl py-10 text-xs text-muted">
          Loading transactions…
        </div>
      }
    >
      <TransactionsContent />
    </React.Suspense>
  );
}

function TransactionsContent() {
  const { success, error: toastError } = useToast();
  const searchParams = useSearchParams();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");

  // Drawer & Confirm Dialog
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [confirmModalTx, setConfirmModalTx] = useState<Transaction | null>(null);
  const [confirmReason, setConfirmReason] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Cancel / Reject Dialog
  const [cancelModalTx, setCancelModalTx] = useState<Transaction | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isResendingWebhook, setIsResendingWebhook] = useState(false);
  const [ledgerMode, setLedgerMode] = useState<"live" | "test">("live");

  const loadTransactions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getTransactions();
      setTransactions(data.transactions || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  };

  // BUG TXN-01: refetch when Live/Test mode changes.
  useEffect(() => {
    setLedgerMode(api.getLedgerMode());
    const onMode = () => {
      setLedgerMode(api.getLedgerMode());
      void loadTransactions();
    };
    window.addEventListener("gresspay-mode", onMode);
    return () => window.removeEventListener("gresspay-mode", onMode);
  }, []);

  useEffect(() => {
    loadTransactions();
  }, []);

  // BUG TXN-02: deep-link via API when id is outside the loaded page.
  useEffect(() => {
    const wanted = searchParams.get("id")?.trim();
    if (!wanted) return;
    const match = transactions.find(
      (t) => t.id === wanted || (t.txid && t.txid === wanted)
    );
    if (match) {
      setSelectedTx(match);
      return;
    }
    let cancelled = false;
    void api
      .getTransaction(wanted)
      .then((tx) => {
        if (!cancelled) setSelectedTx(tx);
      })
      .catch(() => {
        /* leave drawer closed if not found / mode mismatch */
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, transactions]);

  // Filtered list
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
      if (methodFilter !== "ALL" && tx.paymentMethod !== methodFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(q);
        const matchesTxId = (tx.txid || "").toLowerCase().includes(q);
        const matchesCustomer = (tx.customerEmail || tx.customerName || "").toLowerCase().includes(q);
        const matchesPhone = (tx.customerPhone || tx.senderAccountOrAddress || "").toLowerCase().includes(q);
        const matchesLink = (tx.paymentLinkId || tx.invoiceId || "").toLowerCase().includes(q);
        if (!matchesId && !matchesTxId && !matchesCustomer && !matchesPhone && !matchesLink) return false;
      }
      return true;
    });
  }, [transactions, statusFilter, methodFilter, searchQuery]);

  const handleManualConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmModalTx) return;
    if (confirmReason.trim().length < 8) {
      setConfirmError("Auditable confirmation reason must be at least 8 characters.");
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);
    try {
      const updated = await api.confirmTransaction(confirmModalTx.id, confirmReason.trim());
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTx?.id === updated.id) {
        setSelectedTx(updated);
      }
      success(`Transaction ${updated.id} manually confirmed.`, "Settled Successfully");
      setConfirmModalTx(null);
      setConfirmReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Confirm failed.";
      setConfirmError(msg);
      toastError(msg, "Action Failed");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleManualCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalTx) return;

    setIsCancelling(true);
    setCancelError(null);
    try {
      const updated = await api.cancelTransaction(
        cancelModalTx.id,
        cancelReason.trim() || "Rejected from dashboard"
      );
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      if (selectedTx?.id === updated.id) {
        setSelectedTx(updated);
      }
      success(`Transaction ${updated.id} marked as failed.`, "Transaction Rejected");
      setCancelModalTx(null);
      setCancelReason("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection failed.";
      setCancelError(msg);
      toastError(msg, "Action Failed");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResendWebhook = async (tx: Transaction) => {
    setIsResendingWebhook(true);
    try {
      const res = await api.resendTransactionWebhook(tx.id);
      if (res.ok) success(res.message, "Webhook Resent");
      else toastError(res.message, "Webhook Failed");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Webhook resend failed.", "Action Failed");
    } finally {
      setIsResendingWebhook(false);
    }
  };

  const getTimelineEvents = (tx: Transaction): TimelineEvent[] => {
    const events: TimelineEvent[] = (tx.timeline || []).map((event) => ({ ...event, timestamp: event.timestamp ? formatDate(event.timestamp) : undefined }));
    return events;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">
              Transactions
            </h1>
            <Badge variant={ledgerMode === "test" ? "amber" : "emerald"} size="sm" dot>
              {ledgerMode === "test" ? "Test ledger" : "Live ledger"}
            </Badge>
          </div>
          <p className="text-xs text-muted dark:text-muted mt-1">
            Settled, pending, and refunded payments for the active{" "}
            {ledgerMode === "test" ? "test" : "live"} ledger — test rows are never live money.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={loadTransactions}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Ledger Notice">
          {errorMessage}
        </Alert>
      )}

      {/* Filter Bar */}
      <Card className="p-4 bg-white dark:bg-canvas border-border dark:border-border shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="flex-1 max-w-md">
            <SearchInput
              placeholder="Search by TrxID, Order ID, or Sender Phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {["ALL", "COMPLETED", "PENDING", "FAILED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                  statusFilter === st
                    ? "bg-ink-solid text-white dark:bg-surface-muted dark:text-muted"
                    : "bg-surface text-muted hover:bg-surface-muted dark:bg-surface dark:text-muted"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="bg-white dark:bg-canvas border-border dark:border-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-border dark:border-border border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-muted">Querying ledger records…</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <EmptyState
            title="No matching transactions found"
            description={
              searchQuery || statusFilter !== "ALL"
                ? "No transactions match your current search or status filter."
                : "No customer payments have settled in this ledger mode yet."
            }
            action={
              (searchQuery || statusFilter !== "ALL") && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="divide-y divide-border dark:divide-border">
            {filteredTransactions.map((tx) => {
              // BUG TXN-05: live BD MFS cannot be manually confirmed (SMS evidence required).
              const liveMfs = ["bkash", "nagad", "rocket", "upay", "cellfin"].includes(
                String(tx.paymentMethod || "").toLowerCase()
              );
              const canConfirm =
                tx.status === "PENDING" &&
                !!tx.txid &&
                !(tx.ledgerMode === "live" && liveMfs) &&
                (tx.confirmationState === "submitted" || !tx.confirmationState);

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-card/60 dark:hover:bg-ink-solid/40 cursor-pointer transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-ink dark:text-ink">
                        {tx.paymentMethodTitle || tx.paymentMethod}
                      </span>
                      <Badge
                        variant={
                          tx.status === "COMPLETED"
                            ? "emerald"
                            : tx.status === "PENDING"
                            ? "amber"
                            : "rose"
                        }
                        size="sm"
                        dot
                      >
                        {tx.status}
                      </Badge>
                      {tx.ledgerMode && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface dark:bg-surface-muted text-muted">
                          {tx.ledgerMode}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted">
                      <span className="text-ink dark:text-ink font-medium truncate">
                        {tx.id}
                      </span>
                      {tx.txid && (
                        <>
                          <span>•</span>
                          <span className="text-muted truncate">TxID: {tx.txid}</span>
                        </>
                      )}
                    </div>

                    <p className="text-[11px] text-muted">
                      {tx.customerEmail || tx.customerName || "Anonymous Customer"} •{" "}
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-ink dark:text-ink">
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      <div className="text-[11px] font-mono text-muted">
                        fee {formatCurrency(tx.fee, tx.currency)}
                      </div>
                    </div>

                    {tx.status === "PENDING" && (
                      <div className="flex items-center gap-1.5">
                        {canConfirm && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModalTx(tx);
                            }}
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Confirm
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-danger dark:text-danger hover:bg-danger/10 dark:hover:bg-danger/30 border-danger dark:border-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelModalTx(tx);
                          }}
                          leftIcon={<XCircle className="w-3.5 h-3.5" />}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Transaction Detail Slide-Over Drawer */}
      <Drawer
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Transaction ${selectedTx.id}` : "Transaction Detail"}
        description={
          selectedTx
            ? `${selectedTx.paymentMethodTitle || selectedTx.paymentMethod} • Settled in ${
                selectedTx.ledgerMode || "live"
              } mode`
            : ""
        }
        size="md"
      >
        {selectedTx && (
          <div className="space-y-6">
            {/* Amount card */}
            <div className="p-4 rounded-xl border border-border dark:border-border bg-card/50 dark:bg-surface/50 flex items-center justify-between">
              <div>
                <span className="text-xs text-muted">Amount Charged</span>
                <div className="text-xl font-bold font-mono text-ink dark:text-ink">
                  {formatCurrency(selectedTx.amount, selectedTx.currency)}
                </div>
              </div>
              <Badge
                variant={
                  selectedTx.status === "COMPLETED"
                    ? "emerald"
                    : selectedTx.status === "PENDING"
                    ? "amber"
                    : "rose"
                }
                size="md"
                dot
              >
                {selectedTx.status}
              </Badge>
            </div>

            {/* Identifiers */}
            <div className="space-y-3">
              <CopyField label="Session Identifier" value={selectedTx.id} />
              {selectedTx.txid && (
                <CopyField label="Provider Transaction ID (TxID)" value={selectedTx.txid} />
              )}
            </div>

            {/* Customer & Breakdown */}
            <div className="rounded-xl border border-border dark:border-border p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-border dark:border-border">
                <span className="text-muted">Customer:</span>
                <span className="font-medium text-ink dark:text-ink">
                  {selectedTx.customerName || selectedTx.customerEmail || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border dark:border-border">
                <span className="text-muted">Settlement Currency:</span>
                <span className="font-mono font-medium text-ink dark:text-ink">
                  {selectedTx.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border dark:border-border">
                <span className="text-muted">Gateway Fee:</span>
                <span className="font-mono text-ink dark:text-ink">
                  {formatCurrency(selectedTx.fee, selectedTx.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Net settlement to you:</span>
                <span className="font-mono font-bold text-success dark:text-success">
                  {formatCurrency(
                    typeof selectedTx.netAmount === "number"
                      ? selectedTx.netAmount
                      : selectedTx.amount - selectedTx.fee,
                    selectedTx.currency
                  )}
                </span>
              </div>
            </div>

            {/* Audit Status Timeline */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">
                Evidence Audit Trail
              </h4>
              <StatusTimeline events={getTimelineEvents(selectedTx)} />
            </div>

            {/* Actions if pending */}
            {selectedTx.status === "PENDING" && (
              <div className="pt-2 flex items-center gap-2.5">
                {selectedTx.txid && (
                  <Button
                    className="flex-1"
                    variant="primary"
                    onClick={() => setConfirmModalTx(selectedTx)}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Manual Approve
                  </Button>
                )}
                <Button
                  className="flex-1 text-danger dark:text-danger hover:bg-danger/10 dark:hover:bg-danger/30 border-danger dark:border-danger"
                  variant="outline"
                  onClick={() => setCancelModalTx(selectedTx)}
                  leftIcon={<XCircle className="w-4 h-4" />}
                >
                  Reject
                </Button>
              </div>
            )}

            {selectedTx.status === "COMPLETED" && (
              <Button
                className="w-full"
                variant="outline"
                size="sm"
                isLoading={isResendingWebhook}
                onClick={() => handleResendWebhook(selectedTx)}
              >
                Resend Webhook
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* Manual Confirm Modal with Auditable Reason */}
      <Modal
        open={Boolean(confirmModalTx)}
        onClose={() => {
          setConfirmModalTx(null);
          setConfirmReason("");
          setConfirmError(null);
        }}
        title="Manual Audit Confirmation"
      >
        <form onSubmit={handleManualConfirm} className="space-y-4">
          <p className="text-xs text-muted dark:text-muted leading-relaxed">
            You are manually settling transaction{" "}
            <code className="font-mono font-bold text-ink dark:text-ink">
              {confirmModalTx?.id}
            </code>
            . A permanent audit log reason is required for compliance (minimum 8 characters).
          </p>

          {confirmError && (
            <Alert variant="danger" title="Audit Validation">
              {confirmError}
            </Alert>
          )}

          <Textarea
            label="Auditable Confirmation Reason"
            placeholder="e.g. Verified via direct bKash app statement receipt #88192"
            value={confirmReason}
            onChange={(e) => setConfirmReason(e.target.value)}
            rows={3}
            required
          />

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border dark:border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmModalTx(null);
                setConfirmReason("");
              }}
              disabled={isConfirming}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isConfirming}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              Confirm & Settle Ledger
            </Button>
          </div>
        </form>
      </Modal>

      {/* Cancel / Reject Modal */}
      <Modal
        open={Boolean(cancelModalTx)}
        onClose={() => {
          setCancelModalTx(null);
          setCancelReason("");
          setCancelError(null);
        }}
        title="Reject / Cancel Transaction"
      >
        <form onSubmit={handleManualCancel} className="space-y-4">
          <p className="text-xs text-muted dark:text-muted leading-relaxed">
            Are you sure you want to reject transaction{" "}
            <code className="font-mono font-bold text-ink dark:text-ink">
              {cancelModalTx?.id}
            </code>
            ? This will transition its state to <span className="font-semibold text-danger">FAILED</span>.
          </p>

          {cancelError && (
            <Alert variant="danger" title="Action Error">
              {cancelError}
            </Alert>
          )}

          <Textarea
            label="Cancellation Reason (Optional)"
            placeholder="e.g. Invalid / counterfeit TxID provided or payment not received"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border dark:border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCancelModalTx(null);
                setCancelReason("");
              }}
              disabled={isCancelling}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              isLoading={isCancelling}
              className="bg-danger text-white hover:bg-danger border-danger"
              leftIcon={<XCircle className="w-4 h-4" />}
            >
              Reject Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}