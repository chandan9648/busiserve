import type { Metadata } from "next";
import Portal from "@/components/portal/Portal";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("My Dashboard");

export default function DashboardPage() {
  return <Portal />;
}