import { NextResponse } from "next/server";
import { getSupabaseAdmin, requireUser } from "../../../../lib/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();

    const [
      { data: profile, error: profileError },
      { data: trackers, error: trackerError },
      { data: occurrences, error: occurrenceError },
      { data: membership, error: membershipError },
    ] = await Promise.all([
      admin
        .from("profiles")
        .select("email,plan,subscription_status,current_period_end,email_reminders,timezone,created_at,updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("trackers")
        .select("id,title,category,emoji,frequency_unit,frequency_value,last_done_at,archived_at,household_id,created_at,updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      admin
        .from("occurrences")
        .select("id,tracker_id,completed_at,note,created_at")
        .eq("user_id", user.id)
        .order("completed_at", { ascending: true }),
      admin
        .from("household_members")
        .select("household_id,role,joined_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileError) throw profileError;
    if (trackerError) throw trackerError;
    if (occurrenceError) throw occurrenceError;
    if (membershipError) throw membershipError;

    let household = null;
    if (membership?.household_id) {
      const { data, error } = await admin
        .from("households")
        .select("id,name,created_at")
        .eq("id", membership.household_id)
        .maybeSingle();
      if (error) throw error;
      household = data;
    }

    const payload = {
      product: "DoneDate",
      exported_at: new Date().toISOString(),
      account: {
        user_id: user.id,
        email: user.email ?? profile?.email ?? null,
        created_at: user.created_at,
      },
      profile,
      household: household ? { ...household, role: membership?.role, joined_at: membership?.joined_at } : null,
      owned_trackers: trackers ?? [],
      completions_recorded_by_you: occurrences ?? [],
      note: "This export contains data owned by or directly attributed to your account. It intentionally excludes private data owned by other family members.",
    };

    const body = JSON.stringify(payload, null, 2);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="donedate-export-${date}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("export error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not export account data." },
      { status: 500 }
    );
  }
}
