import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const CATEGORIES = ["Daily Life", "Travel", "Business", "Social", "Emergency"];

export default async function ScenariosPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language, level, daily_turns_used, daily_turn_limit, last_turn_reset")
    .eq("id", user!.id)
    .single();

  let query = supabase
    .from("scenarios")
    .select("id, title, category, difficulty, description, duration_min")
    .eq("is_active", true)
    .order("difficulty")
    .order("title");
  if (searchParams.category && CATEGORIES.includes(searchParams.category)) {
    query = query.eq("category", searchParams.category);
  }
  const q = searchParams.q?.trim();
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data: scenarios } = await query;

  const today = new Date().toISOString().slice(0, 10);
  const used = profile?.last_turn_reset === today ? profile.daily_turns_used : 0;

  return (
    <>
      <h1>Scenarios</h1>
      <p className="muted">
        Practising {profile?.target_language} at {profile?.level}.{" "}
        {profile?.daily_turn_limit == null
          ? "Unlimited daily turns."
          : `${used} of ${profile.daily_turn_limit} daily turns used.`}
      </p>

      <form className="row" style={{ margin: "1rem 0" }}>
        <input name="q" defaultValue={q} placeholder="Search scenarios" style={{ maxWidth: 260 }} aria-label="Search" />
        <select name="category" defaultValue={searchParams.category ?? ""} style={{ maxWidth: 200 }} aria-label="Category">
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn secondary">Filter</button>
      </form>

      <div className="grid">
        {(scenarios ?? []).map((s) => (
          <div className="card" key={s.id}>
            <span className="pill">{s.category}</span>
            <span className="pill">{s.difficulty}</span>
            <h2 style={{ marginTop: ".5rem" }}>{s.title}</h2>
            <p className="muted">{s.description}</p>
            <p className="muted">~{s.duration_min} min</p>
            <Link className="btn" href={`/app/practice/${s.id}`}>Start</Link>
          </div>
        ))}
        {!scenarios?.length && <p className="muted">No scenarios match.</p>}
      </div>
    </>
  );
}
