import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout preview · GressPay",
  robots: { index: false, follow: false },
};

export default function CheckoutPreviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
