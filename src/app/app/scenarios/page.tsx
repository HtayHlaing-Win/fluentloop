import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LEVELS } from "@/lib/languages";
import { categoryVisual } from "@/lib/scenario-visuals";
import CefrBadge from "@/components/CefrBadge";
import CoverImage from "@/components/CoverImage";

const CATEGORIES = ["Daily Life", "Travel", "Business", "Social", "Emergency"];

interface Filters {
  category?: string;
  level?: string;
  q?: string;
}

/** Link to this page with some filters changed. Passing undefined clears a filter. */
function href(current: Filters, patch: Partial<Filters>) {
  const next = { ...current, ...patch };
  const sp = new URLSearchParams();
  if (next.category) sp.set("category", next.category);
  if (next.level) sp.set("level", next.level);
  if (next.q) sp.set("q", next.q);
  const qs = sp.toString();
  return qs ? `/app/scenarios?${qs}` : "/app/scenarios";
}

export default async function ScenariosPage({ searchParams }: { searchParams: Filters }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("target_language, level, daily_turns_used, daily_turn_limit, last_turn_reset")
    .eq("id", user!.id)
    .single();

  const category = searchParams.category && CATEGORIES.includes(searchParams.category) ? searchParams.category : undefined;
  const level =
    searchParams.level && (LEVELS as readonly string[]).includes(searchParams.level) ? searchParams.level : undefined;
  const q = searchParams.q?.trim() || undefined;
  const current: Filters = { category, level, q };

  let query = supabase
    .from("scenarios")
    .select("id, title, category, difficulty, description, duration_min")
    .eq("is_active", true)
    .order("difficulty")
    .order("title");
  if (category) query = query.eq("category", category);
  if (level) query = query.eq("difficulty", level);
  if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "")}%`);
  const { data: scenarios } = await query;

  const today = new Date().toISOString().slice(0, 10);
  const used = profile?.last_turn_reset === today ? profile.daily_turns_used : 0;

  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
          <h1>Scenario Library</h1>
          <p className="mt-1 text-muted-foreground">
            Practising {profile?.target_language} at {profile?.level}.{" "}
            {profile?.daily_turn_limit == null
              ? "Unlimited daily turns."
              : `${used} of ${profile.daily_turn_limit} daily turns used.`}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <form action="/app/scenarios" method="get" role="search" className="relative min-w-56 max-w-sm flex-1">
              {category && <input type="hidden" name="category" value={category} />}
              {level && <input type="hidden" name="level" value={level} />}
              <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Search scenarios..."
                aria-label="Search"
                className="w-full rounded-xl border bg-input-background py-2.5 pr-4 pl-10 text-sm transition focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
              <button type="submit" className="sr-only">Search</button>
            </form>

            <div className="flex items-center gap-1.5" role="group" aria-label="Level">
              {LEVELS.map((l) => {
                const active = level === l;
                return (
                  <Link
                    key={l}
                    href={href(current, { level: active ? undefined : l })}
                    aria-current={active ? "true" : undefined}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {l}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Category">
            {[undefined, ...CATEGORIES].map((c) => {
              const active = category === c;
              return (
                <Link
                  key={c ?? "all"}
                  href={href(current, { category: c })}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {c ?? "All"}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        {!scenarios?.length ? (
          <p className="py-20 text-center text-muted-foreground">No scenarios match your filters.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((s) => {
              const visual = categoryVisual(s.category);
              const Icon = visual.icon;
              return (
                <Link
                  key={s.id}
                  href={`/app/practice/${s.id}`}
                  className="group overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:shadow-xl"
                >
                  <div className="relative h-48 overflow-hidden bg-linear-to-br from-primary to-accent">
                    <span className="absolute inset-0 flex items-center justify-center text-primary-foreground/30">
                      <Icon size={64} aria-hidden="true" />
                    </span>
                    <CoverImage
                      src={visual.photoUrl(600, 400)}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <CefrBadge level={s.difficulty} className="absolute top-3 right-3 bg-card! shadow-sm" />
                  </div>
                  <div className="p-5">
                    <h3 className="mb-1.5">{s.title}</h3>
                    <p className="line-clamp-3 text-[0.85rem] leading-relaxed text-muted-foreground">{s.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{s.category}</span>
                        <span className="rounded-lg bg-muted px-2.5 py-1 text-xs text-muted-foreground">~{s.duration_min} min</span>
                      </div>
                      <span className="flex items-center gap-1 text-[0.8rem] font-semibold text-primary transition-all group-hover:gap-2">
                        Start <ChevronRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
