import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processTurn, type TurnInput } from "@/lib/pipeline";

export const maxDuration = 60;

const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const MAX_TEXT = 1000;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: TurnInput;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Recording too long" }, { status: 413 });
    }
    input = {
      kind: "audio",
      audio: Buffer.from(await file.arrayBuffer()),
      mimeType: (file.type || "audio/webm").split(";")[0],
    };
  } else {
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });
    input = { kind: "text", text: text.slice(0, MAX_TEXT) };
  }

  const out = await processTurn(supabase, user.id, params.id, input);
  if (!out.ok) {
    return NextResponse.json(
      { error: out.error, turnsUsed: out.turnsUsed, dailyLimit: out.dailyLimit },
      { status: out.status }
    );
  }
  return NextResponse.json(out.data);
}
