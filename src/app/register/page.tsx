import type { Metadata } from "next";
import AuthForm from "@/components/portal/AuthForm";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Create Account");

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}