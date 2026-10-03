import { NextResponse } from "next/server";
import { getStripe, getSupabaseAdmin, requireUser } from "../../../../lib/server";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let confirmation = "";
    try {
      const body = await request.json();
      confirmation = String(body?.confirmation ?? "");
    } catch {
      // handled below
    }

    if (confirmation !== "DELETE") {
      return NextResponse.json({ error: 'Type "DELETE" to confirm permanent account deletion.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id,stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    // Stop future billing before removing the account. Stripe may retain
    // transaction records where required for financial/legal compliance.
    if (profile?.stripe_customer_id || profile?.stripe_subscription_id) {
      const stripe = getStripe();

      if (profile.stripe_subscription_id) {
        try {
          await stripe.subscriptions.cancel(profile.stripe_subscription_id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!/No such subscription|canceled/i.test(message)) throw error;
        }
      }

      if (profile.stripe_customer_id) {
        try {
          await stripe.customers.del(profile.stripe_customer_id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (!/No such customer|deleted/i.test(message)) throw error;
        }
      }
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("account delete error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete account." },
      { status: 500 }
    );
  }
}
