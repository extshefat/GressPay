"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Invoice } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { CopyField } from "@/components/ui/copy-field";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  RefreshCw,
  FileText,
  ExternalLink,
  Printer,
  Mail,
  User,
  DollarSign,
} from "lucide-react";

export default function InvoicesPage() {
  const { success, error: toastError } = useToast();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [amount, setAmount] = useState("100");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View Invoice Modal
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null);

  const loadInvoices = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getInvoices();
      setInvoices(data.invoices || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const getPayUrl = (id: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${id}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!customerEmail.trim()) {
      setFormError("Customer email is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createInvoice({
        customer_name: customerName,
        customer_email: customerEmail,
        amount: parseFloat(amount) || 0,
        currency,
        note,
      });
      setInvoices([res.invoice, ...invoices]);
      setIsModalOpen(false);
      setCustomerName("");
      setCustomerEmail("");
      setNote("");
      success(`Invoice ${res.invoice.invoiceNumber || res.invoice.id} created.`, "Invoice Issued");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create invoice.";
      setFormError(msg);
      toastError(msg, "Creation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink dark:text-ink">
            Invoices
          </h1>
          <p className="text-xs text-muted dark:text-muted mt-1">
            Issue line-item digital invoices with dedicated hosted payment links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadInvoices}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Invoice
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Error">
          {errorMessage}
        </Alert>
      )}

      {/* Invoice list table */}
      <Card className="bg-white dark:bg-canvas border-border dark:border-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-mono text-muted">Querying invoices…</p>
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-6 h-6 text-muted" />}
            title="No invoices created yet"
            description="Send professional invoices to your customers with direct bKash, Nagad, Binance Pay, or USDT checkout."
          />
        ) : (
          <div className="divide-y divide-border dark:divide-border">
            {invoices.map((inv) => {
              const url = getPayUrl(inv.id);
              const isPaid = inv.status === "PAID";

              return (
                <div
                  key={inv.id}
                  onClick={() => setActiveInvoice(inv)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-card/50 dark:hover:bg-ink-solid/40 cursor-pointer transition-colors"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-ink dark:text-ink font-mono">
                        {inv.invoiceNumber || inv.id}
                      </span>
                      <Badge variant={isPaid ? "emerald" : "amber"} size="sm" dot>
                        {inv.status}
                      </Badge>
                    </div>

                    <p className="text-xs text-ink dark:text-ink font-medium">
                      {inv.clientName || "Customer"} ·{" "}
                      <span className="text-muted font-normal">{inv.clientEmail}</span>
                    </p>

                    <p className="text-[11px] text-muted">
                      Created: {formatDate(inv.createdAt || new Date().toISOString())}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-ink dark:text-ink">
                        {formatCurrency(inv.total, inv.currency)}
                      </div>
                      <span className="text-[10px] text-muted font-mono">
                        {inv.currency}
                      </span>
                    </div>

                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 rounded-lg text-muted hover:text-ink dark:hover:text-on-ink hover:bg-surface dark:hover:bg-ink-solid transition-colors"
                      title="Open Payment Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Create Invoice Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Invoice">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <Alert variant="danger" title="Validation">
              {formError}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Customer Name"
              placeholder="e.g. Rahim Ullah"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="Customer Email"
              type="email"
              placeholder="rahim@gmail.com"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Invoice Amount"
              type="number"
              step="any"
              placeholder="e.g. 2500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              leftIcon={<DollarSign className="w-4 h-4" />}
              required
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: "BDT", label: "BDT (Bangladeshi Taka)" },
                { value: "USDT", label: "USDT (Tether)" },
                { value: "USD", label: "USD (US Dollar)" },
              ]}
            />
          </div>

          <Textarea
            label="Memo / Note"
            placeholder="Services rendered, line item details, or invoice instructions"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border dark:border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Issue Invoice
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Printable Invoice Modal */}
      <Modal
        open={Boolean(activeInvoice)}
        onClose={() => setActiveInvoice(null)}
        title={activeInvoice?.invoiceNumber || "Invoice Details"}
      >
        {activeInvoice && (
          <div className="space-y-5 text-xs">
            <div className="p-4 rounded-xl border border-border dark:border-border bg-card/50 dark:bg-surface/40 flex items-center justify-between">
              <div>
                <span className="text-muted">Total Billed</span>
                <div className="text-xl font-bold font-mono text-ink dark:text-ink">
                  {formatCurrency(activeInvoice.total, activeInvoice.currency)}
                </div>
              </div>
              <Badge
                variant={activeInvoice.status === "PAID" ? "emerald" : "amber"}
                size="md"
                dot
              >
                {activeInvoice.status}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-border dark:border-border">
                <span className="text-muted">Billed To:</span>
                <span className="font-medium text-ink dark:text-ink">
                  {activeInvoice.clientName || "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-border dark:border-border">
                <span className="text-muted">Email:</span>
                <span className="font-mono text-ink dark:text-ink">
                  {activeInvoice.clientEmail}
                </span>
              </div>
            </div>

            <CopyField label="Direct Hosted Payment URL" value={getPayUrl(activeInvoice.id)} />

            <div className="flex items-center justify-between pt-3 border-t border-border dark:border-border">
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.print()}
                leftIcon={<Printer className="w-3.5 h-3.5" />}
              >
                Print Invoice
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={() => window.open(getPayUrl(activeInvoice.id), "_blank")}
                rightIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open Pay Page
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
