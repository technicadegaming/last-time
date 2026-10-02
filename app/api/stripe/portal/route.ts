import { NextResponse } from "next/server";
import { getStripe, getSupabaseAdmin, requireUser } from "../../../../lib/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = getSupabaseAdmin();
    const { data: profile, error } = await admin.from("profiles").select("stripe_customer_id").eq("user_id", user.id).single();
    if (error) throw error;
    if (!profile?.stripe_customer_id) return NextResponse.json({ error: "No billing account exists yet." }, { status: 400 });

    const stripe = getStripe();
    const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
    const portal = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}/app/settings`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    console.error("portal error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not open billing." }, { status: 500 });
  }
}
