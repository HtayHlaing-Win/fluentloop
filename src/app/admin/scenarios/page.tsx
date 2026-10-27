import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { LEVELS } from "@/lib/languages";
import { createScenario, deleteScenario, toggleScenario } from "../actions";

const CATEGORIES = ["Daily Life", "Travel", "Business", "Social", "Emergency"];

export default async function ScenarioStudio() {
  await requireAdmin();
  const { data: scenarios } = await createAdminClient()
    .from("scenarios")
    .select("*")
    .order("id");

  return (
    <>
      <h1>Scenario Studio</h1>
      <form action={createScenario} className="card" style={{ marginBottom: "1rem" }}>
        <h2>New scenario</h2>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" required maxLength={120} />
        <div className="row">
          <div style={{ flex: 1 }}>
            <label htmlFor="category">Category</label>
            <select id="category" name="category">{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="difficulty">Difficulty</label>
            <select id="difficulty" name="difficulty">{LEVELS.map((l) => <option key={l}>{l}</option>)}</select>
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="duration_min">Minutes</label>
            <input id="duration_min" name="duration_min" type="number" defaultValue={5} min={1} max={60} />
          </div>
        </div>
        <label htmlFor="description">Description (shown to learners)</label>
        <input id="description" name="description" maxLength={300} />
        <label htmlFor="system_prompt">AI prompt (who the AI plays and what it should do)</label>
        <textarea id="system_prompt" name="system_prompt" rows={4} required maxLength={2000} />
        <p><button className="btn">Create scenario</button></p>
      </form>

      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Level</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {(scenarios ?? []).map((s) => (
              <tr key={s.id}>
                <td><b>{s.title}</b><br /><span className="muted">{s.system_prompt.slice(0, 90)}...</span></td>
                <td>{s.category}</td>
                <td>{s.difficulty}</td>
                <td>{s.is_active ? "Active" : "Hidden"}</td>
                <td>
                  <div className="row">
                    <form action={toggleScenario}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="active" value={String(s.is_active)} />
                      <button className="btn secondary">{s.is_active ? "Hide" : "Show"}</button>
                    </form>
                    <form action={deleteScenario}><input type="hidden" name="id" value={s.id} /><button className="btn danger">Delete</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
