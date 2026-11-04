"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES, LEVELS } from "@/lib/languages";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { inputClass, labelClass } from "@/components/form-styles";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const { data, error } = await createClient().auth.signUp({
      email: String(f.get("email")),
      password: String(f.get("password")),
      options: {
        data: {
          display_name: String(f.get("display_name")),
          target_language: String(f.get("target_language")),
          level: String(f.get("level")),
        },
      },
    });
    setBusy(false);
    if (error) return setError(error.message);
    if (!data.session) {
      // Email confirmation is enabled in Supabase.
      return setNotice("Check your email to confirm your account, then sign in.");
    }
    router.push("/app/scenarios");
    router.refresh();
  }

  return (
    <AuthShell
      mode="register"
      title="Create your account"
      subtitle="Start speaking with an AI partner today. It's free."
      footer={
        <>
          Have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="display_name" className={labelClass}>Display name</label>
          <input id="display_name" name="display_name" required maxLength={40} className={inputClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password (min 8 characters)</label>
          <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="target_language" className={labelClass}>I want to learn</label>
            <select id="target_language" name="target_language" defaultValue="Spanish" className={inputClass}>
              {LANGUAGES.map((l) => <option key={l.name}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="level" className={labelClass}>My level (CEFR)</label>
            <select id="level" name="level" defaultValue="A1" className={inputClass}>
              {LEVELS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        {notice && <p className="text-sm text-success" role="status">{notice}</p>}
        <button className="btn mt-2 w-full py-3.5 text-base" disabled={busy}>
          {busy ? "Creating..." : "Create account"}
          {!busy && <ArrowRight size={18} aria-hidden="true" />}
        </button>
      </form>
    </AuthShell>
  );
}
