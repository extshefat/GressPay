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
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Save,
  RefreshCw,
  Building2,
  Globe,
  Bell,
  Send,
} from "lucide-react";
import Link from "next/link";

type SettingsTab = "branding" | "alerts" | "general";

export default function SettingsPage() {
  const { success, error: toastError } = useToast();
  const [tab, setTab] = useState<SettingsTab>("branding");

  const [businessName, setBusinessName] = useState("");
  const [brandName, setBrandName] = useState("");
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getSettings();
      setSettings(data);
      setBusinessName(data.businessName || "");
      setBrandName(data.businessName || data.brandName || "");
      setSupportContact(data.supportContact || "");
      setReceiptFooter(data.receiptFooter || "");
      setWebhookUrl(data.webhookUrl || "");
      setCurrency(data.currency || "BDT");
      setCryptoEnabled(Boolean(data.cryptoEnabled));
      setTelegramChatId(data.telegramChatId || "");
      setDiscordWebhookUrl(data.discordWebhookUrl || "");
      setTelegramBotToken("");
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
        businessName: brandName,
        brandName,
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

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "branding", label: "Checkout Branding" },
    { id: "alerts", label: "Instant Alerts" },
    { id: "general", label: "General" },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Account settings
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Storefront text and alerts here. Checkout logos live on Brands. Webhook delivery lives under Webhooks.
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
            <Link href="/dashboard/brands" className="block rounded-xl border border-zinc-300 p-4 text-sm font-semibold dark:border-zinc-700">
              Choose a checkout logo in Brands →
              <span className="mt-1 block text-xs font-normal text-zinc-500">Select the business whose logo should appear on its payment page.</span>
            </Link>
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
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Default webhook URL</p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Edit destination URL, rotate HMAC secret, and send test pings from{" "}
                <Link href="/dashboard/webhooks" className="font-semibold underline">
                  Webhooks & delivery
                </Link>
                . Current value below is a convenience mirror.
              </p>
              <div className="mt-3">
                <Input
                  label="Default Webhook Destination URL"
                  type="url"
                  placeholder="https://yourstore.com/api/webhooks/gresspay"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  leftIcon={<Globe className="w-4 h-4" />}
                  helperText="Settled payments POST with X-GressPay-Signature (HMAC-SHA256)."
                />
              </div>
            </div>
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
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Where credentials live</h3>
            <p className="mt-1 text-[11px] text-zinc-500">
              Website API keys and code snippets:{" "}
              <Link href="/dashboard/api-keys" className="font-semibold underline">
                API keys & snippets
              </Link>
              . Per-brand logo and brand key:{" "}
              <Link href="/dashboard/brands" className="font-semibold underline">
                Brands
              </Link>
              . Companion pairing:{" "}
              <Link href="/dashboard/devices" className="font-semibold underline">
                Devices
              </Link>
              . Webhook URL, secret, and delivery log:{" "}
              <Link href="/dashboard/webhooks" className="font-semibold underline">
                Webhooks & delivery
              </Link>
              .
            </p>
          </div>
        </Card>
      )}

    </div>
  );
}
