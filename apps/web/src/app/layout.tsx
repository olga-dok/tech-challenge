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
  title: "CV Screener",
  description:
    "Generate a corpus of CVs and ask grounded questions about the candidates.",
};

export default function RootLayout({
  children,
}: {
  // Spelled out rather than using Next's generated `LayoutProps<"/">`: that type
  // only exists once `.next/types` has been generated, which made `tsc --noEmit`
  // fail on a clean checkout.
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
