import type { Metadata } from "next";

import {
  Manrope,
  Hanken_Grotesk,
} from "next/font/google";

import "./globals.css";

import Header from "@/components/Header";
import JsonLd from "@/components/JsonLd";
import ToastProvider from "@/components/providers/ToastProvider";
import SmoothScroll from "@/components/SmoothScroll";
import VisitTracker from "@/components/VisitTracker";
import { SITE_NAME } from "@/lib/site-url";
import {
  ORGANIZATION_ID,
  WEBSITE_ID,
  organizationContact,
  postalAddress,
  siteUrl,
} from "@/lib/seo";
import { socialLinks } from "@/lib/site-data";

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

const description =
  "Busiserve Infotech Solution builds scalable websites, mobile apps, enterprise software, CMS, CRM and intelligent automation for startups and enterprises.";

export const metadata: Metadata = {
  // Without this, Next.js cannot resolve the canonical and Open Graph
  // URLs below into absolute ones, and emits them relative — which
  // search engines ignore.
  metadataBase: new URL(siteUrl),

  title: {
    default: `${SITE_NAME} | Web & App Development Company`,
    template: `%s | ${SITE_NAME}`,
  },

  description,

  // Google picks the name it shows above a result from these signals
  // rather than from the <title> alone, so the brand name is repeated
  // in each of them instead of being spelled differently per place.
  applicationName: SITE_NAME,

  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description,
    locale: "en_IN",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },

  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description,
    images: ["/og-image.png"],
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
 * Organization, LocalBusiness and WebSite structured data.
 *
 * This is the one place a site can state its own identity to Google
 * in a machine-readable form: the name it should show above a result,
 * the address and phone it cross-checks against other listings, and
 * the profiles that confirm the same business. It is read alongside
 * the title rather than in competition with it.
 *
 * ProfessionalService is used rather than a plain Organization so the
 * address and service area are understood as a real place of
 * business, which is what local results are drawn from.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": ["Organization", "ProfessionalService"],
      "@id": ORGANIZATION_ID,
      name: SITE_NAME,
      alternateName: "Busiserve",
      url: siteUrl,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon-512.png`,
        width: 512,
        height: 512,
      },
      image: `${siteUrl}/og-image.png`,
      description,
      address: postalAddress,
      telephone: organizationContact.telephone,
      email: organizationContact.email,
      areaServed: [
        { "@type": "Country", name: "India" },
        { "@type": "AdministrativeArea", name: "Delhi NCR" },
      ],
      knowsAbout: [
        "Web Development",
        "Mobile App Development",
        "CMS Development",
        "CRM Solutions",
        "ERP Development",
        "API Development",
        "Data Science",
        "AI Agent Development",
        "Workflow Automation",
      ],
      ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
    },
    {
      "@type": "WebSite",
      "@id": WEBSITE_ID,
      name: SITE_NAME,
      alternateName: "Busiserve",
      url: siteUrl,
      publisher: { "@id": ORGANIZATION_ID },
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
        <JsonLd data={structuredData} />

        <SmoothScroll />
        <ToastProvider />
        <VisitTracker />

        <Header />

        {children}
      </body>
    </html>
  );
}
