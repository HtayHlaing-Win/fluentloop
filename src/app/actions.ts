"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LANGUAGES, LEVELS } from "@/lib/languages";

export async function signOut() {
  await createClient().auth.signOut();
  redirect("/login");
}

export async function updateProfile(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const display_name = String(formData.get("display_name") ?? "").trim().slice(0, 40);
  const target_language = String(formData.get("target_language") ?? "");
  const level = String(formData.get("level") ?? "");
  if (!display_name) return;
  if (!LANGUAGES.some((l) => l.name === target_language)) return;
  if (!(LEVELS as readonly string[]).includes(level)) return;

  // RLS plus column-level grants mean only these three columns can change.
  await supabase.from("profiles").update({ display_name, target_language, level }).eq("id", user.id);
  revalidatePath("/app", "layout");
}
