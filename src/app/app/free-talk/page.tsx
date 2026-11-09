import { createClient } from "@/lib/supabase/server";
import { langCode } from "@/lib/languages";
import FreeTalk from "./FreeTalk";

export default async function FreeTalkPage({ searchParams }: { searchParams: { tab?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();
  return (
    <FreeTalk
      speechLang={langCode(profile?.target_language ?? "")}
      language={profile?.target_language ?? undefined}
      nativeLanguage={profile?.native_language ?? "English"}
      initialTab={searchParams.tab === "vocabulary" ? "vocabulary" : "talk"}
    />
  );
}
