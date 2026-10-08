import type { Metadata } from "next";

import {
  Manrope,
  Hanken_Grotesk,
} from "next/font/google";

import "./globals.css";

import Header from "@/components/Header";
import ToastProvider from "@/components/providers/ToastProvider";
import SmoothScroll from "@/components/SmoothScroll";
import VisitTracker from "@/components/VisitTracker";
import { getSiteUrl, SITE_NAME } from "@/lib/site-url";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});

const siteUrl = getSiteUrl();

const description =
  "Busiserve Infotech Solution builds scalable websites, mobile apps, enterprise software, CMS, CRM and intelligent automation for startups and enterprises.";

export const metadata: Metadata = {
  // Without this, Next.js cannot resolve the canonical and Open Graph
  // URLs below into absolute ones, and emits them relative — which
  // search engines ignore.
  metadataBase: new URL(siteUrl),

  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },

  description,

  // Google picks the name it shows above a result from these signals
  // rather than from the <title> alone, so the brand name is repeated
  // in each of them instead of being spelled differently per place.
  applicationName: SITE_NAME,

  alternates: {
    canonical: "/",
  },

  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description,
    locale: "en_IN",
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description,
  },

  icons: {
    // favicon.ico carries 16/32/48 for the tab strip and for browsers
    // that still request /favicon.ico directly; the PNGs cover the
    // larger slots (bookmarks, Android home screen).
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180" },
  },
};

/**
 * Organization and WebSite structured data.
 *
 * This is the one place a site can state its own name to Google in a
 * machine-readable form. It is what stops the result header falling
 * back to the bare domain, and it is read alongside the title rather
 * than in competition with it.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: SITE_NAME,
      alternateName: "Busiserve",
      url: siteUrl,
      logo: `${siteUrl}/icon-512.png`,
      description,
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      name: SITE_NAME,
      alternateName: "Busiserve",
      url: siteUrl,
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: "en-IN",
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${hanken.variable}`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />

        <SmoothScroll />
        <ToastProvider />
        <VisitTracker />

        <Header />

        {children}
      </body>
    </html>
  );
}
