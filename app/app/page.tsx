"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cleanAuthFragment, getSupabaseBrowserClient } from "../../lib/supabase";
import { nextDueText, relativeTime, type FrequencyUnit } from "../../lib/date";

type Tracker = {
  id: string;
  title: string;
  category: string;
  emoji: string;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
  last_done_at: string | null;
  created_at: string;
};

type Profile = { plan: "free" | "plus"; subscription_status: string | null };

export default function Dashboard() {
  const router = useRouter();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [profile, setProfile] = useState<Profile>({ plan: "free", subscription_status: null });
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [syncingBilling, setSyncingBilling] = useState(false);

  const load = useCallback(async () => {
    try {
      cleanAuthFragment();
      if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("checkout") === "success") {
        setCheckoutSuccess(true);
      }
      const supabase = getSupabaseBrowserClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/login");
        return;
      }
      setEmail(sessionData.session.user.email ?? "");

      const [{ data, error: queryError }, { data: p, error: profileError }] = await Promise.all([
        supabase
          .from("trackers")
          .select("id,title,category,emoji,frequency_unit,frequency_value,last_done_at,created_at")
          .is("archived_at", null)
          .order("last_done_at", { ascending: true, nullsFirst: true }),
        supabase
          .from("profiles")
          .select("plan,subscription_status")
          .eq("user_id", sessionData.session.user.id)
          .single(),
      ]);
      if (queryError) throw queryError;
      if (profileError) throw profileError;
      setTrackers((data ?? []) as Tracker[]);
      setProfile((p ?? { plan: "free", subscription_status: null }) as Profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your trackers.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkout = new URLSearchParams(window.location.search).get("checkout");
    if (checkout !== "success") return;

    let cancelled = false;
    (async () => {
      setSyncingBilling(true);
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        for (let attempt = 0; attempt < 4 && !cancelled; attempt += 1) {
          const response = await fetch("/api/stripe/sync", { method: "POST", headers: { authorization: `Bearer ${token}` } });
          const result = await response.json();
          if (response.ok && result.plan === "plus") { await load(); break; }
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      } finally {
        if (!cancelled) setSyncingBilling(false);
      }
    })();
    return () => { cancelled = true; };
  }, [load]);

  const initial = useMemo(() => (email[0] || "?").toUpperCase(), [email]);
  const plus = profile.plan === "plus" && ["active", "trialing"].includes(profile.subscription_status ?? "");

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function markDone(event: React.MouseEvent, trackerId: string) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: rpcError } = await supabase.rpc("mark_tracker_done", { p_tracker_id: trackerId });
      if (rpcError) throw rpcError;
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark that as done.");
    }
  }

  function addTracker() {
    if (!plus && trackers.length >= 5) router.push("/app/upgrade?limit=1");
    else router.push("/app/new");
  }

  return (
    <main className="appShell shell">
      <header className="appHeader">
        <a className="brand" href="/">↺ <span>Last Time</span></a>
        <div className="accountArea">
          <a className="settingsLink" href="/app/settings">Settings</a>
          <span className="accountEmail">{email}</span>
          <button className="avatar" onClick={signOut} title="Sign out">{initial}</button>
        </div>
      </header>

      <section className="dashboardIntro">
        <p className="muted">YOUR LAST TIMES</p>
        <h1>What have you done lately?</h1>
        <button className="button primary add" onClick={addTracker}>+ Add something</button>
      </section>

      {checkoutSuccess && <div className="formSuccess dashboardMessage">Payment received. {syncingBilling ? "Activating Last Time Plus…" : plus ? "Last Time Plus is active." : "Stripe is finishing the subscription sync."}</div>}
      {error && <div className="formError dashboardMessage">{error}</div>}

      {!loading && <section className={`planStrip ${plus ? "plus" : "free"}`}>
        <div><strong>{plus ? "Last Time Plus" : "Free plan"}</strong><span>{plus ? "Unlimited active trackers" : `${trackers.length} of 5 active trackers used`}</span></div>
        {plus ? <span className="planBadge">PLUS</span> : <a href="/app/upgrade">Upgrade</a>}
      </section>}

      {loading ? (
        <section className="emptyState"><strong>Loading…</strong></section>
      ) : trackers.length === 0 ? (
        <section className="emptyState">
          <div className="emptyIcon">↺</div>
          <h2>Nothing to remember yet.</h2>
          <p>Add the first thing you never want to wonder about again.</p>
          <button className="button primary" onClick={addTracker}>+ Add your first thing</button>
        </section>
      ) : (
        <section className="panel">
          <div className="panelTitle"><h2>Your things</h2><span>{trackers.length}</span></div>
          {trackers.map((item) => (
            <a className="tracker trackerLink" key={item.id} href={`/app/item/${item.id}`}>
              <div className="trackerIcon">{item.emoji || "↺"}</div>
              <div className="trackerText">
                <strong>{item.title}</strong>
                <span>{relativeTime(item.last_done_at)} · {nextDueText(item.last_done_at, item.frequency_unit, item.frequency_value)}</span>
              </div>
              <button className="miniDone" onClick={(event) => markDone(event, item.id)}>✓ Did it again</button>
            </a>
          ))}
        </section>
      )}
    </main>
  );
}
