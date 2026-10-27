import { requireAdmin } from "@/lib/admin-guard";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Feedback } from "@/lib/types";

export default async function InspectSession({ params }: { params: { id: string } }) {
  await requireAdmin();
  const db = createAdminClient();
  const { data: session } = await db
    .from("sessions")
    .select("id, started_at, overall_score, language, profiles(display_name)")
    .eq("id", params.id)
    .maybeSingle();
  if (!session) notFound();

  const { data: turns } = await db
    .from("turns")
    .select("id, user_transcript, ai_text, feedback, created_at")
    .eq("session_id", params.id)
    .order("created_at");
  const p = session.profiles as unknown as { display_name: string } | null;

  return (
    <>
      <h1>Session replay</h1>
      <p className="muted">{p?.display_name} &middot; {session.language} &middot; score {session.overall_score ?? "-"}</p>
      {(turns ?? []).map((t) => {
        const f = t.feedback as Feedback;
        return (
          <div className="card" key={t.id} style={{ marginBottom: ".75rem" }}>
            <p><b>Learner:</b> {t.user_transcript}</p>
            <p><b>AI:</b> {t.ai_text}</p>
            <p className="muted">
              Grammar {f.grammar_score} &middot; Pronunciation (est.) {f.pronunciation_score} &middot; Vocabulary {f.vocabulary_score}
              {f.corrections?.length ? ` · ${f.corrections.length} correction(s)` : ""}
            </p>
          </div>
        );
      })}
    </>
  );
}
