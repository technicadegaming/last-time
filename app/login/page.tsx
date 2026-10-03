"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanAuthFragment, getSupabaseBrowserClient } from "../../lib/supabase";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const router = useRouter();

  function nextPath() {
    if (typeof window === "undefined") return "/app";
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") ? next : "/app";
  }
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      supabase.auth.getSession().then(({ data }) => {
        cleanAuthFragment();
        if (data.session) router.replace(nextPath());
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Supabase is not configured.");
    }
  }, [router]);

  async function signInWithGoogle() {
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}${nextPath()}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  async function sendPasswordReset() {
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send password reset email.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;

        if (data.session) {
          router.replace(nextPath());
        } else {
          setMessage("Account created. Check your email to confirm it, then sign in.");
          setMode("signin");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        router.replace(nextPath());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authPage shell">
      <a className="brand authBrand" href="/">↺ <span>Last Time</span></a>
      <section className="authCard">
        <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Start remembering"}</p>
        <h1>{mode === "signin" ? "Sign in" : "Create your free account"}</h1>
        <p className="authLead">One account. Your trackers. Nothing complicated.</p>

        <button className="googleButton" type="button" disabled={busy} onClick={signInWithGoogle}>
          <span className="googleMark" aria-hidden="true">G</span>
          Continue with Google
        </button>

        <div className="authDivider"><span>or continue with email</span></div>

        <form className="authForm" onSubmit={submit}>
          <label>
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input required minLength={6} type="password" autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </label>
          {error && <div className="formError">{error}</div>}
          {message && <div className="formSuccess">{message}</div>}
          <button className="button primary full" disabled={busy} type="submit">
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          {mode === "signin" && (
            <button type="button" className="textButton resetLink" onClick={sendPasswordReset} disabled={busy}>
              Forgot password?
            </button>
          )}
        </form>

        <button className="textButton" onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setMessage(""); }}>
          {mode === "signin" ? "New here? Create a free account" : "Already have an account? Sign in"}
        </button>

        <p className="authLegal">
          By creating or using an account, you agree to the <a href="/terms">Terms</a> and acknowledge the <a href="/privacy">Privacy Policy</a>.
        </p>
      </section>
    </main>
  );
}
