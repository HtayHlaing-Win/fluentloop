import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language")
    .eq("id", user.id)
    .single();

  const { data, error } = await supabase
    .from("flashcards")
    .select("id, word, translation, example, language")
    .eq("user_id", user.id)
    .eq("language", profile?.target_language ?? "Spanish")
    .lte("next_review", new Date().toISOString())
    .order("next_review", { ascending: true })
    .limit(30);
  if (error) return NextResponse.json({ error: "Could not load cards" }, { status: 500 });
  return NextResponse.json({ cards: data });
}
