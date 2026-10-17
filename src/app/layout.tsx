import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RentRakshak | Zero-Trust Rental Escrow & Verification Vault",
  description:
    "Zero-trust rental deposit escrow gateway with dual-stream voice authenticity and biometric identity verification.",
  keywords: [
    "RentRakshak",
    "rental escrow",
    "voice verification",
    "rental scam prevention",
    "zero-trust deposit",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#09090b] text-zinc-100 font-sans">
        {children}
      </body>
    </html>
  );
}
