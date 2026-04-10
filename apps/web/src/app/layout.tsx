import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://edgepush.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "edgepush - Open source push notifications at the edge",
    template: "%s - edgepush",
  },
  description:
    "Open source alternative to Expo Push Notification Service. Send native iOS and Android pushes through a single API, deployed on Cloudflare Workers. Free, MIT licensed.",
  keywords: [
    "push notifications",
    "APNs",
    "FCM",
    "Expo Push alternative",
    "open source",
    "Cloudflare Workers",
    "iOS",
    "Android",
    "edge computing",
  ],
  authors: [
    { name: "Akshit Kr Nagpal", url: "https://github.com/akshitkrnagpal" },
  ],
  creator: "Akshit Kr Nagpal",
  publisher: "edgepush",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "edgepush",
    title: "edgepush - Open source push notifications at the edge",
    description:
      "Open source alternative to Expo Push Notification Service. Built on Cloudflare Workers.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "edgepush - Open source push notifications at the edge",
    description:
      "Open source alternative to Expo Push Notification Service. Built on Cloudflare Workers.",
    creator: "@akshit_io",
  },
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "edgepush",
  description:
    "Open source alternative to Expo Push Notification Service, built on Cloudflare Workers.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  license: "https://opensource.org/licenses/MIT",
  author: {
    "@type": "Person",
    name: "Akshit Kr Nagpal",
    url: "https://github.com/akshitkrnagpal",
  },
  softwareVersion: "0.0.0",
  url: SITE_URL,
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
