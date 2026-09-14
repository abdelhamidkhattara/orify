import { DM_Sans, Tajawal } from "next/font/google";
import "./globals.css";
import { getLocale, dirFor } from "@/lib/locale";
import { getAppUrl } from "@/lib/env";
import type { Metadata, Viewport } from "next";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

const appUrl = getAppUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Orify",
    template: "%s · Orify",
  },
  description: "Un QR. Toute la boutique.",
  applicationName: "Orify",
  authors: [{ name: "Orify" }],
  creator: "Orify",
  publisher: "Orify",
  keywords: [
    "Orify",
    "QR",
    "boutique",
    "WhatsApp",
    "Instagram",
    "magasin",
    "page QR",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
    shortcut: ["/favicon.ico"],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg",
        color: "#C81E3A",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Orify",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    url: appUrl,
    siteName: "Orify",
    title: "Orify",
    description: "Un QR. Toute la boutique.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Orify",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orify",
    description: "Un QR. Toute la boutique.",
    images: ["/og.png"],
  },
  other: {
    "msapplication-TileColor": "#F6F4F0",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F4F0" },
    { media: "(prefers-color-scheme: dark)", color: "#F6F4F0" },
  ],
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const dir = dirFor(locale);

  return (
    <html lang={locale} dir={dir} className={`${dmSans.variable} ${tajawal.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
