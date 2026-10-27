import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import { LANGUAGES, LEVELS } from "@/lib/languages";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const { count: sessions } = await supabase
    .from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id);

  return (
    <>
      <h1>Profile</h1>
      <p className="muted">{user!.email} &middot; Plan: {p?.plan} &middot; {sessions ?? 0} sessions</p>
      <form action={updateProfile} className="card" style={{ maxWidth: 420, marginTop: "1rem" }}>
        <label htmlFor="display_name">Display name</label>
        <input id="display_name" name="display_name" defaultValue={p?.display_name} required maxLength={40} />
        <label htmlFor="target_language">Target language</label>
        <select id="target_language" name="target_language" defaultValue={p?.target_language}>
          {LANGUAGES.map((l) => <option key={l.name}>{l.name}</option>)}
        </select>
        <label htmlFor="level">Level (CEFR)</label>
        <select id="level" name="level" defaultValue={p?.level}>
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <p><button className="btn">Save changes</button></p>
      </form>
    </>
  );
}
