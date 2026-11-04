import Link from "next/link";
import { CircleCheck } from "lucide-react";
import Brand from "./Brand";
import { LANGUAGES } from "@/lib/languages";

const POINTS = [
  "Speak out loud with an AI partner, or type if you prefer",
  "Instant grammar, vocabulary and pronunciation feedback",
  "New words become spaced-repetition flashcards",
];

const TABS = [
  { id: "login", href: "/login", label: "Sign in" },
  { id: "register", href: "/register", label: "Register" },
] as const;

/** Split-panel layout shared by the sign-in and register pages. */
export default function AuthShell({
  mode,
  title,
  subtitle,
  children,
  footer,
}: {
  mode: "login" | "register";
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-1/2 flex-col justify-between bg-linear-to-br from-primary to-accent p-12 text-primary-foreground lg:flex">
        <Brand inverted />

        <div>
          <p className="font-display text-3xl leading-snug font-bold">
            Speak first. Get corrected instantly. Remember what you learn.
          </p>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[0.95rem] opacity-90">
                <CircleCheck size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          {[`${LANGUAGES.length} languages`, "Speak or type", "Free to start"].map((s) => (
            <span key={s} className="rounded-lg bg-primary-foreground/10 px-3 py-1.5 text-xs font-medium">
              {s}
            </span>
          ))}
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>

          <h1>{title}</h1>
          <p className="mt-2 mb-8 text-[0.95rem] text-muted-foreground">{subtitle}</p>

          <nav className="mb-6 flex rounded-xl bg-muted p-1" aria-label="Account">
            {TABS.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                aria-current={mode === t.id ? "page" : undefined}
                className={`flex-1 rounded-lg py-2 text-center text-sm font-medium transition-all ${
                  mode === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </Link>
            ))}
          </nav>

          {children}

          <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>
        </div>
      </main>
    </div>
  );
}
