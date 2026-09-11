import Portal from "@/components/portal/Portal";

export const metadata = {
  title: "My Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardPage() {
  return <Portal />;
}