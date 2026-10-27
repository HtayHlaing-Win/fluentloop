import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { BarCounts } from "@/components/TrendChart";
import { LEVELS } from "@/lib/languages";

export default async function AdminOverview() {
  await requireAdmin();
  const db = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [users, sessions, activeToday, scores, levels, cards, due] = await Promise.all([
    db.from("profiles").select("id", { count: "exact", head: true }),
    db.from("sessions").select("id", { count: "exact", head: true }),
    db.from("sessions").select("user_id").gte("started_at", `${today}T00:00:00Z`),
    db.from("sessions").select("overall_score").not("overall_score", "is", null).limit(5000),
    db.from("profiles").select("level").limit(5000),
    db.from("flashcards").select("id", { count: "exact", head: true }),
    db.from("flashcards").select("id", { count: "exact", head: true }).lte("next_review", new Date().toISOString()),
  ]);

  const sc = scores.data ?? [];
  const avg = sc.length ? Math.round(sc.reduce((a, s) => a + (s.overall_score as number), 0) / sc.length) : 0;
  const activeIds = new Set((activeToday.data ?? []).map((r) => r.user_id));
  const dist = LEVELS.map((l) => ({ label: l, count: (levels.data ?? []).filter((p) => p.level === l).length }));

  return (
    <>
      <h1>Overview</h1>
      <div className="stats">
        <div className="card stat"><b>{users.count ?? 0}</b><span className="muted">Learners</span></div>
        <div className="card stat"><b>{activeIds.size}</b><span className="muted">Active today</span></div>
        <div className="card stat"><b>{sessions.count ?? 0}</b><span className="muted">Sessions</span></div>
        <div className="card stat"><b>{avg}</b><span className="muted">Avg score</span></div>
        <div className="card stat"><b>{cards.count ?? 0}</b><span className="muted">Flashcards</span></div>
        <div className="card stat"><b>{due.count ?? 0}</b><span className="muted">Due now</span></div>
      </div>
      <div className="card">
        <h2>Learners by CEFR level</h2>
        <BarCounts data={dist} />
      </div>
    </>
  );
}
