/**
 * The site's canonical origin.
 *
 * robots.txt and sitemap.xml are absolute-URL documents: a wrong
 * origin here does not break a page, it tells Google to crawl the
 * wrong host. The previous fallback was `http://localhost:3000`, and
 * because `SITE_URL` is not set in the deployment, that is the host
 * the live robots.txt and sitemap.xml actually advertised — so the
 * sitemap pointed at nothing crawlable and the real pages were only
 * ever found by following links.
 *
 * The production domain is therefore the fallback, and localhost is
 * used only when the environment says it is a local dev server.
 */
export const PRODUCTION_SITE_URL = "https://www.busiserve.in";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

export function getSiteUrl(): string {
  // An explicit value always wins, so a preview or a self-hosted
  // deployment can override the domain without a code change.
  const explicit = process.env.SITE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return stripTrailingSlash(explicit);

  // Vercel preview and branch deployments: use their own hostname so
  // a preview never claims to be the production domain.
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV;
  const vercelHost = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;
  if (vercelEnv && vercelEnv !== "production" && vercelHost) {
    return stripTrailingSlash(`https://${vercelHost}`);
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }

  return PRODUCTION_SITE_URL;
}

export const SITE_NAME = "Busiserve Infotech Solution";
export const SITE_SHORT_NAME = "Busiserve";
