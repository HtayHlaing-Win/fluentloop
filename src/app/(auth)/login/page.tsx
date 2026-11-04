"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { inputClass, labelClass } from "@/components/form-styles";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const { error } = await createClient().auth.signInWithPassword({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError(error.message);
    router.push("/app/scenarios");
    router.refresh();
  }

  return (
    <AuthShell
      mode="login"
      title="Welcome back"
      subtitle="Sign in to continue your language journey."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <PasswordInput id="password" name="password" required autoComplete="current-password" />
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        <button className="btn mt-2 w-full py-3.5 text-base" disabled={busy}>
          {busy ? "Signing in..." : "Sign in"}
          {!busy && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
    </AuthShell>
  );
}
