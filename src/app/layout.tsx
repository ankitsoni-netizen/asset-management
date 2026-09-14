import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ProcessingProvider } from "@/components/status/Processing";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0d14",
  interactiveWidget: "resizes-content",
};

export const metadata: Metadata = {
  title: "Cloutflow Asset Desk",
  description: "Local inventory, employee roster, and asset allocation for Cloutflow.",
  icons: {
    icon: "/brand/cloutflow-favicon.png",
    apple: "/brand/cloutflow-favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ProcessingProvider>{children}</ProcessingProvider>
      </body>
    </html>
  );
}
