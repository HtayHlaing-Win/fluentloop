import { requireAdmin } from "@/lib/admin-guard";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function SessionsPage() {
  await requireAdmin();
  const { data: sessions } = await createAdminClient()
    .from("sessions")
    .select("id, started_at, overall_score, language, persona, profiles(display_name), scenarios(title)")
    .order("started_at", { ascending: false })
    .limit(100);

  return (
    <>
      <h1>Session replays</h1>
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>When</th><th>Learner</th><th>Topic</th><th>Language</th><th>Score</th><th /></tr></thead>
          <tbody>
            {(sessions ?? []).map((s) => {
              const p = s.profiles as unknown as { display_name: string } | null;
              const sc = s.scenarios as unknown as { title: string } | null;
              return (
                <tr key={s.id}>
                  <td>{new Date(s.started_at).toLocaleString()}</td>
                  <td>{p?.display_name}</td>
                  <td>{sc?.title ?? `Free Talk (${s.persona})`}</td>
                  <td>{s.language}</td>
                  <td>{s.overall_score ?? "-"}</td>
                  <td><Link href={`/admin/sessions/${s.id}`}>Inspect</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
