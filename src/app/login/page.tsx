import AuthForm from "@/components/portal/AuthForm";

export const metadata = { title: "Login" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}