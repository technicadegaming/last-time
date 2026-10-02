"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type Profile = {
  plan: "free" | "plus";
  subscription_status: string | null;
  current_period_end: string | null;
};

type Household = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdRole, setHouseholdRole] = useState<"owner" | "member" | null>(null);
  const [householdName, setHouseholdName] = useState("My family");
  const [inviteCode, setInviteCode] = useState("");
  const [familyMessage, setFamilyMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return;
    }

    const currentUserId = data.session.user.id;
    setUserId(currentUserId);
    setEmail(data.session.user.email ?? "");

    const [{ data: p, error: pError }, { data: membership, error: mError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("plan,subscription_status,current_period_end")
        .eq("user_id", currentUserId)
        .single(),
      supabase
        .from("household_members")
        .select("household_id,role")
        .eq("user_id", currentUserId)
        .maybeSingle(),
    ]);

    if (pError) setError(pError.message);
    else setProfile(p as Profile);

    if (mError) {
      if (!mError.message.toLowerCase().includes("household_members")) setError(mError.message);
      return;
    }

    if (!membership) {
      setHousehold(null);
      setHouseholdRole(null);
      return;
    }

    setHouseholdRole(membership.role as "owner" | "member");
    const { data: h, error: hError } = await supabase
      .from("households")
      .select("id,name,invite_code,owner_id")
      .eq("id", membership.household_id)
      .single();

    if (hError) setError(hError.message);
    else setHousehold(h as Household);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function billing() {
    setBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }
      const response = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not open billing.");
      window.location.href = result.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing.");
      setBusy(false);
    }
  }

  async function createFamily(event: FormEvent) {
    event.preventDefault();
    if (!householdName.trim()) return;
    setFamilyBusy(true);
    setError("");
    setFamilyMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: familyError } = await supabase.rpc("create_household", {
        p_name: householdName.trim(),
      });
      if (familyError) throw familyError;
      setFamilyMessage("Family created. Share the invite code with the people you want to add.");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the family.";
      setError(message.includes("PLUS_REQUIRED") ? "Creating a family requires Last Time Plus." : message);
    } finally {
      setFamilyBusy(false);
    }
  }

  async function joinFamily(event: FormEvent) {
    event.preventDefault();
    if (!inviteCode.trim()) return;
    setFamilyBusy(true);
    setError("");
    setFamilyMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: familyError } = await supabase.rpc("join_household", {
        p_invite_code: inviteCode.trim(),
      });
      if (familyError) throw familyError;
      setInviteCode("");
      setFamilyMessage("You're in. Shared family trackers will now appear on your dashboard.");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not join that family.";
      setError(message.includes("INVITE_NOT_FOUND") ? "That family invite code was not found." : message);
    } finally {
      setFamilyBusy(false);
    }
  }

  async function copyInvite() {
    if (!household?.invite_code) return;
    await navigator.clipboard.writeText(household.invite_code);
    setFamilyMessage("Invite code copied.");
  }

  const plus = profile?.plan === "plus" && ["active", "trialing"].includes(profile.subscription_status ?? "");

  return (
    <main className="appShell shell">
      <header className="appHeader">
        <a className="brand" href="/app">← <span>Back</span></a>
        <a className="smallBrand" href="/">↺ Last Time</a>
      </header>

      <section className="formPage settingsPage">
        <p className="eyebrow">Account</p>
        <h1>Settings</h1>

        {error && <div className="formError dashboardMessage">{error}</div>}
        {familyMessage && <div className="formSuccess dashboardMessage">{familyMessage}</div>}

        <section className="settingsCard">
          <span>Email</span>
          <strong>{email}</strong>
        </section>

        <section className="settingsCard">
          <span>Plan</span>
          <div>
            <strong>{plus ? "Last Time Plus" : "Free"}</strong>
            <p>{plus ? "Unlimited active trackers" : "Up to 5 active trackers"}</p>
          </div>
        </section>

        {plus ? (
          <button className="button ghost full" onClick={billing} disabled={busy}>
            {busy ? "Opening billing…" : "Manage billing"}
          </button>
        ) : (
          <a className="button primary full" href="/app/upgrade">Upgrade to Plus</a>
        )}

        <section className="familySection">
          <div className="familySectionHead">
            <div>
              <p className="eyebrow">Family</p>
              <h2>Shared access</h2>
            </div>
            {household && <span className="familyBadge">{householdRole === "owner" ? "Owner" : "Member"}</span>}
          </div>

          {household ? (
            <div className="familyCard">
              <div>
                <span className="familyLabel">Your family</span>
                <strong>{household.name}</strong>
                <p>Shared trackers are visible to everyone in this family.</p>
              </div>

              <div className="inviteBox">
                <span>Invite code</span>
                <strong>{household.invite_code.toUpperCase()}</strong>
                <button type="button" className="button ghost" onClick={copyInvite}>Copy code</button>
              </div>
            </div>
          ) : (
            <div className="familySetupGrid">
              <form className="familyCard" onSubmit={createFamily}>
                <div>
                  <span className="familyLabel">Start a family</span>
                  <strong>Share trackers with your household</strong>
                  <p>One Plus account creates the family. Other family members can join with their own login.</p>
                </div>
                <input
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  maxLength={80}
                  placeholder="My family"
                  disabled={!plus || familyBusy}
                />
                {plus ? (
                  <button className="button primary full" disabled={familyBusy || !householdName.trim()}>
                    {familyBusy ? "Creating…" : "Create family"}
                  </button>
                ) : (
                  <a className="button primary full" href="/app/upgrade">Upgrade to create a family</a>
                )}
              </form>

              <form className="familyCard" onSubmit={joinFamily}>
                <div>
                  <span className="familyLabel">Have an invite?</span>
                  <strong>Join your family</strong>
                  <p>Family members don't need their own Plus subscription to join.</p>
                </div>
                <input
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  maxLength={16}
                  placeholder="Invite code"
                  autoCapitalize="characters"
                  disabled={familyBusy}
                />
                <button className="button ghost full" disabled={familyBusy || !inviteCode.trim()}>
                  {familyBusy ? "Joining…" : "Join family"}
                </button>
              </form>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
