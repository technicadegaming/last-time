"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "../../../lib/supabase";

type Profile = {
  plan: "free" | "plus";
  subscription_status: string | null;
  current_period_end: string | null;
  email_reminders: boolean;
  timezone: string;
};

type Household = {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
};

type HouseholdMember = {
  user_id: string;
  role: "owner" | "member";
  email: string | null;
  joined_at: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [household, setHousehold] = useState<Household | null>(null);
  const [householdRole, setHouseholdRole] = useState<"owner" | "member" | null>(null);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [householdName, setHouseholdName] = useState("My family");
  const [inviteCode, setInviteCode] = useState("");
  const [familyMessage, setFamilyMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [familyBusy, setFamilyBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
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
        .select("plan,subscription_status,current_period_end,email_reminders,timezone")
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
      setMembers([]);
      return;
    }

    setHouseholdRole(membership.role as "owner" | "member");

    const [{ data: h, error: hError }, memberResult] = await Promise.all([
      supabase
        .from("households")
        .select("id,name,invite_code,owner_id")
        .eq("id", membership.household_id)
        .single(),
      supabase.rpc("get_household_members"),
    ]);

    if (hError) setError(hError.message);
    else setHousehold(h as Household);

    if (!memberResult.error) setMembers((memberResult.data ?? []) as HouseholdMember[]);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function getToken() {
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function billing() {
    setBusy(true);
    setError("");
    try {
      const token = await getToken();
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
      setFamilyMessage("Family created. Share the invite link with the people you want to add.");
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not create the family.";
      setError(message.includes("PLUS_REQUIRED") ? "Creating a family requires DoneDate Plus." : message);
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
    const link = `${window.location.origin}/join/${household.invite_code}`;
    await navigator.clipboard.writeText(link);
    setFamilyMessage("Family invite link copied.");
  }

  async function updateReminders(enabled: boolean) {
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago";
      const { error: prefError } = await supabase.rpc("set_profile_preferences", {
        p_email_reminders: enabled,
        p_timezone: timezone,
      });
      if (prefError) throw prefError;
      setProfile((current) => current ? { ...current, email_reminders: enabled, timezone } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update reminder settings.");
    }
  }

  async function removeFamilyMember(member: HouseholdMember) {
    if (!confirm(`Remove ${member.email || "this member"} from your family?`)) return;
    setFamilyBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: removeError } = await supabase.rpc("remove_household_member", { p_user_id: member.user_id });
      if (removeError) throw removeError;
      setFamilyMessage("Family member removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove that family member.");
    } finally {
      setFamilyBusy(false);
    }
  }

  async function leaveFamily() {
    if (!confirm("Leave this family? Shared family trackers will disappear from your account.")) return;
    setFamilyBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: leaveError } = await supabase.rpc("leave_household");
      if (leaveError) throw leaveError;
      setFamilyMessage("You left the family.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not leave the family.");
    } finally {
      setFamilyBusy(false);
    }
  }

  async function dissolveFamily() {
    if (!confirm("Dissolve this family? Members will lose access to shared trackers. Trackers stay with their original creators.")) return;
    setFamilyBusy(true);
    setError("");
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: deleteError } = await supabase.rpc("delete_household");
      if (deleteError) throw deleteError;
      setFamilyMessage("Family dissolved. Existing trackers are now private to their creators.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not dissolve the family.");
    } finally {
      setFamilyBusy(false);
    }
  }

  async function exportData() {
    setAccountBusy(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/account/export", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Could not export your data.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] || "donedate-export.json";
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not export your data.");
    } finally {
      setAccountBusy(false);
    }
  }

  async function deleteAccount() {
    const confirmation = window.prompt(
      "This permanently deletes your DoneDate account and stops future billing. Type DELETE to continue."
    );
    if (confirmation !== "DELETE") return;

    setAccountBusy(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const response = await fetch("/api/account/delete", {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ confirmation }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not delete your account.");

      try {
        await getSupabaseBrowserClient().auth.signOut();
      } catch {
        // The auth user is already gone, so local cleanup may fail harmlessly.
      }
      window.location.href = "/?account=deleted";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete your account.");
      setAccountBusy(false);
    }
  }

  const plus = profile?.plan === "plus" && ["active", "trialing"].includes(profile.subscription_status ?? "");

  return (
    <main className="appShell shell">
      <header className="appHeader">
        <a className="brand" href="/app">← <span>Back</span></a>
        <a className="smallBrand" href="/">↺ DoneDate</a>
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
            <strong>{plus ? "DoneDate Plus" : "Free"}</strong>
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

        <section className="settingsSubsection">
          <div className="familySectionHead">
            <div>
              <p className="eyebrow">Reminders</p>
              <h2>Email reminders</h2>
            </div>
          </div>
          <label className="toggleCard">
            <div>
              <strong>Email me when something is due</strong>
              <p>One reminder when a scheduled item becomes due or overdue.</p>
            </div>
            <input
              type="checkbox"
              checked={profile?.email_reminders ?? true}
              onChange={(event) => updateReminders(event.target.checked)}
            />
          </label>
        </section>

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
                <p>Shared trackers are visible to everyone in this family while the owner has Plus.</p>
              </div>

              <div className="inviteBox">
                <span>Invite code</span>
                <strong>{household.invite_code.toUpperCase()}</strong>
                <button type="button" className="button ghost" onClick={copyInvite}>Copy invite link</button>
              </div>

              {members.length > 0 && (
                <div className="memberList">
                  <span className="familyLabel">Members</span>
                  {members.map((member) => (
                    <div className="memberRow" key={member.user_id}>
                      <div>
                        <strong>{member.email || "Family member"}</strong>
                        <span>{member.role === "owner" ? "Owner" : "Member"}</span>
                      </div>
                      {householdRole === "owner" && member.user_id !== userId && (
                        <button type="button" className="textButton dangerText" onClick={() => removeFamilyMember(member)} disabled={familyBusy}>
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {householdRole === "member" ? (
                <button type="button" className="button ghost full" onClick={leaveFamily} disabled={familyBusy}>
                  Leave family
                </button>
              ) : (
                <button type="button" className="textButton dangerText" onClick={dissolveFamily} disabled={familyBusy}>
                  Dissolve family
                </button>
              )}
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

        <section className="settingsSubsection">
          <div className="familySectionHead">
            <div>
              <p className="eyebrow">Your data</p>
              <h2>Export & account</h2>
            </div>
          </div>
          <div className="accountTools">
            <div className="accountTool">
              <div>
                <strong>Download your data</strong>
                <p>Export your account, trackers, schedules, and completion history as JSON.</p>
              </div>
              <button type="button" className="button ghost" onClick={exportData} disabled={accountBusy}>
                Export data
              </button>
            </div>
            <div className="accountTool dangerZone">
              <div>
                <strong>Delete account permanently</strong>
                <p>Stops future billing and permanently removes your DoneDate account and app data.</p>
              </div>
              <button type="button" className="button dangerButton" onClick={deleteAccount} disabled={accountBusy}>
                Delete account
              </button>
            </div>
          </div>
        </section>

        <div className="settingsLegal">
          <a href="/privacy">Privacy Policy</a>
          <span>·</span>
          <a href="/terms">Terms of Service</a>
        </div>
      </section>
    </main>
  );
}
