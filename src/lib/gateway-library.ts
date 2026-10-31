/** Curated gateway library labels + logo paths (real brand assets under public/methods/). */
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

/** Filename (with extension) for each curated rail — prefer official/Wikimedia/press assets. */
export const GATEWAY_LOGO_FILES: Record<string, string> = {
  bkash: "bkash.svg",
  nagad: "nagad.svg",
  rocket: "rocket.svg",
  upay: "upay.png",
  cellfin: "cellfin.png",
  bangla_qr: "bangla_qr.svg",
  bangla_qr_v2: "bangla_qr_v2.svg",
  pathaopay: "pathaopay.svg",
  mcash: "mcash.png",
  ok_wallet: "ok_wallet.png",
  tap: "tap.png",
  aamar_pay: "aamar_pay.png",
  usdt_trc20: "usdt_trc20.png",
  binance_pay: "binance_pay.png",
  bybit_pay: "bybit_pay.png",
};

export function gatewayLogoPath(code: string): string {
  const key = code.toLowerCase();
  const file = GATEWAY_LOGO_FILES[key] ?? `${key}.svg`;
  return `/methods/${file}`;
}

export function gatewayShortLabel(code: string, fallback?: string): string {
  return GATEWAY_SHORT_LABELS[code] ?? fallback ?? code;
}
