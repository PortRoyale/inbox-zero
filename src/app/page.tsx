import { DaysUntil } from "@/components/DeadlineCountdown";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { requirements } from "@/lib/cra-requirements";
import { craDates, site } from "@/lib/site";

const audiences = [
  { title: "Connected devices", body: "Smart home, wearables, industrial controllers, point-of-sale and any hardware that talks to a network." },
  { title: "Embedded & firmware", body: "Teams shipping firmware on their own or partner hardware, from sensors to gateways." },
  { title: "Software products", body: "Desktop, mobile and installable software sold or distributed in the EU, including the cloud backends they depend on." },
];

const steps = [
  { n: "01", title: "Assess", body: "A plain-language readiness check maps your product to the CRA's essential requirements and ranks your gaps." },
  { n: "02", title: "Plan & document", body: "Guided templates turn answers into the technical documentation and system security plan the CRA requires." },
  { n: "03", title: "Gate every release", body: "Answer a few questions per release and get the exact security testing it needs, with a stored evidence record." },
  { n: "04", title: "Report & maintain", body: "SBOM monitoring, disclosure policy and a 24/72-hour reporting playbook keep you compliant after launch." },
];

const modules = [
  { title: "CRA readiness check", status: "Live", href: "/assessment/", body: `${requirements.length} requirements filtered to your product type, scored, with a prioritised gap list you can print or share.` },
  { title: "Release security gate", status: "Live", href: "/release-gate/", body: "Decide which testing each release needs based on what changed, not on the version label." },
  { title: "Security plan builder", status: "Soon", body: "Fill-in-the-blanks technical documentation and system security plan, mapped to every CRA clause." },
  { title: "SBOM & vulnerability watch", status: "Soon", body: "Upload an SBOM per release and get alerted when a component picks up a new known vulnerability." },
  { title: "Disclosure & advisories", status: "Soon", body: "Generate a disclosure policy and security.txt, and publish advisories from a template." },
  { title: "Incident reporting playbook", status: "Soon", body: "Step-by-step 24-hour early warning and 72-hour notification workflow with prepared templates." },
];

const tiers = [
  {
    name: "Free",
    price: "€0",
    cadence: "",
    blurb: "See where you stand.",
    features: ["CRA readiness check", "Release security gate", "Printable gap report"],
    cta: { label: "Start now", href: "/assessment/" },
  },
  {
    name: "Starter",
    price: "€149",
    cadence: "/ month",
    blurb: "One product, fully documented.",
    features: ["Everything in Free", "Security plan builder", "Release evidence history", "SBOM & vulnerability watch", "Disclosure policy & security.txt"],
    cta: { label: "Join early access", href: `mailto:${site.contactEmail}?subject=Early%20access%3A%20Starter` },
    featured: true,
  },
  {
    name: "Team",
    price: "€499",
    cadence: "/ month",
    blurb: "Up to five products and your whole team.",
    features: ["Everything in Starter", "Roles & sign-off workflow", "Incident reporting playbook", "GitHub & Jira integration", "Auditor-ready evidence export"],
    cta: { label: "Join early access", href: `mailto:${site.contactEmail}?subject=Early%20access%3A%20Team` },
  },
  {
    name: "Guided",
    price: "From €6k",
    cadence: "fixed fee",
    blurb: "A security expert gets you there.",
    features: ["Team plan included for 12 months", "Threat model workshop", "Documentation review", "Conformity route & CE plan"],
    cta: { label: "Talk to us", href: `mailto:${site.contactEmail}?subject=Guided%20CRA%20readiness` },
  },
];

const faqs = [
  {
    q: "Does the Cyber Resilience Act apply to my company?",
    a: "If you place a product with digital elements on the EU market (hardware or software that connects to a device or a network), most likely yes, wherever your company is based. Medical devices, vehicles, aviation and marine equipment are covered by their own rules instead. Free and open-source software that isn't commercialised is largely out of scope.",
  },
  {
    q: "We only run a SaaS product. Is that in scope?",
    a: "Pure SaaS is generally covered by NIS2 rather than the CRA. But if your cloud service is needed for a product to perform its functions (a companion backend for a device or app), it counts as remote data processing and falls under the CRA.",
  },
  {
    q: "What are the deadlines?",
    a: "The obligation to report actively exploited vulnerabilities and severe incidents has applied since 11 September 2026. Every other obligation, including the essential security requirements, documentation and CE marking, applies from 11 December 2027 to products placed on the market from that date.",
  },
  {
    q: "What happens if we're not compliant?",
    a: "Market surveillance authorities can require corrective action, withdraw products from the market, and fine up to €15 million or 2.5% of worldwide annual turnover for breaches of the essential requirements, whichever is higher.",
  },
  {
    q: "We're a small company. Are there exemptions?",
    a: "Not from the requirements themselves, but the CRA does make allowances: micro and small enterprises can't be fined for missing the 24-hour early-warning deadline, and the European Commission is producing a simplified technical documentation form for small companies. Our tooling is built around that simplified path.",
  },
  {
    q: "Is this legal advice?",
    a: "No. We give you the tools and expert guidance to build and evidence a compliant security programme. For legal interpretation of your specific situation, consult qualified counsel.",
  },
];

