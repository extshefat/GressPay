"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { ApiCredentials } from "@/lib/types/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/components/ui/copy-field";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import {
  RefreshCw,
  Send,
  Lock,
  ShieldCheck,
  KeyRound,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ApiKeysPage() {
  const { success, error: toastError } = useToast();

  const [credentials, setCredentials] = useState<ApiCredentials | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Ping State
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [isPinging, setIsPinging] = useState(false);

  const loadCredentials = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getApiCredentials();
      setCredentials(data);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load API credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCredentials();
  }, []);

  const handleTestPing = async () => {
    setIsPinging(true);
    setPingStatus(null);
    try {
      const res = await api.testWebhookPing();
      const msg = res.message || "Webhook test ping dispatched successfully.";
      setPingStatus(msg);
      success(msg, "Webhook Ping Delivered");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Webhook test ping failed.";
      setPingStatus(msg);
      toastError(msg, "Delivery Error");
    } finally {
      setIsPinging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            API Keys & Webhooks
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Authenticate server-side checkout requests and verify HMAC SHA-256 webhook deliveries.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadCredentials}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        >
          Refresh Keys
        </Button>
      </div>

      {/* Security alert */}
      <div className="p-4 rounded-xl border border-teal-200/80 bg-teal-50/50 dark:border-teal-900/60 dark:bg-zinc-900/40 flex items-start gap-3 text-xs">
        <Lock className="w-4 h-4 text-[#077C74] dark:text-[#1BD1C0] shrink-0 mt-0.5" />
        <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Keep your secret keys safe. Never commit them to version control or expose them in client-side code. Use <code className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">gp_live_</code> for production and <code className="font-mono text-zinc-900 dark:text-zinc-100 font-bold">gp_test_</code> for sandboxing.
        </p>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Credentials Notice">
          {errorMessage}
        </Alert>
      )}

      {credentials && (
        <div className="space-y-6">
          {/* Live Production Card */}
          <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Live Production Environment
                </h3>
                <Badge variant="emerald" size="sm" dot>
                  Live Ledger
                </Badge>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Real Funds</span>
            </div>

            <div className="space-y-4">
              <CopyField
                label="Public Key"
                value={credentials.livePublicKey || "gp_live_pk_unavailable"}
              />
              <CopyField
                label="Secret Key (Keep Confidential)"
                value={credentials.liveSecretKey || "gp_live_sk_unavailable"}
                masked
                canUnmask
              />
            </div>
          </Card>

          {/* Test Sandbox Card */}
          <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Sandbox Test Environment
                </h3>
                <Badge variant="slate" size="sm" dot>
                  Test Ledger
                </Badge>
              </div>
              <span className="text-[11px] font-mono text-zinc-400">Simulation Only</span>
            </div>

            <div className="space-y-4">
              <CopyField
                label="Public Key (Test)"
                value={credentials.sandboxPublicKey || "gp_test_pk_unavailable"}
              />
              <CopyField
                label="Secret Key (Test)"
                value={credentials.sandboxSecretKey || "gp_test_sk_unavailable"}
                masked
                canUnmask
              />
            </div>
          </Card>

          {/* Webhook Signatures Card */}
          <Card className="p-6 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Webhook Signature Secret
                </h3>
                <Badge variant="cyan" size="sm">
                  HMAC SHA-256
                </Badge>
              </div>
              <Link
                href="/dashboard/settings"
                className="text-xs text-[#077C74] dark:text-[#1BD1C0] hover:underline flex items-center gap-1 font-medium"
              >
                <span>Configure URL</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            <div className="space-y-4">
              <CopyField
                label="Signing Secret"
                value={credentials.webhookSecret || "whsec_unavailable"}
                masked
                canUnmask
              />

              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Webhook Destination:
                  </span>
                  <div className="font-mono text-zinc-500 mt-0.5 truncate max-w-sm">
                    {credentials.webhookUrl || "No endpoint configured (configure in Settings)"}
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleTestPing}
                  isLoading={isPinging}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Send Test Ping
                </Button>
              </div>

              {pingStatus && (
                <div className="text-xs font-mono p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300">
                  {pingStatus}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
