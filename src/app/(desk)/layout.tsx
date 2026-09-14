import { AppShell } from "@/components/layout/AppShell";
import { requireAdminPage } from "@/lib/auth-helpers";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return <AppShell email={admin.user.email ?? ""}>{children}</AppShell>;
}
