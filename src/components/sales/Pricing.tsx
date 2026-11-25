import { PageHero } from "@/components/PageHero";
import { ContactLine } from "@/components/primitives";
import { CostCalculator } from "@/components/sales/CostCalculator";
import { LeadForm } from "@/components/sales/LeadForm";
import { SheetTabs } from "@/components/SheetTabs";

const variants = [
  { code: "-00", name: "Free", price: "€0" },
  { code: "-01", name: "Starter", price: "€149/mo" },
  { code: "-02", name: "Team", price: "€499/mo" },
  { code: "-03", name: "Guided", price: "from €6k" },
];

const features: [string, (boolean | string)[]][] = [
  ["Readiness check, release gate, briefs", [true, true, true, true]],
  ["Security plan builder (unlimited revisions, export)", [true, true, true, true]],
  ["Saved plans and release records in the cloud", [false, true, true, true]],
  ["SBOM watch", [false, true, true, true]],
  ["Disclosure kit", [false, true, true, true]],
  ["Products covered", ["None", "1", "up to 5", "up to 5"]],
  ["Reporting playbook", [false, false, true, true]],
  ["Sign-off roles, GitHub and Jira", [false, false, true, true]],
  ["Threat-model workshop with an expert", [false, false, false, true]],
  ["Documentation review and CE plan", [false, false, false, true]],
];

const comparison = [
  { option: "Free templates", cost: "€0", gets: "A checklist or document skeleton", missing: "No guidance on your product, no gap tracking, no evidence trail", ours: false },
  { option: "Consultant-led", cost: "€20k–60k+", gets: "Expert judgement and a finished document", missing: "Snapshot in time; costly to keep current every release", ours: false },
  { option: "Enterprise platforms", cost: "Custom quote", gets: "Broad GRC coverage", missing: "Built for security teams, not five-person product companies", ours: false },
  { option: "Readyline", cost: "€0–499/mo + optional €6k", gets: "Plan builder, release records, monitoring, expert review", missing: "A notified-body certificate, where your class requires one", ours: true },
];

export const notes = [
  {
    q: "Does the Cyber Resilience Act apply to my company?",
    a: "If you place a product with digital elements on the EU market, meaning hardware or software that connects to a device or a network, it most likely does, wherever your company is based.",
  },
  {
    q: "We only run a SaaS product. Is that in scope?",
    a: "Pure SaaS falls under NIS2 rather than the CRA. A cloud service your product needs in order to work counts as remote data processing and is in scope.",
  },
  {
    q: "What are the deadlines?",
    a: "Reporting of actively exploited vulnerabilities and severe incidents has applied since 11 September 2026. Everything else, including the essential requirements, technical documentation and CE marking, applies from 11 December 2027.",
  },
  {
    q: "What happens if we're not compliant?",
    a: "Authorities can order corrective action, withdraw products from the market, and fine up to €15 million or 2.5% of worldwide annual turnover, whichever is higher.",
  },
  {
    q: "We're a small company. Are there exemptions?",
    a: "Not from the requirements. Micro and small enterprises can't be fined for missing the 24-hour early-warning deadline, and the Commission is preparing a simplified technical documentation form for them. Our tooling follows that simplified path.",
  },
  {
    q: "Is this legal advice?",
    a: "No. It is tooling and expert guidance for building and evidencing a security programme. Ask qualified counsel how the law applies to your situation.",
  },
];

export function Pricing() {
  return (
    <div className="wrap stack">
      <PageHero
        id="pricing-title"
        motif="gauge"
        seed={41}
        label="Pricing"
        cells={["Early access"]}
        title="Priced for a five-person team"
        lead="Free tools to start. A subscription when you want plans saved, monitored and signed off. An expert when you want it done with you. Founding customers lock in these prices."
        aside={
          <div className="grant-card">
            <p className="label">EU funding open</p>
            <p>
              <strong>EU SMEs can get 50% of CRA costs co-funded, up to €30,000</strong> (SECURE call, deadline 29 January 2027).
            </p>
          </div>
        }
      />

      <SheetTabs
        label="Pricing sections"
        items={[
          {
            id: "plans",
            label: "Plans",
            content: (
              <>
                <h2>Plans</h2>
                <div className="table-scroll">
                  <table className="drawing variants">
                    <thead>
                      <tr>
                        <th scope="col">Feature</th>
                        {variants.map((v) => (
                          <th key={v.code} scope="col">
                            <span className="variant-code">{v.code}</span>
                            <span className="variant-name">{v.name}</span>
                            <span className="variant-price">{v.price}</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {features.map(([name, has]) => (
                        <tr key={name}>
                          <th scope="row">{name}</th>
                          {has.map((h, i) => (
                            <td key={i} className="code cell-mark">
                              {typeof h === "string" ? h : h ? <span aria-label="Included">●</span> : <span aria-label="Not included" className="muted">○</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ),
          },
          {
            id: "cost",
            label: "Cost calculator",
            content: (
              <>
                <h2>What CRA compliance costs you</h2>
                <p className="muted">Compare a consultant-led project with our guided package and platform. Change any assumption.</p>
                <CostCalculator />
              </>
            ),
          },
          {
            id: "compare",
            label: "Compare options",
            content: (
              <>
                <h2>How this compares</h2>
                <div className="table-scroll">
                  <table className="drawing compare">
                    <thead>
                      <tr>
                        <th scope="col">Option</th>
                        <th scope="col">Typical cost</th>
                        <th scope="col">You get</th>
                        <th scope="col">What's missing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.map((c) => (
                        <tr key={c.option} className={c.ours ? "is-ours" : undefined}>
                          <th scope="row">{c.option}</th>
                          <td className="code">{c.cost}</td>
                          <td>{c.gets}</td>
                          <td>{c.missing}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ),
          },
          {
            id: "faq",
            label: "Questions",
            content: (
              <>
                <h2>General notes</h2>
                <ol className="notes">
                  {notes.map((n, i) => (
                    <li key={n.q}>
                      <details>
                        <summary>
                          <span className="code">{i + 1}.</span> {n.q}
                        </summary>
                        <p>{n.a}</p>
                      </details>
                    </li>
                  ))}
                </ol>
              </>
            ),
          },
          {
            id: "join",
            label: "Join early access",
            content: (
              <div id="contact" className="stack-sm">
                <h2>Join early access</h2>
                <p className="muted">Founding customers lock in these prices. A security expert replies within one working day.</p>
                <LeadForm />
                <ContactLine />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
