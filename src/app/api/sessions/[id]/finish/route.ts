import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .is("ended_at", null);
  if (error) return NextResponse.json({ error: "Could not finish session" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
