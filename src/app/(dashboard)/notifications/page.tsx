"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export default function NotificationsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Notifications</h1>
      <Card className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
        Telegram, Discord, and email alert templates are planned for Wave B. Instant test alerts are available under{" "}
        <a href="/dashboard/settings" className="font-semibold underline">
          Settings
        </a>
        .
      </Card>
    </div>
  );
}
