import type { Metadata } from "next";
import AuthForm from "@/components/portal/AuthForm";
import { privatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = privatePageMetadata("Forgot Password");

export default function ForgotPasswordPage() {
  return <AuthForm mode="reset" />;
}