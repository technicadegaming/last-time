import { NextResponse } from "next/server";
import { getStripe, getSupabaseAdmin, requireUser } from "../../../../lib/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const interval = body?.interval === "monthly" ? "monthly" : "yearly";
    const priceId = interval === "monthly" ? process.env.STRIPE_MONTHLY_PRICE_ID : process.env.STRIPE_YEARLY_PRICE_ID;
    if (!priceId) return NextResponse.json({ error: `Stripe ${interval} price is not configured.` }, { status: 500 });

    const stripe = getStripe();
    const admin = getSupabaseAdmin();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("stripe_customer_id,subscription_status")
      .eq("user_id", user.id)
      .single();
    if (profileError) throw profileError;

    if (["active", "trialing"].includes(profile?.subscription_status ?? "")) {
      return NextResponse.json({ error: "Your account already has Last Time Plus." }, { status: 409 });
    }

    let customerId = profile?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      const { error } = await admin.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", user.id);
      if (error) throw error;
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/app?checkout=success&interval=${interval}`,
      cancel_url: `${origin}/app/upgrade?checkout=cancelled`,
      metadata: { user_id: user.id, interval },
      subscription_data: { metadata: { user_id: user.id, interval } },
    });

    if (!session.url) throw new Error("Stripe did not return a checkout URL.");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("checkout error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not start checkout." }, { status: 500 });
  }
}
