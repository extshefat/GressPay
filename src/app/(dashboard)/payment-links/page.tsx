"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { Currency, PaymentLink } from "@/lib/types/api";
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
  ExternalLink,
  Link2,
  QrCode,
  CheckCircle2,
  Layers,
} from "lucide-react";

export default function PaymentLinksPage() {
  const { success, error: toastError } = useToast();

  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("25");
  const [currency, setCurrency] = useState<Currency>("BDT");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successRedirectUrl, setSuccessRedirectUrl] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [customFieldLabel, setCustomFieldLabel] = useState("");
  const [customFieldsDraft, setCustomFieldsDraft] = useState<
    { id: string; label: string; required: boolean; type: "text" | "email" | "phone" }[]
  >([]);

  // QR Modal
  const [qrLink, setQrLink] = useState<PaymentLink | null>(null);

  const loadLinks = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getPaymentLinks();
      setLinks(data.links || []);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load payment links.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, []);

  const getPayUrl = (id: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/pay/${id}`;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!title.trim()) {
      setFormError("Link title is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createPaymentLink({
        title,
        description,
        amount: amount ? parseFloat(amount) : null,
        currency,
        successRedirectUrl: successRedirectUrl.trim() || undefined,
        productImageUrl: productImageUrl.trim() || undefined,
        customFields: customFieldsDraft.length ? customFieldsDraft : undefined,
      });
      setLinks([res.link, ...links]);
      setIsModalOpen(false);
      setTitle("");
      setDescription("");
      setSuccessRedirectUrl("");
      setProductImageUrl("");
      setCustomFieldsDraft([]);
      setCustomFieldLabel("");
      success(`Payment link '${res.link.title}' created.`, "Link Ready");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create payment link.";
      setFormError(msg);
      toastError(msg, "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Payment Links
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Generate reusable or single-use hosted checkout URLs to share via chat, invoice, or website.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadLinks}
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
            Create Payment Link
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Error">
          {errorMessage}
        </Alert>
      )}

      {/* Grid of Links */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-zinc-500">Loading links…</p>
        </div>
      ) : links.length === 0 ? (
        <EmptyState
          icon={<Link2 className="w-6 h-6 text-zinc-400" />}
          title="No payment links created yet"
          description="Create a hosted link. Customers pay the destination you configured. The session is paid only after server-side evidence."
          action={
            <Button size="sm" variant="primary" onClick={() => setIsModalOpen(true)}>
              Create First Link
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {links.map((link) => {
            const url = getPayUrl(link.id);

            return (
              <Card
                key={link.id}
                className="p-5 flex flex-col justify-between space-y-4 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xs hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {link.title}
                    </h3>
                    <Badge variant={link.isActive ? "emerald" : "slate"} size="sm" dot>
                      {link.isActive ? "Active" : "Archived"}
                    </Badge>
                  </div>

                  {link.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {link.description}
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-zinc-400">Fixed Amount</span>
                      <div className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                        {link.amount ? formatCurrency(link.amount, link.currency) : "Customer Choice"}
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setQrLink(link)}
                      leftIcon={<QrCode className="w-3.5 h-3.5" />}
                    >
                      QR Code
                    </Button>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 space-y-2">
                  <CopyField value={url} />

                  <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
                    <span>Created: {formatDate(link.createdAt)}</span>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#077C74] dark:text-[#1BD1C0] hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>Open Checkout</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Payment Link">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <Alert variant="danger" title="Validation">
              {formError}
            </Alert>
          )}

          <Input
            label="Link Title"
            placeholder="e.g. Pro Subscription / Order #1042"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Amount"
              type="number"
              step="any"
              placeholder="e.g. 1500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Select
              label="Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as Currency)}
              options={[
                { value: "BDT", label: "BDT (Bangladeshi Taka)" },
                { value: "USDT", label: "USDT (Tether)" },
                { value: "USD", label: "USD (US Dollar)" },
              ]}
            />
          </div>

          <Textarea
            label="Description (Optional)"
            placeholder="Order description visible to buyer during checkout"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />

          <Input
            label="Success redirect URL (HTTPS, optional)"
            placeholder="https://yourstore.com/thank-you"
            value={successRedirectUrl}
            onChange={(e) => setSuccessRedirectUrl(e.target.value)}
          />

          <Input
            label="Product image URL (HTTPS, optional)"
            placeholder="https://cdn.example.com/product.jpg"
            value={productImageUrl}
            onChange={(e) => setProductImageUrl(e.target.value)}
          />

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Custom checkout fields (optional)
            </label>
            {customFieldsDraft.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between gap-2 text-[11px] px-2 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <span>
                  {f.label}
                  {f.required ? " *" : ""}{" "}
                  <span className="text-zinc-400 font-mono">({f.type})</span>
                </span>
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() =>
                    setCustomFieldsDraft((prev) => prev.filter((x) => x.id !== f.id))
                  }
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Field label e.g. WhatsApp number"
                value={customFieldLabel}
                onChange={(e) => setCustomFieldLabel(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!customFieldLabel.trim() || customFieldsDraft.length >= 8}
                onClick={() => {
                  const label = customFieldLabel.trim();
                  if (!label) return;
                  const id =
                    "field_" +
                    label
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "_")
                      .replace(/^_|_$/g, "")
                      .slice(0, 32);
                  setCustomFieldsDraft((prev) => [
                    ...prev,
                    { id: id || `field_${prev.length + 1}`, label, required: false, type: "text" },
                  ]);
                  setCustomFieldLabel("");
                }}
              >
                Add field
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
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
              Generate Link
            </Button>
          </div>
        </form>
      </Modal>

      {/* QR Code Modal */}
      <Modal open={Boolean(qrLink)} onClose={() => setQrLink(null)} title="Scan & Pay QR">
        {qrLink && (
          <div className="flex flex-col items-center text-center space-y-4 py-2">
            <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm">
              {/* SVG QR Code visual representation */}
              <svg className="w-48 h-48" viewBox="0 0 100 100" fill="currentColor">
                <rect width="100" height="100" fill="white" />
                <path
                  d="M10 10h30v30h-30zM15 15v20h20v-20zM20 20h10v10h-10zM60 10h30v30h-30zM65 15v20h20v-20zM70 20h10v10h-10zM10 60h30v30h-30zM15 65v20h20v-20zM20 70h10v10h-10zM45 10h10v10h-10zM45 30h10v10h-10zM50 45h10v10h-10zM10 45h10v10h-10zM30 45h10v10h-10zM60 60h10v10h-10zM80 60h10v10h-10zM70 70h10v10h-10zM60 80h10v10h-10zM80 80h10v10h-10z"
                  fill="#091422"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {qrLink.title}
              </h4>
              <p className="font-mono text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {qrLink.amount ? formatCurrency(qrLink.amount, qrLink.currency) : "Custom amount"}
              </p>
            </div>

            <CopyField value={getPayUrl(qrLink.id)} />
          </div>
        )}
      </Modal>
    </div>
  );
}
