import Link from "next/link";
import { requireAdmin } from "@/lib/admin-guard";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <nav className="nav" aria-label="Admin">
        <Link className="brand" href="/admin">FluentLoop Admin</Link>
        <Link href="/admin">Overview</Link>
        <Link href="/admin/users">Learners</Link>
        <Link href="/admin/scenarios">Scenarios</Link>
        <Link href="/admin/sessions">Sessions</Link>
        <Link href="/app/scenarios">Back to app</Link>
      </nav>
      <main className="wrap">{children}</main>
    </>
  );
}
