import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../lib/server";
import { addFrequency } from "../../../../lib/date";

type FrequencyUnit = "none" | "day" | "week" | "month" | "year";

type TrackerRow = {
  id: string;
  title: string;
  user_id: string;
  household_id: string | null;
  last_done_at: string | null;
  frequency_unit: FrequencyUnit;
  frequency_value: number;
};

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function prettyDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const from = process.env.REMINDER_FROM_EMAIL;
  if (!from) throw new Error("REMINDER_FROM_EMAIL is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed: ${response.status} ${body}`);
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: trackerRows, error: trackerError } = await supabase
      .from("trackers")
      .select("id,title,user_id,household_id,last_done_at,frequency_unit,frequency_value")
      .is("archived_at", null)
      .neq("frequency_unit", "none")
      .gt("frequency_value", 0)
      .not("last_done_at", "is", null);

    if (trackerError) throw trackerError;

    const todayKey = dateKey(new Date());
    let sent = 0;
    let skipped = 0;

    for (const tracker of (trackerRows ?? []) as TrackerRow[]) {
      if (!tracker.last_done_at) continue;

      const due = addFrequency(tracker.last_done_at, tracker.frequency_unit, tracker.frequency_value);
      if (!due) continue;
      const dueKey = dateKey(due);

      // Send once when due or overdue. The same due date will not be sent twice.
      if (dueKey > todayKey) {
        skipped += 1;
        continue;
      }

      let recipientIds = [tracker.user_id];

      if (tracker.household_id) {
        const { data: household } = await supabase
          .from("households")
          .select("owner_id")
          .eq("id", tracker.household_id)
          .maybeSingle();

        let familyPlusActive = false;
        if (household?.owner_id) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("plan,subscription_status")
            .eq("user_id", household.owner_id)
            .maybeSingle();

          familyPlusActive =
            ownerProfile?.plan === "plus" &&
            ["active", "trialing"].includes(ownerProfile.subscription_status ?? "");
        }

        if (familyPlusActive) {
          const { data: members } = await supabase
            .from("household_members")
            .select("user_id")
            .eq("household_id", tracker.household_id);

          if (members?.length) recipientIds = [...new Set(members.map((member) => member.user_id))];
        }
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id,email,email_reminders")
        .in("user_id", recipientIds)
        .eq("email_reminders", true);

      for (const profile of profiles ?? []) {
        if (!profile.email) continue;

        // Reserve before sending so overlapping cron invocations cannot both email.
        const { data: claims, error: claimError } = await supabase
          .from("reminder_deliveries")
          .upsert({
            tracker_id: tracker.id,
            recipient_user_id: profile.user_id,
            due_date: dueKey,
            delivery_status: "pending",
          }, {
            onConflict: "tracker_id,recipient_user_id,due_date",
            ignoreDuplicates: true,
          })
          .select("id");
        if (claimError) throw claimError;
        const claimId = claims?.[0]?.id;
        if (!claimId) {
          skipped += 1;
          continue;
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://donedate.technicade.tech";
        const overdue = dueKey < todayKey;
        const subject = overdue
          ? `DoneDate reminder: ${tracker.title} is overdue`
          : `DoneDate reminder: ${tracker.title} is due today`;

        const safeTitle = escapeHtml(tracker.title);
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#17201b">
            <h2 style="margin-bottom:8px">↺ DoneDate</h2>
            <h1 style="font-size:26px;margin:0 0 16px">${safeTitle}</h1>
            <p style="font-size:16px;line-height:1.5">
              ${overdue ? "This is overdue." : "This is due today."}
              The scheduled date was <strong>${prettyDate(due)}</strong>.
            </p>
            <p>
              <a href="${appUrl}/app/item/${tracker.id}" style="display:inline-block;background:#17201b;color:white;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700">
                Open in DoneDate
              </a>
            </p>
            <p style="font-size:12px;color:#657068;margin-top:28px">
              You can turn email reminders off in DoneDate Settings.
            </p>
          </div>
        `;

        try {
          await sendEmail(profile.email, subject, html);
        } catch (sendError) {
          // A known send failure may be retried later. A crashed/unknown
          // delivery remains pending for manual reconciliation, avoiding duplicates.
          const { error: releaseError } = await supabase.from("reminder_deliveries")
            .delete().eq("id", claimId).eq("delivery_status", "pending");
          if (releaseError) console.error("Could not release failed reminder claim", releaseError);
          throw sendError;
        }

        const { error: logError } = await supabase.from("reminder_deliveries")
          .update({ delivery_status: "sent", sent_at: new Date().toISOString() })
          .eq("id", claimId).eq("delivery_status", "pending");
        if (logError) throw logError;
        sent += 1;
      }
    }

    return NextResponse.json({ ok: true, sent, skipped });
  } catch (error) {
    console.error("Reminder cron failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Reminder cron failed." },
      { status: 500 }
    );
  }
}
