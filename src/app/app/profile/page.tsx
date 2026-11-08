import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { updateProfile } from "@/app/actions";
import { LANGUAGES, LEVELS } from "@/lib/languages";
import Container from "@/components/Container";
import { inputClass, labelClass } from "@/components/form-styles";

const choiceClass =
  "block cursor-pointer rounded-xl border px-3 py-2 text-center text-sm transition-all hover:bg-muted peer-checked:border-primary peer-checked:bg-linear-to-br peer-checked:from-primary peer-checked:to-accent peer-checked:font-semibold peer-checked:text-primary-foreground peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40";

export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  const { count: sessions } = await supabase
    .from("sessions").select("id", { count: "exact", head: true }).eq("user_id", user!.id);

  const today = new Date().toISOString().slice(0, 10);
  const used = p?.last_turn_reset === today ? p.daily_turns_used : 0;
  const initials =
    String(p?.display_name ?? user!.email ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Container size="md">
      <h1 className="mb-8">Profile Settings</h1>

      <div className="grid gap-6 lg:grid-cols-[15rem_1fr]">
        <aside className="h-fit rounded-2xl border bg-card p-5 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-primary to-accent">
            <span className="font-display text-xl font-extrabold text-primary-foreground">{initials}</span>
          </div>
          <div className="text-[0.95rem] font-bold">{p?.display_name}</div>
          <div className="text-[0.78rem] break-all text-muted-foreground">{user!.email}</div>
          <div className="mt-2 inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-[0.7rem] font-semibold text-primary">
            {p?.plan === "pro" ? "Pro plan" : "Free plan"}
          </div>
          <div className="mt-2">
            <Link href="/app/plans" className="text-[0.78rem] font-medium text-primary hover:underline">
              {p?.plan === "pro" ? "Manage plan" : "Upgrade to Pro"}
            </Link>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-2 border-t pt-4 text-left">
            <div>
              <dt className="text-[0.7rem] text-muted-foreground">Sessions</dt>
              <dd className="font-display text-lg font-extrabold">{sessions ?? 0}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] text-muted-foreground">Turns today</dt>
              <dd className="font-display text-lg font-extrabold">
                {used}
                <span className="text-xs font-normal text-muted-foreground"> / {p?.daily_turn_limit ?? "∞"}</span>
              </dd>
            </div>
          </dl>
        </aside>

        <form action={updateProfile} className="space-y-4">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="mb-4">Account</h2>
            <label htmlFor="display_name" className={labelClass}>Display name</label>
            <input
              id="display_name"
              name="display_name"
              defaultValue={p?.display_name}
              required
              maxLength={40}
              className={inputClass}
            />
          </section>

          <fieldset className="rounded-2xl border bg-card p-6">
            <legend className="sr-only">Target language</legend>
            <h2 className="mb-4" aria-hidden="true">Learning language</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {LANGUAGES.map((l, i) => (
                <label key={l.name} className="relative">
                  <input
                    type="radio"
                    name="target_language"
                    value={l.name}
                    defaultChecked={p?.target_language === l.name}
                    required={i === 0}
                    className="peer sr-only"
                  />
                  <span className={choiceClass}>{l.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="rounded-2xl border bg-card p-6">
            <legend className="sr-only">Level (CEFR)</legend>
            <h2 aria-hidden="true">CEFR level</h2>
            <p className="mt-1 mb-4 text-[0.85rem] text-muted-foreground">Used to match you with appropriate scenarios.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {LEVELS.map((l, i) => (
                <label key={l} className="relative">
                  <input
                    type="radio"
                    name="level"
                    value={l}
                    defaultChecked={p?.level === l}
                    required={i === 0}
                    className="peer sr-only"
                  />
                  <span className={`${choiceClass} py-3 font-bold`}>{l}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <button className="btn rounded-xl px-6">Save changes</button>
        </form>
      </div>
    </Container>
  );
}
