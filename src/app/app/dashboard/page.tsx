import Link from "next/link";
import { BookOpen, ChevronRight, Flame, Layers, Mic, Target, TrendingUp, Trophy, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LineTrend } from "@/components/TrendChart";
import Container from "@/components/Container";
import type { Feedback } from "@/lib/types";

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

export default async function DashboardPage({ searchParams }: { searchParams: { c?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: sessions }, { count: cardCount }, { data: profile }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, started_at, overall_score, language, scenarios(title), persona")
      .eq("user_id", user!.id)
      .order("started_at", { ascending: false })
      .limit(200),
    supabase.from("flashcards").select("id", { count: "exact", head: true }).eq("user_id", user!.id),
    supabase.from("profiles").select("display_name").eq("id", user!.id).maybeSingle(),
  ]);

  const list = sessions ?? [];
  const selected = list.find((s) => s.id === searchParams.c) ?? list[0];
  const { data: chatTurns } = selected
    ? await supabase
        .from("turns")
        .select("id, user_transcript, ai_text, feedback, created_at")
        .eq("session_id", selected.id)
        .order("created_at")
    : { data: [] };
  const titleOf = (s: (typeof list)[number]) =>
    (s.scenarios as unknown as { title: string } | null)?.title ?? `Free Talk (${s.persona ?? "open"})`;
  const scored = list.filter((s) => s.overall_score != null);
  const avg = scored.length
    ? Math.round(scored.reduce((a, s) => a + (s.overall_score as number), 0) / scored.length)
    : 0;
  const days = new Set(list.map((s) => dayKey(new Date(s.started_at))));
  const currentStreak = streak(days);
  const words = cardCount ?? 0;

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

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = list.filter((s) => new Date(s.started_at).getTime() >= weekAgo).length;

  // Achievements are worked out from the learner's real activity.
  const languagesUsed = new Set(list.map((s) => s.language).filter(Boolean)).size;
  const bestScore = scored.reduce((m, s) => Math.max(m, s.overall_score as number), 0);
  const badges = [
    { icon: "🎯", label: "First Session", earned: list.length >= 1 },
    { icon: "🔥", label: "7-Day Streak", earned: currentStreak >= 7 },
    { icon: "🌍", label: "Polyglot", earned: languagesUsed >= 2 },
    { icon: "🏆", label: "Top Scorer", earned: bestScore >= 90 },
    { icon: "💬", label: "50 Convos", earned: list.length >= 50 },
    { icon: "⭐", label: "100 Words", earned: words >= 100 },
  ];
  const goal = list.length < 50 ? 50 : list.length < 100 ? 100 : null;

  const stats = [
    { label: "Sessions", value: String(list.length), icon: Target, note: `${thisWeek} in the last 7 days` },
    {
      label: "Average score",
      value: String(avg),
      icon: TrendingUp,
      note: scored.length ? `across ${scored.length} scored session${scored.length === 1 ? "" : "s"}` : "No scored sessions yet",
    },
    {
      label: "Day streak",
      value: String(currentStreak),
      icon: Flame,
      note: currentStreak ? "Keep it going!" : "Practise today to start one",
    },
    { label: "Words collected", value: String(words), icon: BookOpen, note: "in your flashcards" },
  ];

  const name = profile?.display_name;

  return (
    <Container>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1>Progress Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            {name ? `Welcome back, ${name}` : "Welcome back"}
            {currentStreak > 1 ? ` — you're on a ${currentStreak}-day streak! 🔥` : "."}
          </p>
        </div>
        <Link href="/app/scenarios" className="btn rounded-xl px-5">
          <Mic size={16} aria-hidden="true" />
          New Session
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[0.8rem] font-medium text-muted-foreground">{label}</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <Icon size={15} aria-hidden="true" />
              </span>
            </div>
            <div className="font-display text-3xl leading-none font-extrabold">{value}</div>
            <div className="mt-1.5 text-xs text-muted-foreground">{note}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-6 lg:col-span-2" aria-label="Score trend">
          <h2 className="mb-5">Last 7 days</h2>
          <LineTrend data={trend} />
        </section>

        <section className="rounded-2xl border bg-card p-6" aria-label="Achievements">
          <div className="mb-5 flex items-center gap-2">
            <Trophy size={18} className="text-primary" aria-hidden="true" />
            <h2>Achievements</h2>
          </div>
          <ul className="grid grid-cols-3 gap-3">
            {badges.map(({ icon, label, earned }) => (
              <li
                key={label}
                aria-label={`${label}${earned ? " (earned)" : " (locked)"}`}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 ${
                  earned ? "bg-secondary" : "bg-muted opacity-50"
                }`}
              >
                <span className="text-2xl" aria-hidden="true">{icon}</span>
                <span className="text-center text-[0.65rem] leading-tight font-semibold">{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-xl border bg-background p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Star size={13} className="text-accent" aria-hidden="true" />
              <span className="text-[0.78rem] font-semibold">
                {goal ? `Next: ${goal} conversations` : "All conversation milestones reached"}
              </span>
            </div>
            {goal && (
              <>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${(list.length / goal) * 100}%` }} />
                </div>
                <div className="mt-1 text-[0.72rem] text-muted-foreground">{list.length} / {goal}</div>
              </>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section id="conversations" className="rounded-2xl border bg-card p-4 sm:p-6 lg:col-span-2" aria-label="Conversations">
          <h2 className="mb-4">Conversations</h2>
          {!list.length ? (
            <p className="text-sm text-muted-foreground">
              No conversations yet.{" "}
              <Link href="/app/scenarios" className="font-medium text-primary hover:underline">Start one</Link>.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
              <nav aria-label="Previous conversations" className="max-h-64 space-y-1 overflow-y-auto md:max-h-[34rem]">
                {list.slice(0, 40).map((s) => {
                  const active = s.id === selected?.id;
                  return (
                    <Link
                      key={s.id}
                      href={`/app/dashboard?c=${s.id}#conversations`}
                      scroll={false}
                      aria-current={active ? "true" : undefined}
                      className={`block rounded-xl px-3 py-2.5 transition-colors ${
                        active ? "bg-secondary" : "hover:bg-muted"
                      }`}
                    >
                      <div className={`truncate text-sm ${active ? "font-semibold text-primary" : "font-medium"}`}>{titleOf(s)}</div>
                      <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{new Date(s.started_at).toLocaleString()}</span>
                        {s.language && <span className="shrink-0 rounded-full bg-background px-2 py-0.5">{s.language}</span>}
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="min-w-0 rounded-xl border bg-background">
                {selected && (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{titleOf(selected)}</div>
                        <div className="text-xs text-muted-foreground">
                          {chatTurns?.length ?? 0} turns · score {selected.overall_score ?? "-"}
                        </div>
                      </div>
                      <Link href={`/app/sessions/${selected.id}`} className="text-[0.8rem] font-medium text-primary hover:underline">
                        Full summary
                      </Link>
                    </div>
                    <div className="max-h-[30rem] space-y-4 overflow-y-auto p-4">
                      {!chatTurns?.length && <p className="text-sm text-muted-foreground">No messages in this conversation.</p>}
                      {(chatTurns ?? []).map((t) => {
                        const fb = (t.feedback ?? {}) as Partial<Feedback>;
                        const fix = fb.corrections?.[0];
                        return (
                          <div key={t.id} className="space-y-2">
                            <div className="flex justify-end">
                              <div className="max-w-[85%] rounded-2xl rounded-tr-none bg-primary px-4 py-2.5 text-primary-foreground">
                                <p className="text-sm whitespace-pre-wrap">{t.user_transcript}</p>
                                {fb.target_version && (
                                  <p className="mt-1 border-t border-white/30 pt-1 text-xs">Better: <b>{fb.target_version}</b></p>
                                )}
                              </div>
                            </div>
                            {fix && (
                              <p className="text-right text-xs text-muted-foreground">
                                <s>{fix.original}</s> → <b className="text-foreground">{fix.corrected}</b>
                              </p>
                            )}
                            <div className="flex">
                              <div className="max-w-[85%] rounded-2xl rounded-tl-none border bg-card px-4 py-2.5">
                                <p className="text-sm whitespace-pre-wrap">{t.ai_text}</p>
                                {fb.reply_translation && (
                                  <p className="mt-1 border-t pt-1 text-xs whitespace-pre-wrap text-muted-foreground">{fb.reply_translation}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6" aria-label="Vocabulary">
          <h2 className="mb-4">Vocabulary</h2>
          <div className="flex items-center gap-3 rounded-xl border bg-background p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
              <Layers size={18} aria-hidden="true" />
            </span>
            <div>
              <div className="font-display text-xl leading-tight font-extrabold">{words}</div>
              <div className="text-xs text-muted-foreground">words collected from your conversations</div>
            </div>
          </div>
          <Link
            href="/app/free-talk?tab=vocabulary"
            className="mt-4 flex items-center gap-1 text-[0.85rem] font-medium text-primary hover:underline"
          >
            Review vocabulary <ChevronRight size={14} aria-hidden="true" />
          </Link>
          <div className="mt-4 rounded-xl bg-secondary p-3">
            <p className="text-[0.78rem] font-medium text-secondary-foreground">
              💡 Tip: new words from every lesson are added automatically, so the more you talk the more you can review.
            </p>
          </div>
        </section>
      </div>
    </Container>
  );
}
