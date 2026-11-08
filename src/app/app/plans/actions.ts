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
async function setOwnPlan(plan: "free" | "pro") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await createAdminClient()
    .from("profiles")
    .update({ plan, daily_turn_limit: plan === "pro" ? null : 20 })
    .eq("id", user.id);
  revalidatePath("/app", "layout");
}

export async function subscribePro() {
  await setOwnPlan("pro");
  redirect("/app/plans?subscribed=1");
}

export async function cancelPro() {
  await setOwnPlan("free");
  redirect("/app/plans?cancelled=1");
}
