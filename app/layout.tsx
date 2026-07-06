import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";
import AppInit from "@/components/AppInit";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SiteHeader from "@/components/SiteHeader";
import { ToastProvider } from "@/components/Toaster";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

// Distinctive, warm display serif for the brand and headings.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Luggist — Packing Tracker",
  description:
    "Create packing inventories, assign items to bags and packing cubes, and track your progress.",
  applicationName: "Luggist",
  appleWebApp: {
    capable: true,
    title: "Luggist",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fffaf4" },
    { media: "(prefers-color-scheme: dark)", color: "#2a201c" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Runs before paint to pick the saved/preferred theme and avoid a flash.
const themeInit = `(function(){try{var t=localStorage.getItem("luggist-theme");if(!t){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"sunsetdark":"sunset";}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="sunset"
      suppressHydrationWarning
      className={`${outfit.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <AppInit />
        <ServiceWorkerRegister />
        <ToastProvider>
          <SiteHeader />
          <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
