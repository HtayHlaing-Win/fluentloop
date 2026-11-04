import Link from "next/link";
import { ArrowRight, CircleCheck, Layers, MessageCircle, Mic, TrendingUp, Users, Zap } from "lucide-react";
import Brand from "@/components/Brand";
import { LANGUAGES } from "@/lib/languages";

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-first practice",
    desc: "Speak out loud and get a reply in your target language. Prefer typing? That works too.",
  },
  {
    icon: MessageCircle,
    title: "Real-life scenarios",
    desc: "Restaurants, travel, interviews and emergencies, all organised by CEFR level.",
  },
  {
    icon: Users,
    title: "Free Talk personas",
    desc: "Pick a persona: friendly pal, career coach, debate partner or strict professor.",
  },
  {
    icon: Zap,
    title: "Live feedback",
    desc: "Scores and corrections for grammar, vocabulary and pronunciation after every turn.",
  },
  {
    icon: Layers,
    title: "Spaced-repetition flashcards",
    desc: "New words from your conversations are scheduled for review with SM-2.",
  },
  {
    icon: TrendingUp,
    title: "Track your progress",
    desc: "A dashboard with your streak, a 7-day score trend and your session history.",
  },
];

const WAVE = [3, 7, 12, 5, 15, 8, 4, 11, 6, 13, 3, 9, 14, 5, 8];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md" aria-label="Main">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Brand />
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Sign in
            </Link>
            <Link href="/register" className="btn">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% -10%, color-mix(in srgb, var(--primary) 28%, transparent), transparent)",
            }}
          />
          <div className="mx-auto max-w-7xl px-4 pt-20 pb-16 text-center sm:px-6 sm:pt-24">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-[0.8rem] font-medium text-primary">
              <Zap size={13} aria-hidden="true" />
              AI conversation partner
            </div>

            <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.1] font-extrabold tracking-[-0.03em]">
              Speak your new language,
              <br />
              <span className="text-primary">out loud.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
              Practise real spoken conversations with an AI partner. Get instant feedback on grammar and vocabulary,
              and turn new words into spaced-repetition flashcards.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/register" className="btn rounded-xl px-7 py-3.5 text-base">
                Get started
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border bg-card px-7 py-3.5 text-base font-medium transition-colors hover:bg-muted"
              >
                Sign in
              </Link>
            </div>

            <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
              {["Free to start", `${LANGUAGES.length} languages`, "Speak or type"].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CircleCheck size={14} className="text-success" aria-hidden="true" />
                  {t}
                </li>
              ))}
            </ul>

            {/* Example lesson (illustration only) */}
            <div className="relative mx-auto mt-16 max-w-4xl text-left" aria-hidden="true">
              <div className="overflow-hidden rounded-2xl border bg-card shadow-[0_25px_60px_-10px_rgba(79,70,229,0.25)]">
                <div className="flex h-8 items-center gap-1.5 bg-muted px-4">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  <span className="ml-3 text-[0.7rem] text-muted-foreground">Example lesson: At the Restaurant (French)</span>
                </div>
                <div className="grid gap-4 p-4 sm:p-6 md:grid-cols-3">
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] font-bold text-primary-foreground">AI</span>
                      <div className="max-w-xs rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-sm">
                        Bonjour ! Bienvenue au restaurant Le Petit Paris. Avez-vous une réservation ?
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <div className="max-w-xs rounded-2xl rounded-tr-none bg-primary px-4 py-3 text-sm text-primary-foreground">
                        Oui, j&apos;ai une reservation pour deux personnes.
                      </div>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.7rem] font-bold text-primary">You</span>
                    </div>
                    <div className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[0.7rem] font-bold text-primary-foreground">AI</span>
                      <div className="max-w-xs rounded-2xl rounded-tl-none bg-muted px-4 py-3 text-sm">
                        Parfait ! Suivez-moi, s&apos;il vous plaît...
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-3 rounded-xl bg-secondary p-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Mic size={16} />
                      </span>
                      <div className="flex h-8 flex-1 items-end gap-0.5">
                        {WAVE.map((h, i) => (
                          <span
                            key={i}
                            className="flex-1 rounded-full bg-primary"
                            style={{ height: `${h * 2}px`, opacity: 0.4 + (h / 15) * 0.6 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-primary">Recording...</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Grammar</div>
                      <div className="mt-2 flex items-end gap-1">
                        <span className="font-display text-3xl font-extrabold text-primary">87</span>
                        <span className="mb-1 text-muted-foreground">/100</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full w-[87%] rounded-full bg-primary" />
                      </div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">Correction</div>
                      <div className="mt-2 space-y-1">
                        <div className="text-xs text-muted-foreground line-through">j&apos;ai une reservation</div>
                        <div className="text-xs font-medium text-success">✓ j&apos;ai une réservation</div>
                      </div>
                    </div>
                    <div className="rounded-xl border p-3">
                      <div className="text-[0.7rem] font-semibold tracking-wide text-muted-foreground uppercase">New word</div>
                      <div className="mt-1 text-sm font-semibold text-accent">réservation</div>
                      <div className="text-xs text-muted-foreground">booking, reservation</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-card py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-14 text-center">
              <h2 className="font-display text-3xl font-extrabold tracking-tight">Everything you need to speak with confidence</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Real conversations, immediate feedback, and a way to remember what you learn.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-2xl border bg-background p-6 transition-shadow hover:shadow-lg">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3 className="mb-2">{title}</h3>
                  <p className="text-[0.9rem] leading-relaxed text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="bg-primary py-20 text-primary-foreground sm:py-24">
          <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
            <h2 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.15] font-extrabold tracking-tight">
              Your first real conversation starts today.
            </h2>
            <p className="mt-4 text-lg opacity-80">Create a free account and start talking in under a minute.</p>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-foreground px-8 py-4 font-bold text-primary transition-opacity hover:opacity-90"
            >
              Start practising, it&apos;s free
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card py-8 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} FluentLoop
      </footer>
    </div>
  );
}
