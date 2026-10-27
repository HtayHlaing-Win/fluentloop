import type { SupabaseClient } from "@supabase/supabase-js";
import { converse, transcribeAudio } from "@/lib/ai/gemini";
import { synthesize } from "@/lib/ai/tts";
import { createAdminClient } from "@/lib/supabase/admin";
import { PERSONAS } from "@/lib/languages";
import type { TurnResponse } from "@/lib/types";

export type TurnInput =
  | { kind: "text"; text: string }
  | { kind: "audio"; audio: Buffer; mimeType: string };

export type TurnOutcome =
  | { ok: true; data: TurnResponse }
  | { ok: false; status: number; error: string; turnsUsed?: number; dailyLimit?: number | null };

/**
 * One conversation turn:
 * authorise -> daily allowance -> transcribe -> context -> LLM (reply + feedback)
 * -> (TTS || persist) -> flashcards -> running session score.
 * `supabase` is the user's RLS-bound client, so session ownership is enforced by the database.
 */
export async function processTurn(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  input: TurnInput
): Promise<TurnOutcome> {
  const { data: session } = await supabase
    .from("sessions")
    .select("id, user_id, scenario_id, persona, language, overall_score")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!session) return { ok: false, status: 404, error: "Session not found" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("level")
    .eq("id", userId)
    .single();
  const level = profile?.level ?? "A1";

  // Atomic allowance check + increment (SQL function, service role only).
  const admin = createAdminClient();
  const { data: allowance, error: allowErr } = await admin.rpc("consume_turn", { p_user: userId });
  if (allowErr) return { ok: false, status: 500, error: "Could not check daily allowance" };
  const a = Array.isArray(allowance) ? allowance[0] : allowance;
  if (!a?.allowed) {
    return {
      ok: false,
      status: 429,
      error: "Daily turn limit reached. Come back tomorrow or upgrade your plan.",
      turnsUsed: a?.used,
      dailyLimit: a?.lim ?? null,
    };
  }

  // Transcribe (audio) or use text as-is.
  let userText = "";
  if (input.kind === "text") userText = input.text.trim();
  else userText = await transcribeAudio(input.audio, input.mimeType, session.language);
  if (!userText) {
    return {
      ok: false,
      status: 422,
      error: "We couldn't hear anything. Try again, or type your message.",
    };
  }

  // Scenario prompt + persona.
  let scenarioPrompt = "Have a natural, open-ended conversation about any topic the learner chooses.";
  if (session.scenario_id) {
    const { data: sc } = await supabase
      .from("scenarios")
      .select("system_prompt")
      .eq("id", session.scenario_id)
      .maybeSingle();
    if (sc?.system_prompt) scenarioPrompt = sc.system_prompt;
  }
  if (session.persona && PERSONAS[session.persona]) {
    scenarioPrompt = PERSONAS[session.persona].prompt;
  }

  // Last 10 turns as context.
  const { data: prior } = await supabase
    .from("turns")
    .select("user_transcript, ai_text")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(10);
  const history = (prior ?? [])
    .reverse()
    .flatMap((t) => [
      { role: "user" as const, content: t.user_transcript },
      { role: "assistant" as const, content: t.ai_text },
    ]);

  const result = await converse({
    scenarioPrompt,
    language: session.language,
    level,
    history,
    userText,
  });

  // TTS and persistence run in parallel.
  const [audioDataUrl] = await Promise.all([
    synthesize(result.reply),
    supabase.from("turns").insert({
      session_id: sessionId,
      user_transcript: userText,
      ai_text: result.reply,
      feedback: result.feedback,
    }),
  ]);

  // New vocabulary -> flashcards (existing words are left untouched).
  if (result.feedback.vocabulary.length) {
    await supabase.from("flashcards").upsert(
      result.feedback.vocabulary.map((v) => ({
        user_id: userId,
        language: session.language,
        word: v.word,
        translation: v.translation ?? "",
        example: v.example ?? "",
      })),
      { onConflict: "user_id,language,word", ignoreDuplicates: true }
    );
  }

  // Running average of per-turn scores.
  const turnScore = Math.round(
    (result.feedback.grammar_score +
      result.feedback.pronunciation_score +
      result.feedback.vocabulary_score) /
      3
  );
  const n = prior?.length ?? 0;
  const prev = session.overall_score ?? turnScore;
  await supabase
    .from("sessions")
    .update({ overall_score: Math.round((prev * n + turnScore) / (n + 1)) })
    .eq("id", sessionId);

  return {
    ok: true,
    data: {
      transcript: userText,
      reply: result.reply,
      audioDataUrl,
      feedback: result.feedback,
      turnsUsed: a.used ?? null,
      dailyLimit: a.lim ?? null,
      degraded: result.degraded,
    },
  };
}