export default function Home() {
  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-brand-tint/60 to-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 md:py-24 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-brand/20 bg-white px-3 py-1 text-xs font-medium text-brand">
              EU Cyber Resilience Act · reporting obligations now in force
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance text-ink sm:text-5xl">
              Make your product CRA-ready without hiring a security team
            </h1>
            <p className="mt-5 max-w-xl text-lg text-pretty text-ink-soft">{site.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/assessment/">Start the free readiness check</ButtonLink>
              <ButtonLink href="/release-gate/" variant="secondary">
                Try the release gate
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-muted">About 10 minutes. No sign-up. Your answers stay in your browser.</p>
          </div>

          <div className="rounded-xl border border-line bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-ink-soft">All CRA obligations apply in</p>
            <p className="mt-1 text-5xl font-semibold tracking-tight text-ink tabular-nums">
              <DaysUntil date={craDates.fullApplication} /> <span className="text-2xl font-medium text-ink-soft">days</span>
            </p>
            <p className="mt-1 text-sm text-muted">11 December 2027</p>
            <dl className="mt-6 space-y-4 border-t border-line pt-5 text-sm">
              <div className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-bad" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-ink">Vulnerability & incident reporting</dt>
                  <dd className="text-ink-soft">In force since 11 September 2026: 24-hour early warning, 72-hour notification.</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-warn" aria-hidden="true" />
                <div>
                  <dt className="font-medium text-ink">Fines up to €15M or 2.5% of turnover</dt>
                  <dd className="text-ink-soft">Plus market withdrawal of non-compliant products.</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="Who it's for"
          title="Built for small teams that make real products"
          intro="Enterprise compliance platforms assume you have a security department. We assume you have a few engineers and a deadline."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {audiences.map((a) => (
            <div key={a.title} className="rounded-xl border border-line p-6">
              <h3 className="font-semibold text-ink">{a.title}</h3>
              <p className="mt-2 text-ink-soft">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading eyebrow="How it works" title="From “where do we start?” to evidence on file" />
          <ol className="mt-10 grid gap-8 md:grid-cols-4">
            {steps.map((s) => (
              <li key={s.n}>
                <p className="font-mono text-sm text-brand">{s.n}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <SectionHeading
          eyebrow="The platform"
          title="Everything the CRA asks for, in one place"
          intro="Start with the free tools today. The rest of the platform is rolling out to early-access customers."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((m) => {
            const card = (
              <>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-ink">{m.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      m.status === "Live" ? "bg-good-tint text-good" : "bg-paper text-muted"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
                <p className="mt-2 text-ink-soft">{m.body}</p>
              </>
            );
            return m.href ? (
              <a key={m.title} href={m.href} className="rounded-xl border border-line p-6 transition hover:border-brand hover:shadow-sm">
                {card}
              </a>
            ) : (
              <div key={m.title} className="rounded-xl border border-dashed border-line p-6">
                {card}
              </div>
            );
          })}
        </div>
      </section>

      <section id="pricing" className="scroll-mt-16 border-y border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Priced for a five-person team, not a Fortune 500"
            intro="Early-access pricing, locked in for founding customers."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`flex flex-col rounded-xl border bg-white p-6 ${t.featured ? "border-brand ring-1 ring-brand" : "border-line"}`}
              >
                <h3 className="font-semibold text-ink">{t.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{t.blurb}</p>
                <p className="mt-5 text-3xl font-semibold tracking-tight text-ink">
                  {t.price} <span className="text-sm font-normal text-muted">{t.cadence}</span>
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-ink-soft">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-brand" aria-hidden="true">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <a
                  href={t.cta.href}
                  className={`mt-6 rounded-md px-4 py-2.5 text-center text-sm font-semibold ${
                    t.featured ? "bg-brand text-white hover:bg-brand-strong" : "border border-line text-ink hover:border-ink-soft"
                  }`}
                >
                  {t.cta.label}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-4 py-20 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Common questions" />
        <div className="mt-8 divide-y divide-line border-y border-line">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink">
                {f.q}
                <span className="text-muted transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="bg-ink">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white">Find out where you stand in 10 minutes</h2>
            <p className="mt-2 text-white/70">Free, private, and you'll leave with a prioritised to-do list.</p>
          </div>
          <a href="/assessment/" className="rounded-md bg-white px-5 py-3 text-sm font-semibold text-ink hover:bg-brand-tint">
            Start the readiness check
          </a>
        </div>
      </section>
    </>
  );
}
