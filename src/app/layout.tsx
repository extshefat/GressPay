import { THEME_SCRIPT } from "@/lib/theme-script";
import { uiFont, displayFont, codeFont, bengaliFont } from "@/lib/design/fonts";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: "GressPay — Bangladesh MFS, Binance Pay & USDT",
  description:
    "First release: bKash and Nagad via your configured wallet + SMS companion, Binance Pay checkout, and USDT TRC-20 on-chain verification.",
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
