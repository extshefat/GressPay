
import React from "react";
import { Navbar } from "@/features/marketing/components/Navbar";
import { Footer } from "@/features/marketing/components/Footer";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen bg-void">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}