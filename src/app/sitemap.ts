import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { serviceSlugs, servicePath } from "@/lib/services-catalogue";
import { caseStudySlugs, caseStudyPath } from "@/lib/case-studies";

/**
 * Only publicly useful routes belong here.
 *
 * The account, portal and checkout routes are deliberately absent:
 * they are marked noindex, and listing a noindex URL in a sitemap is
 * a contradiction that Search Console reports as an error.
 *
 * `priority` is a hint about relative importance within this site
 * only — it says nothing to Google about ranking against other
 * sites. The commercial pages are weighted above the legal ones.
 */
const routes: {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/services", priority: 0.9, changeFrequency: "monthly" },

  /*
   * The service detail pages, generated from the catalogue so that a
   * new service cannot be published without a sitemap entry. Ranked
   * just below /services, which links to all of them.
   */
  ...serviceSlugs.map((slug) => ({
    path: servicePath(slug),
    priority: 0.8,
    changeFrequency: "monthly" as const,
  })),

  { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
  { path: "/case-studies", priority: 0.8, changeFrequency: "monthly" },

  /*
   * The case study detail pages, generated from the catalogue for the
   * same reason as the service pages above.
   */
  ...caseStudySlugs.map((slug) => ({
    path: caseStudyPath(slug),
    priority: 0.7,
    changeFrequency: "monthly" as const,
  })),

  { path: "/contact", priority: 0.7, changeFrequency: "yearly" },
  { path: "/about", priority: 0.6, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${base}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
