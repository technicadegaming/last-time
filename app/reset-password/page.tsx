"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanAuthFragment, getSupabaseBrowserClient } from "../../lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        cleanAuthFragment();
        if (!data.session) {
          setError("This password reset link is invalid or expired. Request a new one.");
          return;
        }
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not open the password reset.");
      }
    })();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Use at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setMessage("Password updated. Taking you back to Last Time…");
      setTimeout(() => router.replace("/app"), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="authPage shell">
      <a className="brand authBrand" href="/">↺ <span>Last Time</span></a>
      <section className="authCard">
        <p className="eyebrow">Account recovery</p>
        <h1>Choose a new password</h1>
        <p className="authLead">Set a new password for your Last Time account.</p>

        {error && <div className="formError">{error}</div>}
        {message && <div className="formSuccess">{message}</div>}

        {ready && (
          <form className="authForm" onSubmit={submit}>
            <label>
              New password
              <input required minLength={6} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <label>
              Confirm password
              <input required minLength={6} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </label>
            <button className="button primary full" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}

        {!ready && <a className="textButton" href="/login">Back to sign in</a>}
      </section>
    </main>
  );
}
