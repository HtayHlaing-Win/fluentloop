import { requireAdmin } from "@/lib/admin-guard";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteUser, resetTurns, setPlan } from "../actions";

export default async function UsersPage() {
  await requireAdmin();
  const { data: users } = await createAdminClient()
    .from("profiles")
    .select("id, display_name, role, target_language, level, plan, daily_turns_used, daily_turn_limit, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h1>Learners</h1>
      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Role</th><th>Language</th><th>Level</th><th>Plan</th><th>Turns today</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id}>
                <td>{u.display_name}</td>
                <td>{u.role}</td>
                <td>{u.target_language}</td>
                <td>{u.level}</td>
                <td>{u.plan}</td>
                <td>{u.daily_turns_used}/{u.daily_turn_limit ?? "∞"}</td>
                <td>
                  <div className="row">
                    <form action={resetTurns}><input type="hidden" name="id" value={u.id} /><button className="btn secondary">Reset</button></form>
                    <form action={setPlan}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="plan" value={u.plan === "pro" ? "free" : "pro"} />
                      <button className="btn secondary">Make {u.plan === "pro" ? "free" : "pro"}</button>
                    </form>
                    {u.role !== "admin" && (
                      <form action={deleteUser}><input type="hidden" name="id" value={u.id} /><button className="btn danger">Delete</button></form>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">Deleting a learner removes their account, sessions and flashcards permanently.</p>
    </>
  );
}
