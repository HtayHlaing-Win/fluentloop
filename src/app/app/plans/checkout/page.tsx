import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Container from "@/components/Container";
import { subscribePro } from "../actions";

export default async function CheckoutPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: p } = await supabase.from("profiles").select("plan").eq("id", user!.id).single();
  if (p?.plan === "pro") redirect("/app/plans");

  return (
    <Container size="sm">
      <h1 className="mb-6">Confirm subscription</h1>
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2>FluentLoop Pro</h2>
            <p className="mt-1 text-sm text-muted-foreground">Unlimited daily conversation turns</p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl font-extrabold">$9</div>
            <div className="text-xs text-muted-foreground">per month</div>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Account</dt><dd className="break-all">{user!.email}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Due today</dt><dd className="font-semibold">$0.00 (demo)</dd></div>
        </dl>

        <div className="mt-5 flex items-start gap-2 rounded-xl bg-secondary p-3 text-[0.8rem] text-secondary-foreground">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>This is a demo checkout. No card details are collected and nothing is charged.</span>
        </div>

        <form action={subscribePro} className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button className="btn flex-1">Confirm subscription</button>
          <Link href="/app/plans" className="btn secondary flex-1">Back to plans</Link>
        </form>
      </div>
    </Container>
  );
}
