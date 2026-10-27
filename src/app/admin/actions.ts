"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin-guard";

export async function resetTurns(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  await createAdminClient().from("profiles").update({ daily_turns_used: 0 }).eq("id", id);
  revalidatePath("/admin/users");
}

export async function setPlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const plan = String(formData.get("plan")) === "pro" ? "pro" : "free";
  // Pro = unlimited daily turns.
  await createAdminClient()
    .from("profiles")
    .update({ plan, daily_turn_limit: plan === "pro" ? null : 20 })
    .eq("id", id);
  revalidatePath("/admin/users");
}

export async function deleteUser(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  if (id === admin.id) return; // never delete yourself
  // Deleting the auth user cascades to profile, sessions, turns and flashcards.
  await createAdminClient().auth.admin.deleteUser(id);
  revalidatePath("/admin/users");
}

export async function createScenario(formData: FormData) {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const system_prompt = String(formData.get("system_prompt") ?? "").trim();
  if (!title || !system_prompt) return;
  await createAdminClient().from("scenarios").insert({
    title: title.slice(0, 120),
    category: String(formData.get("category") ?? "Daily Life"),
    difficulty: String(formData.get("difficulty") ?? "A1"),
    description: String(formData.get("description") ?? "").slice(0, 300),
    system_prompt: system_prompt.slice(0, 2000),
    duration_min: Math.max(1, Math.min(60, Number(formData.get("duration_min")) || 5)),
  });
  revalidatePath("/admin/scenarios");
}

export async function toggleScenario(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const active = String(formData.get("active")) === "true";
  await createAdminClient().from("scenarios").update({ is_active: !active }).eq("id", id);
  revalidatePath("/admin/scenarios");
}

export async function deleteScenario(formData: FormData) {
  await requireAdmin();
  await createAdminClient().from("scenarios").delete().eq("id", Number(formData.get("id")));
  revalidatePath("/admin/scenarios");
}
