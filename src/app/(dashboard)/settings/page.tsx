"use client";

import React, { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Save,
  RefreshCw,
  Building2,
  Globe,
  Trash2,
  Image as ImageIcon,
  Bell,
  Send,
} from "lucide-react";

type SettingsTab = "branding" | "alerts" | "general" | "binance";

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<SettingsTab>("branding");

  const [businessName, setBusinessName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [supportContact, setSupportContact] = useState("");
  const [receiptFooter, setReceiptFooter] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [cryptoEnabled, setCryptoEnabled] = useState(false);
  const [settings, setSettings] = useState<MerchantSettings | null>(null);

  const [telegramBotToken, setTelegramBotToken] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState("");
  const [testingAlert, setTestingAlert] = useState(false);

  const [binanceConfigured, setBinanceConfigured] = useState(false);
  const [binanceLiveReady, setBinanceLiveReady] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secret, setSecret] = useState("");
  const [certificateSn, setCertificateSn] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingBinance, setSavingBinance] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [advancedTestLedger, setAdvancedTestLedger] = useState(false);
  const [ledgerMode, setLedgerMode] = useState<"live" | "test">("live");

  useEffect(() => {
    const adv = window.localStorage.getItem("gresspay_advanced_test_ledger") === "1";
    setAdvancedTestLedger(adv);
    setLedgerMode(api.getLedgerMode());
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setBusinessName(data.businessName || "");
      setBrandName(data.brandName || data.businessName || "");
      setBrandLogoUrl(data.brandLogoUrl || "");
      setSupportContact(data.supportContact || "");
      setReceiptFooter(data.receiptFooter || "");
      setWebhookUrl(data.webhookUrl || "");
      setCurrency(data.currency || "BDT");
      setCryptoEnabled(Boolean(data.cryptoEnabled));
      setTelegramChatId(data.telegramChatId || "");
      setDiscordWebhookUrl(data.discordWebhookUrl || "");
      setTelegramBotToken("");
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

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.updateSettings({
        businessName: brandName || businessName,
        brandName,
        brandLogoUrl,
        supportContact,
        receiptFooter,
      });
      success("Checkout branding updated.", "Saved");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update branding.";
      setErrorMessage(msg);
      toastError(msg, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.updateSettings({
        telegramBotToken: telegramBotToken.trim() || undefined,
        telegramChatId,
        discordWebhookUrl,
      });
      setTelegramBotToken("");
      success("Instant alert channels saved.", "Saved");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update alerts.";
      setErrorMessage(msg);
      toastError(msg, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);
    try {
      await api.updateSettings({ businessName, webhookUrl, cryptoEnabled });
      success("Store settings updated.", "Saved Successfully");
      await loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update settings.";
      setErrorMessage(msg);
      toastError(msg, "Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const sendTestAlert = async () => {
    setTestingAlert(true);
    try {
      const res = await api.testInstantAlert("all");
      if (res.ok) success(res.message, "Test Alert Sent");
      else toastError(res.message, "Test Alert Failed");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Test alert failed.", "Error");
    } finally {
      setTestingAlert(false);
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
      success("Binance Pay credentials stored securely.", "Binance Pay Active");
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
    try {
      const res = await api.clearBinancePayCredentials();
      setBinanceConfigured(res.configured);
      setBinanceLiveReady(res.liveReady);
      success("Binance Pay credentials removed.", "Credentials Cleared");
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Failed to clear credentials.", "Error");
    } finally {
      setSavingBinance(false);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "branding", label: "Checkout Branding" },
    { id: "alerts", label: "Instant Alerts" },
    { id: "general", label: "General" },
    { id: "binance", label: "Binance Pay" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Merchant Settings
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Branding, instant alerts, webhooks, and provider credentials.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadSettings}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Settings Notice">
          {errorMessage}
        </Alert>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 min-w-[110px] px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
              tab === t.id
                ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "branding" && (
        <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4">
          <form onSubmit={handleSaveBranding} className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Checkout Branding</h3>
            <Input
              label="Store / Brand Name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              leftIcon={<Building2 className="w-4 h-4" />}
              required
            />
            <Input
              label="Brand Logo URL (HTTPS)"
              value={brandLogoUrl}
              onChange={(e) => setBrandLogoUrl(e.target.value)}
              leftIcon={<ImageIcon className="w-4 h-4" />}
              placeholder="https://cdn.example.com/logo.png"
            />
            {brandLogoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brandLogoUrl}
                  alt="Brand logo preview"
                  className="w-12 h-12 rounded-xl object-contain bg-white border border-zinc-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs text-zinc-500">Live logo preview</span>
              </div>
            )}
            <Input
              label="Support WhatsApp / Telegram Link"
              value={supportContact}
              onChange={(e) => setSupportContact(e.target.value)}
              placeholder="https://wa.me/8801... or @telegram"
            />
            <Textarea
              label="Custom Receipt Footer"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              placeholder="Thank you for shopping with us."
              rows={3}
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} leftIcon={<Save className="w-3.5 h-3.5" />}>
                Save Branding
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === "alerts" && (
        <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4">
          <form onSubmit={handleSaveAlerts} className="space-y-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Instant Alerts</h3>
            </div>
            <PasswordInput
              label="Telegram Bot Token"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
              placeholder={settings?.telegramBotTokenSet ? "•••• configured — paste to replace" : "123456:ABC-DEF..."}
            />
            <Input
              label="Telegram Chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="-1001234567890"
              className="font-mono text-xs"
            />
            <Input
              label="Discord Webhook URL"
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
            />
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={testingAlert}
                onClick={sendTestAlert}
                leftIcon={<Send className="w-3.5 h-3.5" />}
              >
                Send Test Alert
              </Button>
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} leftIcon={<Save className="w-3.5 h-3.5" />}>
                Save Alerts
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tab === "general" && (
        <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800">
          <form onSubmit={handleSaveGeneral} className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">General Store Profile</h3>
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
              helperText="Every settled transaction fires an HTTP POST with X-GressPay-Signature."
            />
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Enable USDT TRC-20 Crypto Rail
                </span>
                <p className="text-[11px] text-zinc-500">
                  Allow customers to select on-chain TRON USDT settlement.
                </p>
              </div>
              <Toggle checked={cryptoEnabled} onChange={setCryptoEnabled} />
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" isLoading={isSaving} leftIcon={<Save className="w-3.5 h-3.5" />}>
                Save General Settings
              </Button>
            </div>
          </form>

          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Advanced (engineering)</h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Merchants should stay on live production. Enable test ledger only when integrating with{" "}
              <code className="font-mono">gp_test_</code> keys.
            </p>
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Allow test ledger in dashboard</span>
                <p className="text-[11px] text-zinc-500">Sends X-GressPay-Mode: test for JWT API calls when enabled.</p>
              </div>
              <Toggle
                checked={advancedTestLedger}
                onChange={(on) => {
                  setAdvancedTestLedger(on);
                  window.localStorage.setItem("gresspay_advanced_test_ledger", on ? "1" : "0");
                  if (!on) {
                    api.setLedgerMode("live");
                    setLedgerMode("live");
                  }
                  window.dispatchEvent(new Event("gresspay-mode"));
                }}
              />
            </div>
            {advancedTestLedger && (
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={ledgerMode === "live" ? "primary" : "outline"}
                  onClick={() => {
                    api.setLedgerMode("live");
                    setLedgerMode("live");
                    window.dispatchEvent(new Event("gresspay-mode"));
                  }}
                >
                  Live
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={ledgerMode === "test" ? "primary" : "outline"}
                  onClick={() => {
                    api.setLedgerMode("test");
                    setLedgerMode("test");
                    window.dispatchEvent(new Event("gresspay-mode"));
                  }}
                >
                  Test
                </Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === "binance" && (
        <Card id="binance-pay" className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Binance Pay Merchant Credentials
            </h3>
            <Badge variant={binanceLiveReady ? "emerald" : "amber"} size="sm" dot>
              {binanceLiveReady ? "Live-ready" : binanceConfigured ? "Stored" : "Not configured"}
            </Badge>
          </div>
          <form onSubmit={saveBinance} className="space-y-4">
            <Input label="Binance API Key" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <PasswordInput label="Binance Secret Key" value={secret} onChange={(e) => setSecret(e.target.value)} />
            <Input
              label="Certificate serial number"
              value={certificateSn}
              onChange={(e) => setCertificateSn(e.target.value)}
            />
            <div className="flex items-center justify-between pt-2">
              {binanceConfigured ? (
                <Button type="button" variant="danger" size="sm" onClick={clearBinance} disabled={savingBinance} leftIcon={<Trash2 className="w-3.5 h-3.5" />}>
                  Clear Credentials
                </Button>
              ) : (
                <span />
              )}
              <Button type="submit" variant="primary" size="sm" isLoading={savingBinance} leftIcon={<Save className="w-3.5 h-3.5" />}>
                Store Encrypted Credentials
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
