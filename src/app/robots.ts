import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      /**
       * Only the API is blocked here.
       *
       * The account, portal and checkout routes are kept crawlable on
       * purpose, even though they must not be indexed. `noindex` is a
       * page-level directive, so a crawler has to fetch the page to
       * read it; blocking those paths here would hide the directive
       * and the URLs could still surface as bare links. Crawlable +
       * noindex is what actually removes them.
       *
       * /api/ returns JSON and can carry no meta tag, so robots.txt
       * is the only place it can be excluded.
       */
      disallow: ["/api/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
