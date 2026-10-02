import { NextResponse } from "next/server";
import { getStripe, getSupabaseAdmin, requireUser } from "../../../../lib/server";
import { subscriptionIsPlus, syncSubscription } from "../../../../lib/billing";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();
    if (error) throw error;

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ plan: "free", subscription_status: null });
    }

    const stripe = getStripe();
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: "all",
      limit: 10,
    });

    const subscription =
      subscriptions.data.find((item) => subscriptionIsPlus(item.status)) ??
      subscriptions.data.sort((a, b) => b.created - a.created)[0];

    if (!subscription) {
      const { error: updateError } = await admin
        .from("profiles")
        .update({ plan: "free", subscription_status: null, stripe_subscription_id: null, current_period_end: null })
        .eq("user_id", user.id);
      if (updateError) throw updateError;
      return NextResponse.json({ plan: "free", subscription_status: null });
    }

    await syncSubscription(subscription, user.id);
    return NextResponse.json({
      plan: subscriptionIsPlus(subscription.status) ? "plus" : "free",
      subscription_status: subscription.status,
    });
  } catch (error) {
    console.error("stripe sync error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not sync billing." }, { status: 500 });
  }
}
