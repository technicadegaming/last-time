const examples = [
  ["🚗", "Oil change", "4 months ago"],
  ["🏠", "Furnace filter", "72 days ago"],
  ["✂️", "Haircut", "12 days ago"],
  ["🐕", "Dog medicine", "29 days ago"],
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell">
        <a className="brand" href="#">↺ <span>Last Time</span></a>
        <div className="navActions"><a className="navText" href="#pricing">Pricing</a><a className="button ghost" href="/app">Open app</a></div>
      </nav>

      <section className="hero shell">
        <div className="heroCopy">
          <p className="eyebrow">Life has maintenance.</p>
          <h1>Never wonder <em>“When did I last…?”</em> again.</h1>
          <p className="lead">Oil changes. Furnace filters. Haircuts. Dog meds. Deep cleans. Add it once, tap when you do it, and Last Time remembers the rest.</p>
          <div className="actions">
            <a className="button primary" href="/app">Start remembering — free</a>
            <span className="fine">No credit card required</span>
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

      <section className="section shell">
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

      <section className="landingPricing shell" id="pricing">
        <p className="eyebrow">Simple pricing</p>
        <h2>Try it free. Upgrade only when you need more.</h2>
        <div className="landingPriceGrid">
          <article><strong>Free</strong><div className="landingPrice">$0</div><p>Up to 5 active trackers. No card required.</p><a className="button ghost full" href="/app">Start free</a></article>
          <article className="highlight"><strong>Plus</strong><div className="landingPrice">$14.99 <span>/ year</span></div><p>Unlimited active trackers. Also $1.99 month-to-month.</p><a className="button primary full" href="/app/upgrade">Get Plus</a></article>
        </div>
      </section>

      <section className="simple shell">
        <h2>That’s basically it.</h2>
        <p>No giant planner. No endless setup. No complicated maintenance spreadsheet.</p>
        <a className="button primary" href="/app">Try Last Time</a>
      </section>

      <footer className="shell footer">© 2026 Last Time · Built to remember the boring stuff.</footer>
    </main>
  );
}
