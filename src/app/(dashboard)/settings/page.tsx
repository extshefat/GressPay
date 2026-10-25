"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { MerchantSettings } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Select } from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import {
  Save,
  RefreshCw,
  Building2,
  Globe,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Lock,
} from "lucide-react";

export default function SettingsPage() {
  const { success, error: toastError } = useToast();

  const [businessName, setBusinessName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [cryptoEnabled, setCryptoEnabled] = useState(false);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);

  // Binance Pay credentials state
  const [binanceConfigured, setBinanceConfigured] = useState(false);
  const [binanceLiveReady, setBinanceLiveReady] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [certificateSn, setCertificateSn] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingBinance, setSavingBinance] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setBusinessName(data.businessName || "");
      setWebhookUrl(data.webhookUrl || "");
      setCurrency(data.currency || "BDT");
      setCryptoEnabled(Boolean(data.cryptoEnabled));
      setBinanceConfigured(Boolean(data.binancePayConfigured));
      try {
        const bp = await api.getBinancePayStatus();
        setBinanceConfigured(bp.configured);
        setBinanceLiveReady(bp.liveReady);
      } catch {
        /* optional */
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load settings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.updateSettings({ businessName, webhookUrl, cryptoEnabled });
      success("Store settings and webhook destination updated.", "Saved Successfully");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update settings.";
      setErrorMessage(msg);
      toastError(msg, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const saveBinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim() || !secret.trim() || !certificateSn.trim()) {
      setErrorMessage("Binance Pay API key, secret, and certificate serial are all required.");
      return;
    }

    setSavingBinance(true);
    setErrorMessage(null);
    try {
      const res = await api.saveBinancePayCredentials({ apiKey, secret, certificateSn });
      setApiKey("");
      setSecret("");
      setCertificateSn("");
      setBinanceConfigured(res.configured);
      setBinanceLiveReady(res.liveReady);
      success(
        "Binance Pay merchant credentials stored securely and encrypted at rest.",
        "Binance Pay Active"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save Binance credentials.";
      setErrorMessage(msg);
      toastError(msg, "Credentials Error");
    } finally {
      setSavingBinance(false);
    }
  };

  const clearBinance = async () => {
    setSavingBinance(true);
    setErrorMessage(null);
    try {
      const res = await api.clearBinancePayCredentials();
      setBinanceConfigured(res.configured);
      setBinanceLiveReady(res.liveReady);
      success("Binance Pay credentials removed.", "Credentials Cleared");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to clear Binance credentials.";
      setErrorMessage(msg);
      toastError(msg, "Error");
    } finally {
      setSavingBinance(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Merchant Settings
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Configure your business profile, default currency, and external rail provider integrations.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Settings
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Settings Notice">
          {errorMessage}
        </Alert>
      )}

      {/* General Settings Card */}
      <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 shadow-xs">
        <form onSubmit={handleSaveGeneral} className="space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            General Store Profile
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business / Store Name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              leftIcon={<Building2 className="w-4 h-4" />}
              required
            />
            <Select
              label="Primary Settlement Currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              options={[
                { value: "BDT", label: "BDT — Bangladeshi Taka" },
                { value: "USDT", label: "USDT — Tether TRC-20" },
                { value: "USD", label: "USD — United States Dollar" },
              ]}
            />
          </div>

          <Input
            label="Default Webhook Destination URL"
            type="url"
            placeholder="https://yourstore.com/api/webhooks/gresspay"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            leftIcon={<Globe className="w-4 h-4" />}
            helperText="Every settled transaction will fire an HTTP POST with X-GressPay-Signature."
          />

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Enable USDT TRC-20 Crypto Rail
              </span>
              <p className="text-[11px] text-zinc-500">
                Allow customers to select on-chain TRON USDT settlement on your hosted checkout sessions.
              </p>
            </div>
            <Toggle checked={cryptoEnabled} onChange={setCryptoEnabled} />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Save General Settings
            </Button>
          </div>
        </form>
      </Card>

      {/* Binance Pay Merchant API Card */}
      <Card id="binance-pay" className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Binance Pay Merchant Credentials
            </h3>
            <Badge variant={binanceLiveReady ? "emerald" : "amber"} size="sm" dot>
              {binanceLiveReady ? "Credentials stored · live checks allowed" : binanceConfigured ? "Stored · not live-ready" : "Not configured"}
            </Badge>
          </div>
          <span className="text-[11px] font-mono text-zinc-400">Merchant API, not Spot</span>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Use the API key, secret, and certificate serial from Binance Pay Merchant. Spot or trading keys will not create these orders. Fields are write-only. The server seals them for this brand and does not send them back. USDT TRC-20 uses a wallet address instead, on the destinations page.
        </p>

        <form onSubmit={saveBinance} className="space-y-4 pt-2">
          <Input
            label="Binance API Key"
            placeholder="paste your binance merchant api key"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />

          <PasswordInput
            label="Binance Secret Key"
            placeholder="paste your binance merchant secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
          />

          <Input
            label="Certificate serial number"
            placeholder="e.g. CERT_1048291"
            value={certificateSn}
            onChange={(e) => setCertificateSn(e.target.value)}
          />

          <div className="flex items-center justify-between pt-2">
            {binanceConfigured ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={clearBinance}
                disabled={savingBinance}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Clear Credentials
              </Button>
            ) : (
              <span />
            )}

            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={savingBinance}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              Store Encrypted Credentials
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
