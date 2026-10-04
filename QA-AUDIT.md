# DoneDate — Launch QA Audit

Updated: 2026-10-04

Legend:
- PASS = verified by live user test or build
- CODE PASS = reviewed in source and build passed, but live interaction still needs verification
- PENDING = needs live test
- FIXED = issue found during audit and patched; redeploy/retest required

## Already verified

| Area | Status | Evidence / note |
| --- | --- | --- |
| Production build | PASS | User confirmed successful Next.js production build |
| Custom domain | PASS | donedate.technicade.tech configured and valid in Vercel |
| Google sign-in on custom domain | PASS | User confirmed live Google login works |
| Stripe live charge | PASS | User confirmed real card was charged |
| Plus activation | PASS | User confirmed app shows DoneDate Plus |
| Stripe billing portal | PASS | User confirmed Manage Billing opens Stripe portal |
| Reminder delivery | PASS | User confirmed real Resend reminder email delivered |
| Resend domain | PASS | technicade.tech verified |
| Support email receiving | PASS | User confirmed support@technicade.tech forwards successfully |
| Mobile Settings visibility | PASS | Live mobile review confirmed Settings is visible and usable |
| Privacy / Terms | CODE PASS | Public routes implemented and linked |
| Secret hygiene | CODE PASS | No committed live secret files found; .env and .env.local ignored |

## Audit fixes found and patched

| Finding | Status | Fix |
| --- | --- | --- |
| Shared-family reminder recipients could continue after family owner lost Plus | FIXED | LT-014 gates household reminder fan-out on active/trialing owner Plus |
| Tracker titles were interpolated directly into reminder email HTML | FIXED | LT-014 HTML-escapes user tracker titles |
| Reminder endpoint could operate without CRON_SECRET in earlier version | FIXED | LT-012 now fails closed if CRON_SECRET is missing |
| Mobile CSS hid Settings | FIXED | LT-013 restores a visible mobile Settings control |
| Shared tracker ownership/sharing fields needed stronger mutation protection | FIXED | LT-012 database trigger prevents ownership transfer and member sharing changes |

## Live functional tests still required

### Billing
- [x] Plus account can create tracker #6 and beyond. PASS — live user test confirmed more than 6 active trackers.
- [ ] Monthly/annual checkout buttons point to intended live prices.
- [ ] Cancel through Stripe portal and confirm DoneDate subscription state updates correctly.
- [ ] Re-subscription after cancellation behaves correctly.

### Account and authentication
- [ ] Email/password signup works on custom domain.
- [ ] Email/password login works.
- [x] Forgot-password email arrives. PASS — live user test confirmed reset email arrived.
- [x] Password reset returns to custom domain and new password works. PASS — live user test confirmed password reset completed successfully.
- [ ] Logout clears session.
- [x] Disposable-account deletion works. PASS — live user test confirmed deletion signed the user out and removed prior tracker data. Signing in again with Google created a fresh account, which is expected OAuth behavior.

### Tracker core loop
- [ ] Create tracker without last-done date.
- [ ] Create tracker with last-done date.
- [ ] Quick Add fills expected title/category/frequency.
- [ ] Voice capture works in Chrome/Edge and handles denied mic access.
- [ ] Did it again adds history and updates last-done date.
- [ ] Edit title/category/frequency works.
- [ ] Archive removes tracker from active dashboard without deleting history.
- [ ] Delete permanently removes tracker/history.
- [ ] Due grouping correctly shows Overdue / Due soon / Later / No schedule.

### Free plan
- [ ] Free user can create trackers 1 through 5.
- [ ] Tracker #6 routes to upgrade and is rejected by database if bypass attempted.
- [ ] Archived tracker no longer counts toward active free limit.

### Family sharing
- [x] Plus owner creates family. PASS — live mobile test confirmed family setup works.
- [x] Invite link survives login/signup and joins second user. PASS — live family test confirmed joining works.
- [x] Free invited member can join. PASS — live family test confirmed.
- [x] Shared tracker appears to both users. PASS — live family test confirmed shared access.
- [ ] Private tracker remains private.
- [x] Member can mark shared tracker done. PASS — live family test confirmed core shared tracker interaction.
- [ ] History displays the completing member.
- [ ] Member cannot delete creator's tracker.
- [ ] Owner can remove member.
- [ ] Member can leave family.
- [ ] Owner can dissolve family.
- [ ] After owner loses Plus, invited members lose shared access.
- [ ] After owner loses Plus, reminder emails are no longer fanned out to family members.

### Reminders
- [ ] Due-today tracker sends exactly one reminder per recipient/due date.
- [ ] Overdue tracker sends if no reminder was previously logged for that due date.
- [ ] Re-running cron does not duplicate same reminder.
- [ ] Email reminder OFF prevents delivery.
- [ ] Reminder button opens donedate.technicade.tech.
- [ ] Special characters in tracker title render safely in email.

### Data controls
- [x] Export downloads JSON. PASS — live user test confirmed download.
- [x] Export contains account/profile/owned trackers/completions. PASS — user reviewed export and confirmed contents looked correct.
- [ ] Export excludes other family members' private data.
- [ ] Delete account cancels active Stripe subscription before deleting auth user.
- [x] Delete account cleans up owned trackers/history/profile through cascades. PASS — live user test confirmed the recreated Google account had none of the deleted account's trackers.

### Public pages / UX
- [x] Home page renders correctly mobile and desktop. PASS — reviewed desktop and mobile recordings.
- [ ] Pricing copy matches Stripe prices.
- [ ] Privacy page opens.
- [ ] Terms page opens.
- [ ] Support link uses support@technicade.tech.
- [x] Settings visible in mobile layout. PASS — confirmed in live mobile review. Installed-PWA launch behavior still pending.
- [ ] PWA launches to /app.
- [x] No clipped controls at tested phone width. PASS — reviewed mobile recording.
- [x] No horizontal scrolling observed on tested mobile layout. PASS — reviewed mobile recording.

## Final launch gate

Start paid/organic promotion when:
- tracker #6 passes for Plus,
- free-plan #6 paywall passes,
- password reset passes,
- family end-to-end passes,
- export passes,
- disposable-account deletion passes,
- cancellation sync passes,
- custom-domain reminder link passes,
- mobile smoke test passes.


## DoneDate brand / production status
- [x] Customer-facing code uses DoneDate.
- [x] Canonical production hostname is donedate.technicade.tech.
- [x] Vercel production domain/environment cutover completed by user.
- [x] Supabase auth Site URL / redirect allowlist updated by user.
- [x] Google OAuth origin / branding updated by user.
- [x] Stripe customer-facing branding updated by user.
- [x] Resend sender display name updated to DoneDate.
- [x] support@technicade.tech receives support mail.
- [x] Gmail Send-As configured through Resend SMTP for DoneDate Support.
- [ ] Keep legacy lasttime.technicade.tech available temporarily, then redirect it to donedate.technicade.tech.
