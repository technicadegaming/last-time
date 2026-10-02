# Last Time — LT-006

Dead-simple life maintenance tracking with a real free plan and Stripe subscriptions.

## What works now

- Email/password auth with Supabase
- Trackers + persistent completion history
- Recurrence and next-due calculations
- One-tap **Did it again**
- Edit, archive, delete
- Free plan: **5 active trackers**
- Database-enforced free limit (not just a UI check)
- Last Time Plus: **$1.99/month** or **$14.99/year**
- Stripe Checkout
- Stripe webhook -> automatically activates/deactivates Plus
- Stripe Customer Portal -> customers can manage/cancel billing
- Pricing on the public landing page

## Upgrade your existing LT-003/004/005 database

In Supabase -> SQL Editor, run the entire file:

`supabase/LT-006-billing.sql`

This creates the `profiles` table, backfills your existing account, and installs the server-side 5-tracker limit.

## Environment variables

Copy `.env.example` to `.env.local` and keep your existing Supabase public values.

Add the server-only Supabase **service_role** key and your Stripe test-mode values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY

STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` or `STRIPE_SECRET_KEY` with a `NEXT_PUBLIC_` prefix.

## Stripe setup

In Stripe **test mode**:

1. Create product: `Last Time Plus`.
2. Add recurring price: `$1.99 USD`, monthly. Copy its `price_...` ID.
3. Add recurring price: `$14.99 USD`, yearly. Copy its `price_...` ID.
4. Put those IDs in `.env.local`.
5. Get your test secret/publishable keys from Stripe -> Developers -> API keys.
6. For local webhook testing, install the Stripe CLI, sign in, then run:

```powershell
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

7. The CLI prints a `whsec_...` secret. Put that in `STRIPE_WEBHOOK_SECRET` and restart `npm run dev`.
8. In Stripe -> Settings -> Billing -> Customer portal, activate/configure the portal so **Manage billing** can open.

For production later, create a real webhook endpoint at:

`https://YOUR_DOMAIN/api/stripe/webhook`

Listen for:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Use the production endpoint's signing secret in production.

## Run

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

## Test the money path

1. Sign in.
2. Confirm dashboard says `Free plan` and `1 of 5 active trackers used` (or your actual count).
3. Add trackers until there are 5 active trackers.
4. Attempt tracker #6 -> app must send you to the Plus screen.
5. Choose monthly or yearly -> Stripe Checkout should open.
6. In Stripe test mode use card `4242 4242 4242 4242`, any future expiry, any CVC/postal code.
7. Complete Checkout and return to Last Time.
8. Refresh after a few seconds -> dashboard should show `Last Time Plus` and `Unlimited active trackers`.
9. Add tracker #6 successfully.
10. Settings -> Manage billing should open Stripe's Customer Portal.

## Security notes

- Stripe handles card entry. Last Time never receives raw card data.
- The Supabase service-role key and Stripe secret key are server-only.
- Browser users can read only their own profile/tracker data through RLS.
- Billing status cannot be changed by browser clients.
- The 5-tracker free limit is enforced in PostgreSQL, not only in React.

## LT-007 — production billing sync + deployment

LT-007 makes Stripe subscription state resilient enough for production launch:

- Stripe webhook remains the long-term source of truth.
- After a successful Checkout return, the dashboard asks Stripe to sync the logged-in account immediately, so Plus usually appears without a manual refresh.
- Subscription create/update/delete/pause/resume events update the Supabase profile.
- Failed subscription invoices trigger a fresh subscription-state sync.
- Checkout and Billing Portal can use `NEXT_PUBLIC_APP_URL` in production instead of relying on request-origin inference.

### Vercel environment variables

Add these to the Vercel project for Production (and Preview if desired):

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_MONTHLY_PRICE_ID
STRIPE_YEARLY_PRICE_ID
STRIPE_WEBHOOK_SECRET
NEXT_PUBLIC_APP_URL
```

For the first deployment, `STRIPE_WEBHOOK_SECRET` can temporarily be left unset. Deploy, copy the public Vercel URL, create the Stripe webhook endpoint, then add its `whsec_...` secret and redeploy.

### Stripe webhook endpoint

Use:

```text
https://YOUR-DOMAIN/api/stripe/webhook
```

Subscribe to these events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.payment_failed
```

Copy the webhook signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET` in Vercel, then redeploy.

### End-to-end production test

1. Sign in to Last Time.
2. Open Upgrade and buy the sandbox yearly plan.
3. Stripe redirects to `/app?checkout=success`.
4. The banner should change from activating to `Last Time Plus is active.`
5. Refresh and confirm Plus remains active.
6. Sign out/in and confirm Plus remains active.
7. Settings -> Manage billing should open the Stripe Customer Portal.
8. Cancel the sandbox subscription in the portal, return to Last Time, and verify the subscription status changes after Stripe sends the webhook. Depending on cancellation settings, Plus can remain active through the paid period and then return to Free at cancellation end.
