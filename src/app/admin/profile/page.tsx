import type { Metadata } from "next";

import Portal from "@/components/portal/Portal";
import { privatePageMetadata } from "@/lib/seo";

/*
 * An account surface, so it is kept out of the index entirely.
 *
 * This route was the one portal page with no metadata of its own: it
 * inherited the site-wide title and description from the root layout
 * and was therefore crawlable and indexable like a marketing page,
 * while /admin and /dashboard beside it were not.
 */
export const metadata: Metadata = privatePageMetadata("Admin Profile");

export default function AdminProfilePage() {
  return <Portal profileOnly />;
}