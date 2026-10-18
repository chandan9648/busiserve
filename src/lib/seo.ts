import type { Metadata } from "next";

import { getSiteUrl, SITE_NAME } from "@/lib/site-url";
import { contactDefaults } from "@/lib/site-data";

export const siteUrl = getSiteUrl();

/**
 * Per-page metadata.
 *
 * `canonical` must be set per page and never inherited. A canonical
 * declared once on the root layout is inherited by every child route,
 * which tells Google that /services, /pricing and the rest are all
 * duplicates of the homepage and should not be indexed separately —
 * the opposite of what is wanted.
 */
/**
 * Terms every page of this site is entitled to claim.
 *
 * Merged into each page's own keywords rather than repeated by hand,
 * so the brand and the location are never spelled two ways.
 */
export const baseKeywords = [
  "Busiserve",
  "Busiserve Infotech Solution",
  "software development company",
  "IT company in Noida",
  "web development company Noida",
] as const;

export function pageMetadata({
  title,
  description,
  path,
  keywords = [],
}: {
  title: string;
  description: string;
  path: string;
  /**
   * Page-specific terms, placed before the shared ones.
   *
   * Worth being plain about: Google has not used the keywords meta
   * tag as a ranking signal since 2009, and Bing treats a stuffed one
   * as a spam signal rather than a hint. These are kept short and
   * truthful because some smaller crawlers, site-search tools and
   * internal indexers still read them, and because an inaccurate one
   * is the only way this tag can actually cost anything.
   */
  keywords?: readonly string[];
}): Metadata {
  return {
    title,
    description,

    // De-duplicated, because a term repeated across both lists is
    // exactly the pattern that reads as stuffing.
    keywords: Array.from(new Set([...keywords, ...baseKeywords])),

    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: SITE_NAME,
      title: `${title} | ${SITE_NAME}`,
      description,
      locale: "en_IN",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${SITE_NAME}`,
      description,
      images: ["/og-image.png"],
    },
  };
}

/**
 * Account, portal and checkout routes.
 *
 * These hold nothing a searcher can use and some of them expose an
 * account surface, so they are kept out of the index entirely rather
 * than merely ranked low. `nocache` also keeps them out of cached
 * copies, and the referrer is suppressed so a URL carrying an order
 * reference is not handed to the next site.
 */
export const privatePageMetadata = (title: string): Metadata => ({
  title,
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  referrer: "no-referrer",
});

/** Absolute URL for a site-relative path, for use inside JSON-LD. */
export const absoluteUrl = (path: string) =>
  path === "/" ? siteUrl : `${siteUrl}${path}`;

export const ORGANIZATION_ID = `${siteUrl}/#organization`;
export const WEBSITE_ID = `${siteUrl}/#website`;

/**
 * Breadcrumb trail for a sub-page.
 *
 * Google uses this to replace the bare URL under a result with a
 * readable path, which is worth having on every page below the root.
 */
export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map(
      (item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: absoluteUrl(item.path),
      })
    ),
  };
}

/** The organisation's real postal address, split for schema.org. */
export const postalAddress = {
  "@type": "PostalAddress",
  streetAddress: "A1, Sector 59",
  addressLocality: "Noida",
  addressRegion: "Uttar Pradesh",
  addressCountry: "IN",
} as const;

export const organizationContact = {
  telephone: contactDefaults.phone,
  email: contactDefaults.email,
} as const;

/**
 * The service list as an OfferCatalog.
 *
 * Each service already has a title and a description in site-data;
 * restating them here lets a crawler read what the business actually
 * sells instead of inferring it from marketing copy.
 */
export function serviceCatalogSchema(
  services: readonly { title: string; description: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    name: "Software development and automation services",
    url: absoluteUrl("/services"),
    provider: { "@id": ORGANIZATION_ID },
    itemListElement: services.map((service, index) => ({
      "@type": "Offer",
      position: index + 1,
      itemOffered: {
        "@type": "Service",
        name: service.title,
        description: service.description,
        provider: { "@id": ORGANIZATION_ID },
        areaServed: { "@type": "Country", name: "India" },
      },
    })),
  };
}

/**
 * A single service, for its own detail page.
 *
 * `offers` is emitted only where a verified starting price exists.
 * An Offer without a price is noise, and an invented one is worse:
 * Google surfaces it next to the result.
 */
export function serviceSchema({
  name,
  description,
  path,
  startingPrice,
}: {
  name: string;
  description: string;
  path: string;
  startingPrice?: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: absoluteUrl(path),
    serviceType: name,
    provider: { "@id": ORGANIZATION_ID },
    areaServed: { "@type": "Country", name: "India" },
    ...(startingPrice
      ? {
          offers: {
            "@type": "Offer",
            url: absoluteUrl(path),
            priceCurrency: "INR",
            price: startingPrice,
            availability: "https://schema.org/InStock",
            description:
              "Indicative starting price for a one-time project, confirmed in a written proposal.",
          },
        }
      : {}),
  };
}

/**
 * FAQPage markup, which can earn an expandable block in the result.
 *
 * Google requires the same question and answer text to be present on
 * the page itself, so this must stay in step with what the FAQ
 * component renders.
 */
export function faqSchema(
  faqs: readonly { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** ContactPage, tying the contact route to the organisation record. */
export function contactPageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absoluteUrl("/contact"),
    mainEntity: {
      "@id": ORGANIZATION_ID,
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: organizationContact.telephone,
        email: organizationContact.email,
        areaServed: "IN",
        availableLanguage: ["en", "hi"],
      },
    },
  };
}

/**
 * AboutPage, naming the real team against the organisation record.
 *
 * The team cards are plain text in the markup, so a crawler has to
 * infer who these people are from the layout. Restating them here as
 * Person records — founders under `founder`, the rest under
 * `employee` — gives Google the names and roles explicitly, which is
 * what a stale snippet needs in order to be rewritten.
 */
export function aboutPageSchema(
  team: readonly { name: string; role: string; image: string }[]
) {
  const person = (member: { name: string; role: string; image: string }) => ({
    "@type": "Person",
    name: member.name,
    jobTitle: member.role,
    image: absoluteUrl(member.image),
    worksFor: { "@id": ORGANIZATION_ID },
  });

  const isFounder = (role: string) => /founder/i.test(role);

  return {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    url: absoluteUrl("/about"),
    mainEntity: {
      "@id": ORGANIZATION_ID,
      founder: team.filter((m) => isFounder(m.role)).map(person),
      employee: team.filter((m) => !isFounder(m.role)).map(person),
    },
  };
}
