export const metadata = {
  title: "Privacy Policy — DoneDate",
  description: "Privacy Policy for DoneDate.",
};

export default function PrivacyPage() {
  return (
    <main className="legalPage shell">
      <a className="brand legalBrand" href="/">↺ <span>DoneDate</span></a>
      <article className="legalCard">
        <p className="eyebrow">Legal</p>
        <h1>Privacy Policy</h1>
        <p className="legalUpdated">Effective October 2, 2026</p>

        <p>
          DoneDate is a simple reminder and life-maintenance tracking service operated under the
          Technicade brand. This policy explains what information DoneDate processes, why it is
          used, and the choices available to you.
        </p>

        <h2>Information we collect</h2>
        <p>
          We process account information such as your email address and authentication identifiers;
          tracker information you choose to enter, including titles, categories, dates, recurrence
          schedules, completion history, and family-sharing information; reminder preferences; and
          subscription status and billing identifiers. Payment card details are handled by Stripe
          and are not stored by DoneDate.
        </p>

        <h2>How we use information</h2>
        <p>
          We use this information to provide and secure your account, store and display your
          trackers, calculate due dates, send requested reminder emails, enable family sharing,
          manage subscriptions, troubleshoot the service, and prevent abuse.
        </p>

        <h2>Service providers</h2>
        <p>
          DoneDate relies on service providers to operate the product. These currently include
          Supabase for authentication and database hosting, Vercel for application hosting, Stripe
          for subscriptions and payments, Resend for reminder email delivery, and Google when you
          choose Google sign-in. Those providers process information under their own terms and
          privacy practices.
        </p>

        <h2>Family sharing</h2>
        <p>
          If you join a DoneDate family, trackers intentionally shared with that family are visible
          to family members. Shared completion history may identify which family member marked an
          item complete. Do not place sensitive information in a shared tracker unless you intend
          for other family members to see it.
        </p>

        <h2>Retention and deletion</h2>
        <p>
          Your account data is generally retained while your account remains active. You can export
          your data or permanently delete your account from Settings. Account deletion removes your
          DoneDate account and associated application data from the active service. Payment
          processors and infrastructure providers may retain records when required for security,
          fraud prevention, accounting, or legal compliance.
        </p>

        <h2>Email reminders</h2>
        <p>
          Reminder emails are service messages requested through your tracker schedules. You can
          turn email reminders off in Settings. DoneDate does not sell your personal information
          to advertisers.
        </p>

        <h2>Security</h2>
        <p>
          We use access controls, row-level database security, encrypted connections, and
          server-only credentials to protect the service. No internet service can guarantee
          absolute security, so avoid storing information that is unnecessary for the purpose of a
          tracker.
        </p>

        <h2>Your choices</h2>
        <p>
          You can edit or delete trackers, disable reminder emails, export your account data, or
          delete your account from the app. If you use Google sign-in, you may also manage the
          connection through your Google account.
        </p>

        <h2>Children</h2>
        <p>
          DoneDate is not directed to children under 13. Family organizers should not create
          accounts for children under 13 without determining that doing so is lawful and
          appropriate for their situation.
        </p>

        <h2>Changes</h2>
        <p>
          This policy may be updated as DoneDate changes. Material updates will be reflected by a
          new effective date on this page.
        </p>

        <h2>Contact</h2>
        <p>
          Privacy or support questions can be sent to <a href="mailto:support@technicade.tech">support@technicade.tech</a>.
        </p>
      </article>
      <footer className="legalFooter"><a href="/">Home</a><a href="/terms">Terms</a></footer>
    </main>
  );
}
