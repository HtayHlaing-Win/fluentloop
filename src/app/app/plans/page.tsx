import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Container from "@/components/Container";
import { cancelPro } from "./actions";

const FREE = ["20 conversation turns per day", "All scenarios and Free Talk personas", "Feedback on every turn", "Progress dashboard"];
const PRO = ["Unlimited daily turns", "Everything in Free", "Practice as long as you like", "Priority for new features"];

export default async function PlansPage({ searchParams }: { searchParams: { subscribed?: string; cancelled?: string; error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("plan").eq("id", user!.id).single();
  const isPro = p?.plan === "pro";

  return (
    <Container size="md">
      <div className="mb-8 text-center">
        <h1>Plans</h1>
        <p className="mt-2 text-muted-foreground">Start free. Upgrade when you want unlimited practice.</p>
      </div>

      {searchParams.error && (
        <p className="mx-auto mb-6 max-w-xl rounded-xl border border-destructive/40 px-4 py-3 text-center text-sm text-destructive" role="alert">
          Could not change your plan: {searchParams.error}
        </p>
      )}
      {searchParams.subscribed && isPro && (
        <p className="mx-auto mb-6 max-w-xl rounded-xl bg-secondary px-4 py-3 text-center text-sm font-medium text-secondary-foreground" role="status">
          You&apos;re now on Pro. Enjoy unlimited daily turns!
        </p>
      )}
      {searchParams.cancelled && !isPro && (
        <p className="mx-auto mb-6 max-w-xl rounded-xl bg-muted px-4 py-3 text-center text-sm font-medium" role="status">
          Your plan is back to Free.
        </p>
      )}

      <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
        <section className={`rounded-2xl border bg-card p-6 ${!isPro ? "ring-2 ring-primary" : ""}`} aria-label="Free plan">
          <h2>Free</h2>
          <p className="mt-2"><span className="font-display text-4xl font-extrabold">$0</span><span className="text-sm text-muted-foreground"> / month</span></p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {FREE.map((f) => (
              <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{f}</li>
            ))}
          </ul>
          <div className="mt-6">
            {!isPro ? (
              <span className="btn secondary w-full cursor-default" aria-current="true">Current plan</span>
            ) : (
              <form action={cancelPro}>
                <button className="btn secondary w-full">Switch to Free</button>
              </form>
            )}
          </div>
        </section>

        <section className={`relative rounded-2xl border bg-card p-6 ${isPro ? "ring-2 ring-primary" : ""}`} aria-label="Pro plan">
          <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-linear-to-r from-primary to-accent px-3 py-0.5 text-xs font-semibold text-primary-foreground">
            <Sparkles size={12} aria-hidden="true" /> Most popular
          </span>
          <h2>Pro</h2>
          <p className="mt-2"><span className="font-display text-4xl font-extrabold">$9</span><span className="text-sm text-muted-foreground"> / month</span></p>
          <ul className="mt-5 space-y-2.5 text-sm">
            {PRO.map((f) => (
              <li key={f} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />{f}</li>
            ))}
          </ul>
          <div className="mt-6">
            {isPro ? (
              <span className="btn w-full cursor-default" aria-current="true">Current plan</span>
            ) : (
              <Link href="/app/plans/checkout" className="btn w-full">Subscribe to Pro</Link>
            )}
          </div>
        </section>
      </div>

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Demo billing: subscribing does not charge a card.
      </p>
    </Container>
  );
}
