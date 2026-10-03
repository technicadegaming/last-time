const examples = [
  ["🚗", "Oil change", "4 months ago"],
  ["🏠", "Furnace filter", "72 days ago"],
  ["✂️", "Haircut", "12 days ago"],
  ["🐕", "Dog medicine", "29 days ago"],
];

const benefits = [
  ["✓", "Due-date reminders", "Get an email when a scheduled item becomes due or overdue."],
  ["👨‍👩‍👧‍👦", "Family sharing", "Share selected trackers with the people you live with."],
  ["🎙", "Fast capture", "Type it, use a quick-add preset, or speak it on supported browsers."],
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="/">↺ <span>DoneDate</span></a>
        <div className="navActions">
          <a className="navText" href="#how">How it works</a>
          <a className="navText" href="#pricing">Pricing</a>
          <a className="button ghost" href="/app">Open app</a>
        </div>
      </nav>

      <section className="hero shell">
        <div className="heroCopy">
          <p className="eyebrow">Shared maintenance memory.</p>
          <h1>Keep your household maintenance <em>out of your head.</em></h1>
          <p className="lead">
            Oil changes. Furnace filters. Haircuts. Dog meds. Deep cleans.
            Add it once, tap when you do it, and DoneDate keeps the shared maintenance memory for your home, car, pets, and family.
          </p>
          <div className="actions">
            <a className="button primary" href="/app">Start remembering — free</a>
            <span className="fine">No credit card required · 5 active trackers free</span>
          </div>
        </div>

        <div className="phoneCard">
          <p className="muted">WHEN DID I LAST...</p>
          <h2>Change the furnace filter?</h2>
          <div className="answer"><strong>72</strong><span>days ago</span></div>
          <p>July 21, 2026</p>
          <div className="due">Next suggested in 18 days</div>
          <button className="done">✓ Did it again</button>
        </div>
      </section>

      <section className="section shell" id="how">
        <div className="sectionHead">
          <p className="eyebrow">Remember anything</p>
          <h2>One tiny place for all the stuff you repeat.</h2>
        </div>
        <div className="grid">
          {examples.map(([icon, title, time]) => (
            <article className="item" key={title}>
              <span className="icon">{icon}</span>
              <div><strong>{title}</strong><p>{time}</p></div>
            </article>
          ))}
        </div>
      </section>

      <section className="benefitSection shell">
        <div className="benefitGrid">
          {benefits.map(([icon, title, copy]) => (
            <article className="benefitCard" key={title}>
              <span>{icon}</span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landingPricing shell" id="pricing">
        <p className="eyebrow">Simple pricing</p>
        <h2>Try it free. Upgrade only when you need more.</h2>
        <div className="landingPriceGrid">
          <article>
            <strong>Free</strong>
            <div className="landingPrice">$0</div>
            <p>Up to 5 active trackers. Email reminders. No card required.</p>
            <a className="button ghost full" href="/app">Start free</a>
          </article>
          <article className="highlight">
            <div className="foundingTag">FOUNDING PRICE</div>
            <strong>Plus</strong>
            <div className="landingPrice">$14.99 <span>/ year</span></div>
            <p>Unlimited active trackers, family sharing, and everything in Free. Also $1.99 month-to-month.</p>
            <a className="button primary full" href="/app/upgrade">Get Plus</a>
          </article>
        </div>
        <p className="pricingFine">Subscriptions renew automatically until canceled. Manage billing anytime from Settings.</p>
      </section>

      <section className="simple shell">
        <h2>That’s basically it.</h2>
        <p>No giant planner. No endless setup. No complicated maintenance spreadsheet.</p>
        <a className="button primary" href="/app">Try DoneDate</a>
      </section>

      <footer className="shell footer">
        <span>© 2026 DoneDate · A Technicade product.</span>
        <span className="footerLinks"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="mailto:support@technicade.tech">Support</a></span>
      </footer>
    </main>
  );
}
