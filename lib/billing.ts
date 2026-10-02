import type Stripe from "stripe";
import { getSupabaseAdmin } from "./server";

export function stripeId(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function subscriptionIsPlus(status: Stripe.Subscription.Status | string | null | undefined) {
  return status === "active" || status === "trialing";
}

export async function syncSubscription(subscription: Stripe.Subscription, hintedUserId?: string | null) {
  const admin = getSupabaseAdmin();
  const customerId = stripeId(subscription.customer as string | { id: string });
  const userId = hintedUserId || subscription.metadata?.user_id || null;
  const active = subscriptionIsPlus(subscription.status);
  const periodEnd = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
    .sort((a, b) => b - a)[0];

  const update = {
    plan: active ? "plus" : "free",
    subscription_status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };

  if (userId) {
    const { error } = await admin.from("profiles").update(update).eq("user_id", userId);
    if (error) throw error;
    return;
  }

  if (customerId) {
    const { error } = await admin.from("profiles").update(update).eq("stripe_customer_id", customerId);
    if (error) throw error;
  }
}
