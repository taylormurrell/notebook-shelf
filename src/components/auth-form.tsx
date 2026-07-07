"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { APP_NAME } from "@/lib/config";

type Mode = "login" | "signup";

const copy = {
  login: {
    heading: "Welcome back",
    action: "Log in",
    switchText: "New here?",
    switchLink: "/signup",
    switchLabel: "Create an account",
  },
  signup: {
    heading: "Create your shelf",
    action: "Sign up",
    switchText: "Already have an account?",
    switchLink: "/login",
    switchLabel: "Log in",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const t = copy[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      // If email confirmation is enabled, there's no session yet.
      if (!data.session) {
        setNotice("Check your email to confirm your account, then log in.");
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-panel p-8 shadow-sm sm:p-10">
        <Link
          href="/"
          className="font-sans text-xs uppercase tracking-[0.2em] text-muted"
        >
          {APP_NAME}
        </Link>
        <h1 className="mt-3 font-serif text-3xl text-foreground">
          {t.heading}
        </h1>

        {!isSupabaseConfigured && (
          <p className="mt-4 rounded-xl border border-border bg-background px-4 py-3 font-sans text-sm text-muted">
            Supabase isn&apos;t configured yet. Add your keys to{" "}
            <code>.env.local</code> and restart the dev server.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-sans text-sm text-foreground">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-sans text-sm text-foreground">Password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 font-sans text-sm text-foreground outline-none focus:border-accent"
            />
          </label>

          {error && (
            <p role="alert" className="font-sans text-sm text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="font-sans text-sm text-accent">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-foreground px-6 py-3 font-sans text-sm text-background transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "One moment…" : t.action}
          </button>
        </form>

        <p className="mt-6 font-sans text-sm text-muted">
          {t.switchText}{" "}
          <Link href={t.switchLink} className="text-accent underline">
            {t.switchLabel}
          </Link>
        </p>
      </div>
    </main>
  );
}
