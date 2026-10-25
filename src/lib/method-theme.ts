import { MethodTheme, PaymentMethod } from "./types/api";

export const METHOD_THEMES: Record<string, MethodTheme> = {
  bkash: { primary: "#E2136E", text: "#FFFFFF", button: "#E2136E", buttonText: "#FFFFFF" },
  nagad: { primary: "#F6921E", text: "#FFFFFF", button: "#F6921E", buttonText: "#FFFFFF" },
  rocket: { primary: "#8C3494", text: "#FFFFFF", button: "#8C3494", buttonText: "#FFFFFF" },
  upay: { primary: "#E31E24", text: "#FFFFFF", button: "#E31E24", buttonText: "#FFFFFF" },
  cellfin: { primary: "#0B6E4F", text: "#FFFFFF", button: "#0B6E4F", buttonText: "#FFFFFF" },
  upi_qr: { primary: "#097939", text: "#FFFFFF", button: "#097939", buttonText: "#FFFFFF" },
  phonepe: { primary: "#5F259F", text: "#FFFFFF", button: "#5F259F", buttonText: "#FFFFFF" },
  easypaisa: { primary: "#00A651", text: "#FFFFFF", button: "#00A651", buttonText: "#FFFFFF" },
  jazzcash: { primary: "#D71920", text: "#FFFFFF", button: "#D71920", buttonText: "#FFFFFF" },
  esewa: { primary: "#60BB46", text: "#0B1220", button: "#60BB46", buttonText: "#0B1220" },
  khalti: { primary: "#5C2D91", text: "#FFFFFF", button: "#5C2D91", buttonText: "#FFFFFF" },
  binance_pay: { primary: "#F0B90B", text: "#0B0E11", button: "#F0B90B", buttonText: "#0B0E11" },
  bybit_pay: { primary: "#F7A600", text: "#0B0E11", button: "#F7A600", buttonText: "#0B0E11" },
  usdt_trc20: { primary: "#26A17B", text: "#FFFFFF", button: "#26A17B", buttonText: "#FFFFFF" },
};

const FALLBACK: MethodTheme = {
  primary: "#22D3EE",
  text: "#0B1220",
  button: "#22D3EE",
  buttonText: "#0B1220",
};

export function railTheme(method?: PaymentMethod | null): MethodTheme {
  if (!method) return FALLBACK;
  return method.theme ?? METHOD_THEMES[method.code] ?? FALLBACK;
}

export function foldTxid(method: PaymentMethod | undefined, value: string): string {
  if (!method) return value;
  if (method.code === "usdt_trc20") return value.trim();
  if (method.category === "crypto") return value.trim();
  return value.trim().toUpperCase();
}
