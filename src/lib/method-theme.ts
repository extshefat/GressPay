import { MethodTheme, PaymentMethod } from "./types/api";

export { METHOD_THEMES } from "./design/tokens";
import { METHOD_THEMES, FALLBACK } from "./design/tokens";

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
