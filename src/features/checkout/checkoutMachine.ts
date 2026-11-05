import type { TransactionStatus } from "@/lib/types/api";

/** UI-facing checkout phases. Maps onto API statuses without changing request behavior. */
export type CheckoutPhase =
  | "choosing"
  | "awaiting_payment"
  | "submitted_verifying"
  | "waiting_sms"
  | "success"
  | "expired"
  | "cancelled"
  | "failed"
  | "refunded"
  | "confirming_expiry";

export function resolveCheckoutPhase(input: {
  checkoutStatus: TransactionStatus;
  methodChosen: boolean;
  isPollingVerification: boolean;
  cancelMessage: string | null;
  secondsLeft: number;
}): CheckoutPhase {
  if (input.cancelMessage) return "cancelled";
  if (input.checkoutStatus === "COMPLETED") return "success";
  if (input.checkoutStatus === "EXPIRED") return "expired";
  if (input.checkoutStatus === "FAILED") return "failed";
  if (input.checkoutStatus === "REFUNDED") return "refunded";
  if (input.secondsLeft === 0) return "confirming_expiry";
  if (input.isPollingVerification) return "waiting_sms";
  if (!input.methodChosen) return "choosing";
  return "awaiting_payment";
}

export function formatSessionClock(secondsLeft: number): string {
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
