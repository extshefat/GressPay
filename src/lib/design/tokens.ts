import type { MethodTheme } from "../types/api";
/** Dominant solid pixels sampled from the textured supplied lockup PNG. */
export const LOGO_COLORS = { teal: "#077C73", mint: "#1BD1C0", ink: "#081525" } as const;
export const GOOGLE_COLORS = ["#4285F4", "#34A853", "#FBBC05", "#EA4335"] as const;
/** QR encoding needs fixed high contrast, independent of the surrounding theme. */
export const QR_COLORS = { dark: "#081525", light: "#FBFAF7" } as const;
export const METHOD_THEMES: Record<string, MethodTheme> = {
  bkash: { primary: "#E2136E", text: "#FFFFFF", button: "#E2136E", buttonText: "#FFFFFF" },
  nagad: { primary: "#F6921E", text: "#081525", button: "#F6921E", buttonText: "#081525" },
  rocket: { primary: "#8C3494", text: "#FFFFFF", button: "#8C3494", buttonText: "#FFFFFF" },
  upay: { primary: "#E31E24", text: "#FFFFFF", button: "#E31E24", buttonText: "#FFFFFF" },
  cellfin: { primary: "#0B6E4F", text: "#FFFFFF", button: "#0B6E4F", buttonText: "#FFFFFF" },
  upi_qr: { primary: "#097939", text: "#FFFFFF", button: "#097939", buttonText: "#FFFFFF" },
  phonepe: { primary: "#5F259F", text: "#FFFFFF", button: "#5F259F", buttonText: "#FFFFFF" },
  easypaisa: { primary: "#00A651", text: "#081525", button: "#00A651", buttonText: "#081525" },
  jazzcash: { primary: "#D71920", text: "#FFFFFF", button: "#D71920", buttonText: "#FFFFFF" },
  esewa: { primary: "#60BB46", text: "#081525", button: "#60BB46", buttonText: "#081525" },
  khalti: { primary: "#5C2D91", text: "#FFFFFF", button: "#5C2D91", buttonText: "#FFFFFF" },
  binance_pay: { primary: "#F0B90B", text: "#0B0E11", button: "#F0B90B", buttonText: "#0B0E11" },
  bybit_pay: { primary: "#F7A600", text: "#0B0E11", button: "#F7A600", buttonText: "#0B0E11" },
  usdt_trc20: { primary: "#26A17B", text: "#081525", button: "#26A17B", buttonText: "#081525" },
};

export const FALLBACK: MethodTheme = {
  primary: "#077C73",
  text: "#FBFAF7",
  button: "#077C73",
  buttonText: "#FBFAF7",
};
