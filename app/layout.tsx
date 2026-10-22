import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "YAQQA AI — Your AI Business Mate",
    template: "%s | YAQQA AI",
  },
  description:
    "Your AI business mate. Manage customers, create content, organise business knowledge, and work smarter with YAQQA AI.",
  applicationName: "YAQQA AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#0b1020] text-slate-50">
        {children}
      </body>
    </html>
  );
}
