import AuthForm from "@/components/portal/AuthForm";

export const metadata = {
  title: "Create Account",
};

export default function RegisterPage() {
  return <AuthForm mode="register" />;
}