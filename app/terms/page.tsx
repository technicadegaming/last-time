export const metadata = {
  title: "Terms of Service — AgainDue",
  description: "Terms of Service for AgainDue.",
};

export default function TermsPage() {
  return (
    <main className="legalPage shell">
      <a className="brand legalBrand" href="/">↺ <span>AgainDue</span></a>
      <article className="legalCard">
        <p className="eyebrow">Legal</p>
        <h1>Terms of Service</h1>
        <p className="legalUpdated">Effective October 2, 2026</p>

        <p>
          These Terms govern your use of AgainDue, a reminder and life-maintenance tracking
          service operated under the Technicade brand. By creating an account or using AgainDue,
          you agree to these Terms.
        </p>

        <h2>The service</h2>
        <p>
          AgainDue lets you record when you completed recurring tasks, calculate future due dates,
          receive reminders, keep completion history, and optionally share selected trackers with a
          family group. AgainDue is an organizational tool, not a professional maintenance,
          medical, safety, financial, or legal service.
        </p>

        <h2>Your account</h2>
        <p>
          You are responsible for maintaining access to your account and for information entered
          through it. Do not use another person&apos;s account without permission. You agree not to
          interfere with the service, bypass access controls, probe for vulnerabilities, or use Last
          Time for unlawful activity.
        </p>

        <h2>Reminders and due dates</h2>
        <p>
          Reminder dates are calculated from information you provide. Email delivery and scheduled
          jobs can occasionally be delayed or fail. You remain responsible for important
          maintenance, medication, safety inspections, deadlines, and other real-world obligations.
          Do not rely on AgainDue as your sole safety-critical reminder.
        </p>

        <h2>Family sharing</h2>
        <p>
          Family organizers may invite other users into a shared household. Information marked as
          shared can be viewed and updated by family members according to the product&apos;s access
          controls. Only share information you are comfortable making available to those members.
        </p>

        <h2>Free and Plus plans</h2>
        <p>
          The Free plan currently supports up to five active trackers. AgainDue Plus currently
          provides unlimited active trackers and eligible paid features. Current prices are shown
          before checkout. Taxes may apply where required.
        </p>

        <h2>Subscriptions</h2>
        <p>
          Paid subscriptions renew automatically for the selected billing period until canceled.
          You can manage or cancel your subscription through the billing portal in Settings.
          Cancellation stops future renewal but does not generally retroactively refund time already
          purchased, except where required by law or expressly stated otherwise.
        </p>

        <h2>Your content</h2>
        <p>
          You retain ownership of information you enter into AgainDue. You grant AgainDue the
          limited permission necessary to host, process, transmit, back up, and display that
          information solely to operate and improve the service.
        </p>

        <h2>Availability and changes</h2>
        <p>
          We may change, improve, suspend, or discontinue features as the product evolves. We aim to
          keep the service available, but uninterrupted or error-free operation is not guaranteed.
        </p>

        <h2>Disclaimer and limitation</h2>
        <p>
          To the maximum extent permitted by law, AgainDue is provided &quot;as is&quot; without
          warranties of uninterrupted availability or fitness for a particular purpose. To the
          maximum extent permitted by law, the service operator is not liable for indirect,
          incidental, special, consequential, or punitive damages arising from use of, or inability
          to use, the service.
        </p>

        <h2>Termination and deletion</h2>
        <p>
          You may stop using AgainDue at any time and may permanently delete your account from
          Settings. We may restrict or terminate access for abuse, fraud, security threats, or
          material violations of these Terms.
        </p>

        <h2>Changes to these Terms</h2>
        <p>
          These Terms may be updated as the service changes. Material updates will be reflected by
          a new effective date on this page. Continued use after an update constitutes acceptance of
          the revised Terms to the extent permitted by law.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms can be sent to <a href="mailto:support@technicade.tech">support@technicade.tech</a>.
        </p>
      </article>
      <footer className="legalFooter"><a href="/">Home</a><a href="/privacy">Privacy</a></footer>
    </main>
  );
}
