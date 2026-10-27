import { notFound } from "next/navigation";
import Conversation from "@/components/Conversation";
import { createClient } from "@/lib/supabase/server";
import { langCode } from "@/lib/languages";

export default async function PracticePage({ params }: { params: { scenarioId: string } }) {
  const id = Number(params.scenarioId);
  if (!Number.isInteger(id)) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: scenario }, { data: profile }] = await Promise.all([
    supabase.from("scenarios").select("id, title").eq("id", id).eq("is_active", true).maybeSingle(),
    supabase.from("profiles").select("target_language").eq("id", user!.id).single(),
  ]);
  if (!scenario) notFound();

  return (
    <Conversation
      scenarioId={scenario.id}
      title={scenario.title}
      speechLang={langCode(profile?.target_language ?? "")}
    />
  );
}
