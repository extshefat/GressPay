import type { CheckoutSession, PaymentMethod, TransactionStatus } from "@/lib/types/api";

export type CheckoutStep = "choose" | "payer" | "payment" | "verify";
export type CheckoutPhase = "choosing" | "payer_details" | "awaiting_payment" | "submitted_verifying" | "waiting_sms" | "success" | "expired" | "cancelled" | "failed" | "refunded" | "confirming_expiry";
export type PaymentCategory = "mobile" | "crypto" | "india" | "bank" | "other";
export const PAYMENT_CATEGORIES = [
  { id: "mobile", label: "Mobile payment", detail: "Mobile wallets" },
  { id: "crypto", label: "Crypto", detail: "Provider / on-chain" },
  { id: "india", label: "Indian payment", detail: "India / UPI" },
  { id: "bank", label: "Bank transfer", detail: "Bank accounts" },
] as const;
const MFS_CODES = new Set(["bkash", "nagad", "rocket", "upay", "cellfin", "bangla_qr", "bangla_qr_v2"]);
const CRYPTO_CODES = new Set(["binance_pay", "bybit_pay", "usdt_trc20"]);
export function methodKey(method: PaymentMethod): string { return method.gatewayId || method.code; }
export function paymentCategory(method: PaymentMethod): PaymentCategory {
  const code = method.code.toLowerCase();
  if (method.category === "crypto" || CRYPTO_CODES.has(code)) return "crypto";
  if (method.country === "IN") return "india";
  if (method.category === "mfs" || MFS_CODES.has(code)) return "mobile";
  if (method.category === "bank_upi") return "bank";
  return "other";
}
export function isMobileMethod(method?: PaymentMethod): boolean { return !!method && method.country === "BD" && paymentCategory(method) === "mobile"; }
export function isSmsAuto(session: CheckoutSession, method?: PaymentMethod): boolean { return isMobileMethod(method) && session.verificationMode === "sms_auto" && method?.requiresTxidInput === false; }
/** A PENDING invoice alone is not evidence that its buyer submitted a payment. */
export function hasSubmittedPayment(session: CheckoutSession): boolean {
  return session.paymentStatus === "PENDING" && session.awaitingEvidence === true && !!(session.submittedTxid || session.submittedMethod || session.submittedGateway);
}
export function initialMethod(session: CheckoutSession): PaymentMethod | undefined {
  return session.availableMethods.find(method => !!session.submittedGateway && method.gatewayId === session.submittedGateway)
    || session.availableMethods.find(method => !!session.submittedMethod && method.code === session.submittedMethod);
}
export function resolveCheckoutPhase(input: {
  checkoutStatus: TransactionStatus; methodChosen: boolean; isPollingVerification: boolean;
  cancelMessage: string | null; secondsLeft: number; step?: CheckoutStep; isVerifying?: boolean; smsAuto?: boolean;
}): CheckoutPhase {
  if (input.cancelMessage) return "cancelled";
  if (input.checkoutStatus === "COMPLETED") return "success";
  if (input.checkoutStatus === "EXPIRED") return "expired";
  if (input.checkoutStatus === "FAILED") return "failed";
  if (input.checkoutStatus === "REFUNDED") return "refunded";
  if (input.secondsLeft <= 0) return "confirming_expiry";
  if (!input.methodChosen || input.step === "choose") return "choosing";
  if (input.isVerifying) return "submitted_verifying";
  if (input.isPollingVerification) return input.smsAuto ? "waiting_sms" : "submitted_verifying";
  if (input.step === "payer") return "payer_details";
  return "awaiting_payment";
}
export function formatSessionClock(secondsLeft: number): string {
  const total = Math.max(0, Math.floor(Number.isFinite(secondsLeft) ? secondsLeft : 0));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function remainingSeconds(expiresAt: string, now = Date.now()): number {
  const deadline = Date.parse(expiresAt);
  return Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;
}
export function normalizePayerNumber(value: string): string {
  const normalized = value.replace(/[০-৯]/g, digit => String("০১২৩৪৫৬৭৮৯".indexOf(digit))).replace(/[\s()-]/g, "");
  return normalized.replace(/^(?:\+?88)(?=01)/, "");
}
export function validPayerNumber(value: string): boolean { return /^01[3-9]\d{8}$/.test(normalizePayerNumber(value)); }
export function trxHint(method: PaymentMethod): string {
  if (method.trxHint) return method.trxHint;
  if (method.code === "usdt_trc20") return "Paste the 64-character TRON transaction hash from your wallet receipt.";
  if (method.code === "bybit_pay") return "Use the transfer / order ID from your Bybit payment receipt.";
  return `Copy the TrxID from your ${method.name} payment receipt. Do not enter your phone number or PIN.`;
}
export function validateReference(method: PaymentMethod, value: string, optional = false): string | undefined {
  const reference = value.trim();
  if (!reference) return optional ? undefined : "Enter the transaction reference from your payment receipt.";
  if (method.code === "usdt_trc20") return /^[a-f\d]{64}$/i.test(reference) ? undefined : "A TRON transaction hash contains exactly 64 hexadecimal characters.";
  // Do not invent provider-specific lengths; the backend performs authoritative checks.
  if (reference.length > 160 || /\s/.test(reference) || !/^[a-z\d_.:-]+$/i.test(reference)) return "Paste only the transaction ID, without spaces or the rest of the receipt.";
  return undefined;
}
