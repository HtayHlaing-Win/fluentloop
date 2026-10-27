"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES, LEVELS } from "@/lib/languages";

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
    <main className="form card">
      <h1>Create account</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="display_name">Display name</label>
        <input id="display_name" name="display_name" required maxLength={40} />
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" />
        <label htmlFor="password">Password (min 8 characters)</label>
        <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        <label htmlFor="target_language">I want to learn</label>
        <select id="target_language" name="target_language" defaultValue="Spanish">
          {LANGUAGES.map((l) => <option key={l.name}>{l.name}</option>)}
        </select>
        <label htmlFor="level">My level (CEFR)</label>
        <select id="level" name="level" defaultValue="A1">
          {LEVELS.map((l) => <option key={l}>{l}</option>)}
        </select>
        {error && <p className="err" role="alert">{error}</p>}
        {notice && <p className="ok" role="status">{notice}</p>}
        <p><button className="btn" disabled={busy}>{busy ? "Creating..." : "Create account"}</button></p>
      </form>
      <p className="muted">Have an account? <Link href="/login">Sign in</Link></p>
    </main>
  );
}
