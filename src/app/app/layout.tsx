import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <>
      <nav className="nav" aria-label="Main">
        <Link className="brand" href="/app/scenarios">FluentLoop</Link>
        <Link href="/app/scenarios">Scenarios</Link>
        <Link href="/app/free-talk">Free Talk</Link>
        <Link href="/app/flashcards">Practice</Link>
        <Link href="/app/dashboard">Dashboard</Link>
        <Link href="/app/profile">{profile?.display_name ?? "Profile"}</Link>
        {profile?.role === "admin" && <Link href="/admin">Admin</Link>}
        <form action={signOut} className="inline">
          <button className="btn secondary">Sign out</button>
        </form>
      </nav>
      <main className="wrap">{children}</main>
    </>
  );
}
