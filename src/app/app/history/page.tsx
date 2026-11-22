import Link from "next/link";
import { ChevronLeft, MessageSquare, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Feedback } from "@/lib/types";

type SessionRow = {
  id: string;
  started_at: string;
  overall_score: number | null;
  language: string | null;
  persona: string | null;
  scenario_id: string | null;
  scenarios: { title: string } | null;
};

const titleOf = (s: SessionRow) => s.scenarios?.title ?? `Free Talk (${s.persona ?? "open"})`;

/** Groups like a chat app's sidebar: Today, Yesterday, Previous 7 days... */
function groupOf(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
  if (hours < 24) return "Today";
  if (hours < 48) return "Yesterday";
  if (hours < 24 * 7) return "Previous 7 days";
  if (hours < 24 * 30) return "Previous 30 days";
  return "Older";
}

export default async function HistoryPage({ searchParams }: { searchParams: { c?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("sessions")
    .select("id, started_at, overall_score, language, persona, scenario_id, scenarios(title)")
    .eq("user_id", user!.id)
    .order("started_at", { ascending: false })
    .limit(150);
  const list = (data ?? []) as unknown as SessionRow[];

  // On phones the list and the chat are separate screens; on larger screens they sit side by side.
  const requested = list.find((s) => s.id === searchParams.c);
  const selected = requested ?? list[0];
  const showChatOnMobile = !!requested;

  const { data: turns } = selected
    ? await supabase
        .from("turns")
        .select("id, user_transcript, ai_text, feedback, created_at")
        .eq("session_id", selected.id)
        .order("created_at")
    : { data: [] };

  const groups: { name: string; items: SessionRow[] }[] = [];
  for (const s of list) {
    const name = groupOf(s.started_at);
    const g = groups.find((x) => x.name === name);
    if (g) g.items.push(s);
    else groups.push({ name, items: [s] });
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-4rem)] max-w-7xl">
      {/* Sidebar: every conversation */}
      <aside
        aria-label="Conversations"
        className={`${showChatOnMobile ? "hidden" : "flex"} w-full flex-col border-r md:flex md:w-72 md:shrink-0`}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-4">
          <h1 className="text-lg">Conversations</h1>
          <Link href="/app/scenarios" className="btn rounded-xl px-3 py-1.5 text-sm">
            <Plus size={14} aria-hidden="true" /> New
          </Link>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4" aria-label="Previous conversations">
          {!list.length && (
            <p className="px-2 text-sm text-muted-foreground">
              No conversations yet.{" "}
              <Link href="/app/scenarios" className="font-medium text-primary hover:underline">Start one</Link>.
            </p>
          )}
          {groups.map((g) => (
            <div key={g.name}>
              <div className="px-3 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{g.name}</div>
              {g.items.map((s) => {
                const active = s.id === selected?.id;
                return (
                  <Link
                    key={s.id}
                    href={`/app/history?c=${s.id}`}
                    aria-current={active ? "true" : undefined}
                    className={`block rounded-lg px-3 py-2 transition-colors ${active ? "bg-secondary" : "hover:bg-muted"}`}
                  >
                    <div className={`truncate text-sm ${active ? "font-semibold text-primary" : "font-medium"}`}>{titleOf(s)}</div>
                    <div className="mt-0.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate">{new Date(s.started_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {s.language}
                        {s.overall_score != null && <b className="text-foreground">{s.overall_score}</b>}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main: the selected conversation */}
      <section className={`${showChatOnMobile ? "flex" : "hidden"} min-w-0 flex-1 flex-col md:flex`} aria-label="Conversation">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
            <MessageSquare size={32} aria-hidden="true" />
            <p>Your conversations will appear here.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-2">
                <Link href="/app/history" aria-label="All conversations" className="rounded-lg p-1.5 hover:bg-muted md:hidden">
                  <ChevronLeft size={18} aria-hidden="true" />
                </Link>
                <div className="min-w-0">
                  <h2 className="truncate text-base">{titleOf(selected)}</h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(selected.started_at).toLocaleString("en-AU")} · {turns?.length ?? 0} turns
                    {selected.overall_score != null && ` · score ${selected.overall_score}`}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link href={`/app/sessions/${selected.id}`} className="btn secondary px-3 py-1.5 text-sm">Summary</Link>
                <Link
                  href={selected.scenario_id ? `/app/practice/${selected.scenario_id}` : "/app/free-talk"}
                  className="btn px-3 py-1.5 text-sm"
                >
                  Practise again
                </Link>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              <div className="mx-auto max-w-3xl space-y-6">
                {!turns?.length && <p className="text-center text-sm text-muted-foreground">No messages in this conversation.</p>}
                {(turns ?? []).map((t) => {
                  const fb = (t.feedback ?? {}) as Partial<Feedback>;
                  const hasFeedback = fb.grammar_score != null || fb.corrections?.length || fb.vocabulary?.length;
                  return (
                    <div key={t.id} className="space-y-3">
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
                          <p className="text-[0.92rem] leading-relaxed whitespace-pre-wrap">{t.user_transcript}</p>
                          {fb.target_version && (
                            <p className="mt-1.5 border-t border-white/30 pt-1.5 text-[0.82rem]">Better: <b>{fb.target_version}</b></p>
                          )}
                        </div>
                      </div>
                      <div className="flex">
                        <div className="max-w-[85%] rounded-2xl rounded-tl-sm border bg-card px-4 py-2.5">
                          <p className="text-[0.92rem] leading-relaxed whitespace-pre-wrap">{t.ai_text}</p>
                          {fb.reply_translation && (
                            <p className="mt-1.5 border-t pt-1.5 text-[0.82rem] leading-relaxed whitespace-pre-wrap text-muted-foreground">
                              {fb.reply_translation}
                            </p>
                          )}
                        </div>
                      </div>
                      {hasFeedback && (
                        <details className="ml-2 text-sm">
                          <summary className="cursor-pointer text-[0.8rem] font-medium text-primary select-none">Feedback</summary>
                          <div className="mt-2 space-y-2 rounded-xl border bg-card p-3">
                            <div className="flex flex-wrap gap-2 text-xs">
                              {fb.grammar_score != null && <span className="rounded-full bg-secondary px-2.5 py-1">Grammar {fb.grammar_score}</span>}
                              {fb.pronunciation_score != null && <span className="rounded-full bg-secondary px-2.5 py-1">Pronunciation (est.) {fb.pronunciation_score}</span>}
                              {fb.vocabulary_score != null && <span className="rounded-full bg-secondary px-2.5 py-1">Vocabulary {fb.vocabulary_score}</span>}
                            </div>
                            {fb.corrections?.map((c, i) => (
                              <p key={i} className="text-[0.85rem]">
                                <s className="text-muted-foreground">{c.original}</s> → <b>{c.corrected}</b>
                                <span className="block text-xs text-muted-foreground">{c.explanation}</span>
                              </p>
                            ))}
                            {!!fb.vocabulary?.length && (
                              <p className="text-[0.85rem]">
                                <span className="text-xs text-muted-foreground">New words: </span>
                                {fb.vocabulary.map((v) => `${v.word} (${v.translation})`).join(", ")}
                              </p>
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
