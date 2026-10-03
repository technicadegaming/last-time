# DoneDate — Production Launch Checklist

This checklist is the remaining operator work after LT-012. The application code is configured to use:

- Canonical app URL: https://donedate.technicade.tech
- Reminder sender: DoneDate <reminders@technicade.tech>
- Support contact: support@technicade.tech

## 1. Database

Run `supabase/LT-012-production-hardening.sql` in Supabase SQL Editor after LT-010 and LT-011.

Expected result: success with no SQL errors.

## 2. Build

From the local repository:

```powershell
cd C:\Projects\last-time
git pull
npm run build
```

Do not deploy a build that reports TypeScript or Next.js errors.

## 3. Vercel production domain

In the DoneDate Vercel project:

1. Add `donedate.technicade.tech` under Settings -> Domains.
2. Add the exact DNS record Vercel requests at the DNS provider for `technicade.tech`.
3. Wait for Vercel to show the domain as valid.
4. Set `NEXT_PUBLIC_APP_URL` to:
   `https://donedate.technicade.tech`
5. Confirm these production environment variables exist:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
   - STRIPE_SECRET_KEY
   - STRIPE_MONTHLY_PRICE_ID
   - STRIPE_YEARLY_PRICE_ID
   - STRIPE_WEBHOOK_SECRET
   - RESEND_API_KEY
   - REMINDER_FROM_EMAIL
   - CRON_SECRET
   - NEXT_PUBLIC_APP_URL
6. Redeploy production.

## 4. Supabase Auth URLs

In Supabase -> Authentication -> URL Configuration:

- Site URL: `https://donedate.technicade.tech`
- Redirect URLs:
  - `https://donedate.technicade.tech/**`
  - Keep the Vercel production URL temporarily during cutover if desired.
  - Keep `http://localhost:3000/**` for local development if desired.

## 5. Google OAuth

In Google Cloud Console for the DoneDate OAuth client, add:

- Authorized JavaScript origin: `https://donedate.technicade.tech`

Keep the Supabase callback URI already configured:
`https://wwoflgmnnjggzaxwslzf.supabase.co/auth/v1/callback`

## 6. Resend

The domain `technicade.tech` must remain verified.

Set Vercel:
`REMINDER_FROM_EMAIL=DoneDate <reminders@technicade.tech>`

Run one authenticated manual reminder request after the custom-domain deployment and confirm delivery.

## 7. Support email

The public Privacy Policy, Terms, and landing page use:
`support@technicade.tech`

Configure that address as a mailbox or forwarding address so incoming support mail is received.

## 8. Stripe live checkout verification

Perform one real live-mode purchase from the public app.

Verify:

1. Checkout completes successfully.
2. The app returns to DoneDate.
3. The account changes to Plus.
4. Unlimited tracker behavior works.
5. Manage Billing opens the Stripe Customer Portal.
6. Canceling changes subscription state correctly after the webhook runs.

If testing with your own payment, refund/cancel it from Stripe afterward if appropriate. Stripe processing fees or refund handling may vary.

## 9. Account/privacy smoke test

Test:

- Email/password sign-up
- Google sign-in
- Forgot password
- Password reset
- Quick Add
- Voice capture in Chrome/Edge
- Create tracker
- Due/overdue dashboard grouping
- Mark "Did it again"
- Completion history
- Email reminders
- Create family
- Copy invite link
- Join family from a second account
- Shared tracker visibility
- "Who did it" shared history
- Remove family member
- Leave family
- Dissolve family
- Export account data
- Privacy page
- Terms page

Use a disposable account to verify Delete Account:
- Type DELETE
- Account is removed
- Future billing is stopped
- Sign-in no longer works

## 10. Public repository hygiene

The repository intentionally contains only placeholder values in `.env.example`.
Do not commit:

- `.env`
- `.env.local`
- Stripe secret keys
- Stripe webhook secrets
- Supabase service-role keys
- Resend API keys
- CRON_SECRET
- Google OAuth client secrets

The current `.gitignore` excludes local environment files.

## Launch gate

DoneDate is ready to actively promote when all of these are true:

- Production build succeeds
- Custom domain resolves over HTTPS
- Google and email auth work on the custom domain
- One live Stripe purchase succeeds
- One real reminder email succeeds
- Export works
- Delete-account works on a disposable account
- Privacy and Terms pages are publicly reachable
- support@technicade.tech receives mail


## Brand transition (LT-017)

The customer-facing product name is now **DoneDate**. The existing production URL
`https://donedate.technicade.tech` is a temporary legacy URL during the transition.

Before paid promotion:
- Add `donedate.technicade.tech` in Vercel and DNS.
- Change `NEXT_PUBLIC_APP_URL` to `https://donedate.technicade.tech`.
- Add the new URL to Supabase Auth redirect URLs and Google OAuth authorized origins.
- Update Stripe public business name/product branding to DoneDate / DoneDate by Technicade.
- Update REMINDER_FROM_EMAIL display name from DoneDate to DoneDate.
- Keep the old domain redirecting to the new domain during the transition.


## DoneDate production cutover

Before paid advertising, finish the external-service cutover:
- Vercel: add `donedate.technicade.tech` and make it the production domain.
- Vercel: set `NEXT_PUBLIC_APP_URL=https://donedate.technicade.tech` and redeploy.
- Namecheap: create the DNS record Vercel requests for `donedate`.
- Supabase Auth: set Site URL to `https://donedate.technicade.tech` and add `https://donedate.technicade.tech/**` to Redirect URLs.
- Google OAuth: add `https://donedate.technicade.tech` as an authorized JavaScript origin and update app branding to DoneDate.
- Stripe: update customer-facing product/public branding from the temporary names to DoneDate / DoneDate by Technicade.
- Resend/Vercel: set `REMINDER_FROM_EMAIL=DoneDate <reminders@technicade.tech>`.
- Keep the legacy `lasttime.technicade.tech` hostname working temporarily, then redirect it to `donedate.technicade.tech`.
