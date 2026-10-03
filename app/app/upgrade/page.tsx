"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type BillingInterval = "yearly" | "monthly";

export default function UpgradePage() {
  const router = useRouter();
  const [limitReached, setLimitReached] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [busy, setBusy] = useState<BillingInterval | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const limit = search.get("limit") === "1";
      const checkoutCancelled = search.get("checkout") === "cancelled";
      setLimitReached(limit);
      setCancelled(checkoutCancelled);
      const viewKey = `last-time-upgrade-view:${window.location.pathname}${window.location.search}`;
      if (!sessionStorage.getItem(viewKey)) {
        track("upgrade_viewed", { reason: limit ? "free_limit" : "manual" });
        sessionStorage.setItem(viewKey, "1");
      }
      if (checkoutCancelled) track("checkout_cancelled");
    }
    getSupabaseBrowserClient().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
  }, [router]);

  async function checkout(interval: BillingInterval) {
    setBusy(interval); setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) { router.replace("/login"); return; }
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ interval }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not start checkout.");
      track("checkout_started", { interval });
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusy(null);
    }
  }

  return <main className="appShell shell">
    <header className="appHeader"><a className="brand" href="/app">← <span>Back</span></a><a className="smallBrand" href="/">↺ AgainDue</a></header>
    <section className="upgradeHero">
      <p className="eyebrow">AgainDue Plus</p>
      <h1>{limitReached ? "You’ve remembered 5 things." : "Keep remembering everything."}</h1>
      <p className="lead">Free is yours forever for up to 5 active trackers. Plus removes the limit and supports the app.</p>
      {cancelled && <div className="formSuccess">No charge was made. You can keep using the free plan.</div>}
      {error && <div className="formError">{error}</div>}
    </section>

    <section className="pricingGrid">
      <article className="priceCard featured">
        <span className="popularBadge">Best value</span>
        <p className="eyebrow">Yearly</p>
        <div className="price"><strong>$14.99</strong><span>/ year</span></div>
        <p className="priceFine">About $1.25/month</p>
        <ul><li>Unlimited active trackers</li><li>Unlimited history</li><li>Custom recurrence</li><li>Billing you can cancel anytime</li></ul>
        <button className="button primary full" onClick={() => checkout("yearly")} disabled={busy !== null}>{busy === "yearly" ? "Opening Stripe…" : "Get Plus yearly"}</button>
      </article>
      <article className="priceCard">
        <p className="eyebrow">Monthly</p>
        <div className="price"><strong>$1.99</strong><span>/ month</span></div>
        <p className="priceFine">Pay month to month</p>
        <ul><li>Unlimited active trackers</li><li>Unlimited history</li><li>Custom recurrence</li><li>Billing you can cancel anytime</li></ul>
        <button className="button ghost full" onClick={() => checkout("monthly")} disabled={busy !== null}>{busy === "monthly" ? "Opening Stripe…" : "Get Plus monthly"}</button>
      </article>
    </section>
    <p className="upgradeFoot">Secure checkout is handled by Stripe. Your card details never pass through AgainDue.</p>
  </main>;
}
