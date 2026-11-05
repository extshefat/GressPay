import { THEME_SCRIPT } from "@/lib/theme-script";
import { uiFont, displayFont, codeFont, bengaliFont } from "@/lib/design/fonts";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://gresspay.extxcheats.com"),
  title: {
    default: "GressPay — Collect bKash, Nagad & USDT into your wallets",
    template: "%s · GressPay",
  },
  description:
    "Collect bKash, Nagad, Rocket, Upay and USDT into your own wallets. GressPay verifies SMS and crypto evidence server-side and never holds your money.",
  openGraph: {
    type: "website",
    siteName: "GressPay",
    title: "GressPay — Collect bKash, Nagad & USDT into your wallets",
    description:
      "Non-custodial payment verification for Bangladesh merchants. Companion SMS match, Binance Pay, USDT TRC-20, HMAC webhooks.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GressPay — Collect bKash, Nagad & USDT into your wallets",
    description: "Non-custodial payment verification. Never holds your money.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
      { url: "/brand/gresspay-app-icon.png", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/brand/gresspay-app-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${uiFont.variable} ${displayFont.variable} ${codeFont.variable} ${bengaliFont.variable} scroll-smooth`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_SCRIPT,
          }}
        />
      </head>
      <body className="min-h-screen bg-canvas font-sans text-ink dark:text-ink antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
