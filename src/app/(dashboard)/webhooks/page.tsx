"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export default function WebhookSettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Webhook settings</h1>
      <Card className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
        Delivery logs and advanced webhook routing will ship in a later release. Configure your webhook URL and
        signing secret under{" "}
        <a href="/dashboard/api-keys" className="font-semibold underline">
          API &amp; Webhooks
        </a>{" "}
        today.
      </Card>
    </div>
  );
}
