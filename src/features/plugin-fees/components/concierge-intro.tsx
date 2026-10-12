/**
 * What the monthly fee buys: the product copy for The White Glove Concierge, the
 * member-facing name of plug-in fees (PF58). Static, shown at the top of the agent's
 * statement page. Screens and states: `docs/plugin-fees/UI.md` §2.5.
 */

const SERVICES: ReadonlyArray<{ icon: string; title: string; detail: string }> = [
  { icon: '🎁', title: 'Welcome packages', detail: 'sent to every new person who joins you' },
  { icon: '🌟', title: 'Daily recognition', detail: 'keeping your team celebrated and motivated' },
  { icon: '🏢', title: 'Home office liaison', detail: 'a hierarchy assistant who resolves issues for you' },
  { icon: '📦', title: 'Materials & ordering', detail: 'handled for you, start to finish' },
  { icon: '🎟️', title: 'Events & retreats', detail: 'coordination and support for everything coming up' },
  {
    icon: '📋',
    title: 'Client reviews & support (coming soon)',
    detail: 'annual reviews and case help for your whole team',
  },
];

export function ConciergeIntro() {
  return (
    <section className="wb-pf-callout wb-pf-stack" aria-labelledby="wb-pf-concierge-title">
      <div>
        <h2 id="wb-pf-concierge-title" className="wb-pf-subheading">
          The White Glove Concierge
        </h2>
        <p className="wb-pf-concierge-tagline">
          Your personal support team — so you can focus on leading and building.
        </p>
      </div>
      <p>
        As a Marketing Director, you&apos;ve earned white-glove service. Your Concierge handles the
        details, so you don&apos;t have to:
      </p>
      <ul className="wb-pf-concierge-list">
        {SERVICES.map((service) => (
          <li key={service.title}>
            <span aria-hidden="true">{service.icon}</span>
            <span>
              <strong>{service.title}</strong> — {service.detail}
            </span>
          </li>
        ))}
      </ul>
      <p>This is what leadership should feel like. Welcome to The White Glove Concierge.</p>
    </section>
  );
}
