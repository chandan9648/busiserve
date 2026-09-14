import Portal from "@/components/portal/Portal";

export const metadata = {
  title: "Admin Profile",
};

export default function AdminProfilePage() {
  return <Portal admin profileOnly />;
}