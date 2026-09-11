import AuthForm from "@/components/portal/AuthForm";

export const metadata = { title: "Reset Password" };

export default function ForgotPasswordPage() {
  return <AuthForm mode="reset" />;
}