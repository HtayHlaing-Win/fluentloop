import { createClient } from "@/lib/supabase/server";
import { langCode } from "@/lib/languages";
import FreeTalk from "./FreeTalk";

export default async function FreeTalkPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language")
    .eq("id", user!.id)
    .single();
  return <FreeTalk speechLang={langCode(profile?.target_language ?? "")} />;
}
