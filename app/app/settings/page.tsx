"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type Profile = { plan: "free"|"plus"; subscription_status: string|null; current_period_end: string|null; };

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (!data.session) { router.replace("/login"); return; }
      setEmail(data.session.user.email ?? "");
      const { data: p, error: pError } = await supabase.from("profiles").select("plan,subscription_status,current_period_end").eq("user_id", data.session.user.id).single();
      if (pError) setError(pError.message); else setProfile(p as Profile);
    })();
  }, [router]);

  async function billing() {
    setBusy(true); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { router.replace("/login"); return; }
      const response = await fetch("/api/stripe/portal", { method:"POST", headers:{ authorization:`Bearer ${token}` } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open billing.");
      window.location.href = result.url;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open billing."); setBusy(false); }
  }

  const plus = profile?.plan === "plus" && ["active","trialing"].includes(profile.subscription_status ?? "");
  return <main className="appShell shell">
    <header className="appHeader"><a className="brand" href="/app">← <span>Back</span></a><a className="smallBrand" href="/">↺ Last Time</a></header>
    <section className="formPage settingsPage">
      <p className="eyebrow">Account</p><h1>Settings</h1>
      {error && <div className="formError dashboardMessage">{error}</div>}
      <section className="settingsCard"><span>Email</span><strong>{email}</strong></section>
      <section className="settingsCard"><span>Plan</span><div><strong>{plus ? "Last Time Plus" : "Free"}</strong><p>{plus ? "Unlimited active trackers" : "Up to 5 active trackers"}</p></div></section>
      {plus ? <button className="button ghost full" onClick={billing} disabled={busy}>{busy ? "Opening billing…" : "Manage billing"}</button> : <a className="button primary full" href="/app/upgrade">Upgrade to Plus</a>}
    </section>
  </main>;
}
