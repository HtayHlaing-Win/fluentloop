import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sm2 } from "@/lib/sm2";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { quality } = await req.json().catch(() => ({ quality: NaN }));
  if (![1, 3, 4, 5].includes(quality)) {
    return NextResponse.json({ error: "quality must be 1, 3, 4 or 5" }, { status: 400 });
  }

  const { data: card } = await supabase
    .from("flashcards")
    .select("interval_days, ease, repetitions")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const next = sm2(card, quality);
  const { error } = await supabase
    .from("flashcards")
    .update(next)
    .eq("id", params.id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not save review" }, { status: 500 });
  return NextResponse.json({ ok: true, next_review: next.next_review });
}
