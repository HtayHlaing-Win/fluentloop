"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Demo billing: no payment is taken. The plan column is not writable by
 * learners (column-level grants), so the change goes through the server only,
 * for the signed-in user's own row.
 */
async function setOwnPlan(plan: "free" | "pro"): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Upsert, so it also works if this account's profile row was never created.
  const { data, error } = await createAdminClient()
    .from("profiles")
    .upsert({ id: user.id, plan, daily_turn_limit: plan === "pro" ? null : 20 }, { onConflict: "id" })
    .select("plan");
  // Check the write really happened, so a failure is never shown as a success.
  if (error) return error.message;
  if (!data?.length) return "The database did not confirm the change. Check SUPABASE_SERVICE_ROLE_KEY on the server.";
  revalidatePath("/app", "layout");
  return null;
}

export async function subscribePro() {
  const err = await setOwnPlan("pro");
  if (err) redirect(`/app/plans?error=${encodeURIComponent(err)}`);
  redirect("/app/plans?subscribed=1");
}

export async function cancelPro() {
  const err = await setOwnPlan("free");
  if (err) redirect(`/app/plans?error=${encodeURIComponent(err)}`);
  redirect("/app/plans?cancelled=1");
}
