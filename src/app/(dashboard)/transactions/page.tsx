"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Clock,
  ExternalLink,
  ShieldAlert,
  ArrowUpDown,
  Filter,
} from "lucide-react";

export default function TransactionsPage() {
  const { success, error: toastError } = useToast();

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

  useEffect(() => {
    loadTransactions();
  }, []);

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
        if (!matchesId && !matchesTxId && !matchesCustomer) return false;
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

  const getTimelineEvents = (tx: Transaction): TimelineEvent[] => {
    const events: TimelineEvent[] = [
      {
        id: "created",
        title: "Session Initialized",
        timestamp: formatDate(tx.createdAt),
        description: `Customer initiated checkout for ${formatCurrency(tx.amount, tx.currency)}.`,
        status: "completed",
      },
    ];

    if (tx.txid) {
      events.push({
        id: "txid_submitted",
        title: "Customer Submitted Identifier",
        timestamp: formatDate(tx.updatedAt || tx.createdAt),
        description: `Identifier / TrxID: ${tx.txid}`,
        status: "completed",
        badge: tx.paymentMethod,
      });
    }

    if (tx.status === "COMPLETED") {
      events.push({
        id: "verified",
        title: tx.confirmedByMerchant
          ? "Merchant Audited Confirmation"
          : "Automated Companion / On-Chain Match",
        timestamp: formatDate(tx.updatedAt || tx.createdAt),
        description: tx.confirmedByMerchant
          ? `Reason: ${tx.confirmationReason || "Merchant audited"}`
          : "Evidence matched with carrier receipt and settled to ledger balance.",
        status: "completed",
      });
    } else if (tx.status === "PENDING") {
      events.push({
        id: "pending_verification",
        title: "Awaiting Verification",
        description: "Awaiting companion SMS receipt match or TRON blockchain confirmation.",
        status: "current",
      });
    } else if (tx.status === "FAILED") {
      events.push({
        id: "failed",
        title: "Verification Failed / Expired",
        description: "Transaction did not settle within timeout window.",
        status: "failed",
      });
    }

    return events;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Transactions
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Real-time audit log of customer settlements across bKash, Nagad, Binance Pay, and USDT.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadTransactions}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Ledger
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Ledger Notice">
          {errorMessage}
        </Alert>
      )}

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <SearchInput
              placeholder="Search by TxID, Session ID, or Customer Email..."
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
                    ? "bg-[#077C74] text-white dark:bg-[#1BD1C0] dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transactions List */}
      <Card className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-zinc-500">Querying ledger records…</p>
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
          <div className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {filteredTransactions.map((tx) => {
              const canConfirm =
                tx.status === "PENDING" &&
                !!tx.txid &&
                (tx.confirmationState === "submitted" || !tx.confirmationState);

              return (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTx(tx)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/60 dark:hover:bg-zinc-900/40 cursor-pointer transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
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
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {tx.ledgerMode}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-zinc-500">
                      <span className="text-zinc-700 dark:text-zinc-300 font-medium truncate">
                        {tx.id}
                      </span>
                      {tx.txid && (
                        <>
                          <span>•</span>
                          <span className="text-zinc-500 truncate">TxID: {tx.txid}</span>
                        </>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400">
                      {tx.customerEmail || tx.customerName || "Anonymous Customer"} •{" "}
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(tx.amount, tx.currency)}
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        fee {formatCurrency(tx.fee, tx.currency)}
                      </div>
                    </div>

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
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500">Amount Charged</span>
                <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
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
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-900">
                <span className="text-zinc-500">Customer:</span>
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedTx.customerName || selectedTx.customerEmail || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-900">
                <span className="text-zinc-500">Settlement Currency:</span>
                <span className="font-mono font-medium text-zinc-900 dark:text-zinc-100">
                  {selectedTx.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-100 dark:border-zinc-900">
                <span className="text-zinc-500">Gateway Fee:</span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(selectedTx.fee, selectedTx.currency)}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Net Merchant Settlement:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedTx.amount - selectedTx.fee, selectedTx.currency)}
                </span>
              </div>
            </div>

            {/* Audit Status Timeline */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Evidence Audit Trail
              </h4>
              <StatusTimeline events={getTimelineEvents(selectedTx)} />
            </div>

            {/* Manual confirm button if pending */}
            {selectedTx.status === "PENDING" && selectedTx.txid && (
              <div className="pt-2">
                <Button
                  className="w-full"
                  variant="primary"
                  onClick={() => setConfirmModalTx(selectedTx)}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Manually Audit & Confirm
                </Button>
              </div>
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
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
            You are manually settling transaction{" "}
            <code className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
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
            placeholder="e.g. Verified via direct merchant bKash app statement receipt #88192"
            value={confirmReason}
            onChange={(e) => setConfirmReason(e.target.value)}
            rows={3}
            required
          />

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
    </div>
  );
}
