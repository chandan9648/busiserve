import type { Metadata } from "next";
import Portal from "@/components/portal/Portal";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Admin Profile");

export default function AdminProfilePage() {
  return <Portal admin profileOnly />;
}