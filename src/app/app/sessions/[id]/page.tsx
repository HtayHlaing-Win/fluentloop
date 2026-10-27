import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Feedback } from "@/lib/types";

export default async function SessionSummary({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, overall_score, started_at, persona, scenarios(title)")
    .eq("id", params.id)
    .eq("user_id", user!.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: turns } = await supabase
    .from("turns")
    .select("id, user_transcript, ai_text, feedback, created_at")
    .eq("session_id", params.id)
    .order("created_at");

  const fbs = (turns ?? []).map((t) => t.feedback as Feedback);
  const mean = (k: "grammar_score" | "pronunciation_score" | "vocabulary_score") =>
    fbs.length ? Math.round(fbs.reduce((a, f) => a + (f[k] ?? 0), 0) / fbs.length) : 0;
  const corrections = fbs.flatMap((f) => f.corrections ?? []);
  const words = fbs.flatMap((f) => f.vocabulary ?? []);
  const sc = session.scenarios as unknown as { title: string } | null;

  return (
    <>
      <h1>Lesson complete</h1>
      <p className="muted">{sc?.title ?? `Free Talk (${session.persona})`} &middot; {turns?.length ?? 0} turns</p>
      <div className="stats">
        <div className="card stat"><b>{session.overall_score ?? 0}</b><span className="muted">Overall</span></div>
        <div className="card stat"><b>{mean("grammar_score")}</b><span className="muted">Grammar</span></div>
        <div className="card stat"><b>{mean("pronunciation_score")}</b><span className="muted">Pronunciation (est.)</span></div>
        <div className="card stat"><b>{mean("vocabulary_score")}</b><span className="muted">Vocabulary</span></div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>Corrections</h2>
          {!corrections.length ? <p className="muted">None this session.</p> : corrections.map((c, i) => (
            <p key={i}><s>{c.original}</s> &rarr; <b>{c.corrected}</b><br /><span className="muted">{c.explanation}</span></p>
          ))}
        </div>
        <div className="card">
          <h2>New vocabulary</h2>
          {!words.length ? <p className="muted">None this session.</p> : words.map((w, i) => (
            <p key={i}><b>{w.word}</b>: {w.translation}</p>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Transcript</h2>
        {(turns ?? []).map((t) => (
          <p key={t.id}><b>You:</b> {t.user_transcript}<br /><b>Partner:</b> {t.ai_text}</p>
        ))}
      </div>
      <p className="row" style={{ marginTop: "1rem" }}>
        <Link className="btn" href="/app/scenarios">More scenarios</Link>
        <Link className="btn secondary" href="/app/flashcards">Review vocabulary</Link>
      </p>
    </>
  );
}
