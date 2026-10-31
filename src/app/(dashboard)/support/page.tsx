"use client";

import React from "react";
import { Card } from "@/components/ui/card";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Support</h1>
      <Card className="p-6 text-sm text-zinc-600 dark:text-zinc-400">
        Contact your platform operator for merchant support. Documentation lives on the{" "}
        <a href="/developers" className="font-semibold underline">
          Developers
        </a>{" "}
        page and in the dashboard API snippets.
      </Card>
    </div>
  );
}
