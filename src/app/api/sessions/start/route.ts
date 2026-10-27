import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PERSONAS } from "@/lib/languages";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const scenarioId = body.scenarioId ? Number(body.scenarioId) : null;
  const persona = typeof body.persona === "string" && PERSONAS[body.persona] ? body.persona : null;
  if (!scenarioId && !persona) {
    return NextResponse.json({ error: "scenarioId or persona is required" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language")
    .eq("id", user.id)
    .single();

  if (scenarioId) {
    const { data: sc } = await supabase
      .from("scenarios")
      .select("id")
      .eq("id", scenarioId)
      .eq("is_active", true)
      .maybeSingle();
    if (!sc) return NextResponse.json({ error: "Scenario not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: user.id,
      scenario_id: scenarioId,
      persona,
      language: profile?.target_language ?? "Spanish",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: "Could not start session" }, { status: 500 });

  return NextResponse.json({ sessionId: data.id });
}
