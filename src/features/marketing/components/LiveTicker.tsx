"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

const TICKER_ITEMS = [
  { city: "Dhaka", method: "bKash", amount: "৳2,450" },
  { city: "Mumbai", method: "UPI QR", amount: "₹3,800" },
  { city: "Karachi", method: "Easypaisa", amount: "₨7,200" },
  { city: "Kathmandu", method: "eSewa", amount: "रू4,100" },
  { city: "Singapore", method: "USDT TRC-20", amount: "250 USDT" },
  { city: "Chittagong", method: "Nagad", amount: "৳1,500" },
  { city: "Delhi", method: "PhonePe", amount: "₹1,500" },
  { city: "Lahore", method: "JazzCash", amount: "₨12,000" },
];

export const LiveTicker: React.FC = () => {
  return (
    <div className="w-full bg-void-card/60 border-y border-void-border/80 overflow-hidden py-3 select-none backdrop-blur-md">
      <div className="flex items-center">
        <div className="px-4 shrink-0 flex items-center gap-2 border-r border-void-border/80 text-xs font-mono font-medium text-slate-400 tracking-wider">
          SAMPLE ROUTES
        </div>
        <div className="flex whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-8 animate-ticker">
            {TICKER_ITEMS.concat(TICKER_ITEMS).map((item, index) => (
              <div key={index} className="inline-flex items-center gap-2.5 text-xs text-slate-300 font-mono">
                <span className="font-semibold text-white">{item.city}</span>
                <span className="text-slate-500">·</span>
                <span className="text-brand-cyan">{item.method}</span>
                <span className="text-slate-100 font-semibold">{item.amount}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
