import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Throws a redirect/404 unless the current user is an admin. Call at the top of every admin page and action. */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role !== "admin") notFound();
  return user;
}
