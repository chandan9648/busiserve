import Portal from "@/components/portal/Portal";

export const metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <Portal admin />;
}