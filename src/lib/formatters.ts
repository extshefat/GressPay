
import { Currency, TransactionStatus } from "./types/api";

export function formatCurrency(amount: number, currency: Currency): string {
  const currencySymbols: Record<Currency, string> = {
    BDT: "৳",
    INR: "₹",
    PKR: "₨",
    NPR: "रू",
    USD: "$",
    USDT: "₮",
  };

  const symbol = currencySymbols[currency] || "";

  if (currency === "USDT" || currency === "USD") {
    return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }

  return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function truncateAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!address) return "";
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function getStatusColor(status: TransactionStatus): {
  bg: string;
  text: string;
  border: string;
  glow: string;
} {
  switch (status) {
    case "COMPLETED":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        border: "border-emerald-500/30",
        glow: "shadow-[0_0_12px_rgba(16,185,129,0.3)]",
      };
    case "PENDING":
      return {
        bg: "bg-amber-500/10",
        text: "text-amber-400",
        border: "border-amber-500/30",
        glow: "shadow-[0_0_12px_rgba(245,158,11,0.2)]",
      };
    case "FAILED":
    case "EXPIRED":
      return {
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        border: "border-rose-500/30",
        glow: "shadow-[0_0_12px_rgba(244,63,94,0.2)]",
      };
    case "REFUNDED":
      return {
        bg: "bg-sky-500/10",
        text: "text-sky-400",
        border: "border-sky-500/30",
        glow: "shadow-[0_0_12px_rgba(56,189,248,0.2)]",
      };
    default:
      return {
        bg: "bg-slate-500/10",
        text: "text-slate-400",
        border: "border-slate-500/30",
        glow: "",
      };
  }
}