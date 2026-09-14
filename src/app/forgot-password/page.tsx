import AuthForm from "@/components/portal/AuthForm";

export const metadata = {
  title: "Forgot Password",
};

export default function ForgotPasswordPage() {
  return <AuthForm mode="reset" />;
}