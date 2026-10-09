import type { Metadata } from "next";
import AuthForm from "@/components/portal/AuthForm";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Login");

export default function LoginPage() {
  return <AuthForm mode="login" />;
}