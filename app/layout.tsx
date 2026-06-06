import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppInit from "@/components/AppInit";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SiteHeader from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luggist — Packing Tracker",
  description:
    "Create packing inventories, assign items to bags and packing cubes, and track your progress.",
  applicationName: "Luggist",
  appleWebApp: {
    capable: true,
    title: "Luggist",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AppInit />
        <ServiceWorkerRegister />
        <SiteHeader />
        <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
          {children}
        </main>
      </body>
    </html>
  );
}
