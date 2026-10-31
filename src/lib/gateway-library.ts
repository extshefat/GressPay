/** Curated gateway library labels + logo paths (public/methods/*.svg). */
export const GATEWAY_SHORT_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  upay: "Upay",
  cellfin: "Cellfin",
  bangla_qr: "Bangla QR",
  bangla_qr_v2: "Bangla QR V2",
  pathaopay: "Pathao Pay",
  mcash: "mCash",
  ok_wallet: "OK Wallet",
  tap: "Tap",
  aamar_pay: "aamarPay",
  usdt_trc20: "USDT TRC-20",
  binance_pay: "Binance Pay",
  bybit_pay: "Bybit Pay",
};

export function gatewayLogoPath(code: string): string {
  return `/methods/${code.toLowerCase()}.svg`;
}

export function gatewayShortLabel(code: string, fallback?: string): string {
  return GATEWAY_SHORT_LABELS[code] ?? fallback ?? code;
}
