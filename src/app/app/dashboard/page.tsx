import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LineTrend } from "@/components/TrendChart";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

function streak(days: Set<string>): number {
  let n = 0;
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // today not required yet
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, started_at, overall_score, language, scenarios(title), persona")
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(200);

  const { count: cardCount } = await supabase
    .from("flashcards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);

  const list = sessions ?? [];
  const scored = list.filter((s) => s.overall_score != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, s) => a + (s.overall_score as number), 0) / scored.length)
    : 0;
  const days = new Set(list.map((s) => dayKey(new Date(s.started_at))));

  // Average score for each of the last 7 days.
  const trend = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const key = dayKey(d);
    const day = scored.filter((s) => dayKey(new Date(s.started_at)) === key);
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      score: day.length ? Math.round(day.reduce((a, s) => a + (s.overall_score as number), 0) / day.length) : 0,
    };
  });

  return (
    <>
      <h1>Dashboard</h1>
      <div className="stats">
        <div className="card stat"><b>{list.length}</b><span className="muted">Sessions</span></div>
        <div className="card stat"><b>{avg}</b><span className="muted">Average score</span></div>
        <div className="card stat"><b>{streak(days)}</b><span className="muted">Day streak</span></div>
        <div className="card stat"><b>{cardCount ?? 0}</b><span className="muted">Words collected</span></div>
      </div>

      <div className="card">
        <h2>Last 7 days</h2>
        <LineTrend data={trend} />
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Recent sessions</h2>
        {!list.length ? <p className="muted">No sessions yet. <Link href="/app/scenarios">Start one</Link>.</p> : (
          <table>
            <thead><tr><th>When</th><th>Topic</th><th>Score</th></tr></thead>
            <tbody>
              {list.slice(0, 10).map((s) => {
                const sc = s.scenarios as unknown as { title: string } | null;
                return (
                  <tr key={s.id}>
                    <td>{new Date(s.started_at).toLocaleString()}</td>
                    <td><Link href={`/app/sessions/${s.id}`}>{sc?.title ?? `Free Talk (${s.persona ?? "open"})`}</Link></td>
                    <td>{s.overall_score ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
