import { Balloon, ContactLine, Fcf, SheetHead } from "@/components/primitives";
import { Timeline } from "@/components/Timeline";
import { requirements } from "@/lib/cra-requirements";
import { paths } from "@/lib/paths";
import { regulation, revisions, site } from "@/lib/site";

const appliesTo = [
  {
    title: "Connected devices",
    body: "Smart home, wearables, industrial and building controllers, point-of-sale, anything with a radio or a port.",
    icon: "device",
  },
  {
    title: "Firmware",
    body: "Code you ship on your own or a partner's hardware, from sensors to gateways.",
    icon: "chip",
  },
  {
    title: "Software",
    body: "Desktop, mobile and installable software sold in the EU, plus the cloud backends it needs to work.",
    icon: "window",
  },
] as const;

const outOfScope = [
  "Medical and in-vitro diagnostic devices",
  "Vehicles, aviation and marine equipment",
  "Pure SaaS with no product attached (NIS2 applies instead)",
  "Non-commercial open-source software",
];

const workflow = [
  { step: "Assess", body: "Map your product to the CRA's essential requirements and rank the gaps." },
  { step: "Document", body: "Turn your answers into the technical documentation and security plan." },
  { step: "Gate", body: "Decide each release's security testing from what changed, and keep the record." },
  { step: "Report", body: "Watch your SBOM for new vulnerabilities and meet the 24/72-hour reporting clock." },
];

const modules = [
  { name: "Readiness check", does: `${requirements.length} requirements, filtered to your product, scored, with a ranked redline list.`, ref: "Annex I", live: true, href: paths.assessment },
  { name: "Release gate", does: "Security testing per release, decided by what changed rather than the version label.", ref: "Annex I Pt II(3)", live: true, href: paths.releaseGate },
  { name: "Security plan builder", does: "Fill-in technical documentation mapped to every clause.", ref: "Annex VII" },
  { name: "SBOM watch", does: "Upload an SBOM per release; get alerted when a component gains a known vulnerability.", ref: "Annex I Pt II(1)" },
  { name: "Disclosure kit", does: "Disclosure policy, security.txt and advisory templates.", ref: "Annex I Pt II(5)" },
  { name: "Reporting playbook", does: "24-hour early warning and 72-hour notification, step by step.", ref: "Art. 14" },
];

const variants = [
  { code: "-00", name: "Free", price: "€0" },
  { code: "-01", name: "Starter", price: "€149/mo" },
  { code: "-02", name: "Team", price: "€499/mo" },
  { code: "-03", name: "Guided", price: "from €6k" },
];

const features: [string, (boolean | string)[]][] = [
  ["Readiness check and release gate", [true, true, true, true]],
  ["Security plan builder", [false, true, true, true]],
  ["Release record history", [false, true, true, true]],
  ["SBOM watch", [false, true, true, true]],
  ["Disclosure kit", [false, true, true, true]],
  ["Products covered", ["—", "1", "up to 5", "up to 5"]],
  ["Reporting playbook", [false, false, true, true]],
  ["Sign-off roles, GitHub and Jira", [false, false, true, true]],
  ["Threat-model workshop with an expert", [false, false, false, true]],
  ["Documentation review and CE plan", [false, false, false, true]],
];

const notes = [
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

export function Home() {
  return (
    <div className="wrap stack">
      <section className="sheet hero" aria-labelledby="hero-title">
        <div className="hero-grid">
          <div className="hero-copy">
            <Fcf keyCell="Sheet 1/5" cells={[regulation, "Reporting in force"]} />
            <h1 id="hero-title">
              Make your product <span className="mark mark-done">CRA-ready</span> without hiring a security team
            </h1>
            <p className="lead">{site.description}</p>
            <div className="row">
              <a className="btn btn-primary" href={paths.assessment}>
                Start the readiness check
              </a>
              <a className="btn" href={paths.releaseGate}>
                Try the release gate
              </a>
            </div>
            <p className="label">About 10 minutes · No sign-up · Answers stay in your browser</p>
          </div>
          <dl className="tblock hero-tblock">
            <div>
              <dt>Applies to</dt>
              <dd>Products with digital elements</dd>
            </div>
            <div>
              <dt>Instrument</dt>
              <dd>{regulation}</dd>
            </div>
            <div>
              <dt>Max. penalty</dt>
              <dd>€15M or 2.5% of turnover</dd>
            </div>
            <div>
              <dt>Report exploited vulns</dt>
              <dd>24 h warning · 72 h notice</dd>
            </div>
            <div>
              <dt>Support period</dt>
              <dd>Normally ≥ 5 years</dd>
            </div>
          </dl>
        </div>
        <Timeline />
      </section>

      <section className="sheet" aria-labelledby="applies-title">
        <SheetHead
          id="applies-title"
          sheet="Sheet 2/5"
          reference="Scope · Art. 2"
          title="Built for small teams that make real products"
          intro="Enterprise compliance platforms assume you have a security department. We assume you have a few engineers and a deadline."
        />
        <div className="applies">
          {appliesTo.map((a, i) => (
            <div key={a.title} className="applies-item">
              <div className="row">
                <Balloon>{i + 1}</Balloon>
                <Glyph name={a.icon} />
              </div>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>
          ))}
          <div className="applies-item applies-out">
            <p className="label">Excluded</p>
            <ul>
              {outOfScope.map((o) => (
                <li key={o} className="mark-na">
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="sheet" aria-labelledby="process-title">
        <SheetHead
          id="process-title"
          sheet="Sheet 3/5"
          reference="Obligations · Art. 13–14"
          title="From “where do we start?” to evidence on file"
        />
        <ol className="flow">
          {workflow.map((p, i) => (
            <li key={p.step}>
              <span className="flow-step">
                <Balloon>{i + 1}</Balloon>
                <h3>{p.step}</h3>
              </span>
              <p>{p.body}</p>
            </li>
          ))}
        </ol>
        <p className="flow-loop label">↺ Steps 3 and 4 repeat with every release for the whole support period</p>
      </section>

      <section className="sheet" aria-labelledby="bom-title">
        <SheetHead
          id="bom-title"
          sheet="Sheet 4/5"
          reference="Annex I · Annex VII"
          title="Parts list"
          intro="Two tools are live and free today. The rest ship to early-access customers first."
        />
        <div className="table-scroll">
          <table className="drawing bom">
            <thead>
              <tr>
                <th scope="col">Item</th>
                <th scope="col">Module</th>
                <th scope="col">Function</th>
                <th scope="col">CRA ref.</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m, i) => (
                <tr key={m.name}>
                  <td>
                    <Balloon>{i + 1}</Balloon>
                  </td>
                  <th scope="row">{m.href ? <a href={m.href}>{m.name}</a> : m.name}</th>
                  <td>{m.does}</td>
                  <td className="code">{m.ref}</td>
                  <td>{m.live ? <span className="mark mark-done code">LIVE</span> : <span className="code muted">IN WORK</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sheet" id="pricing" aria-labelledby="pricing-title">
        <SheetHead
          id="pricing-title"
          sheet="Sheet 5/5"
          reference="Variants"
          title="Priced for a five-person team"
          intro="Early-access prices, locked in for founding customers."
        />
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
                      {typeof h === "string" ? h : h ? <span aria-label="Included">●</span> : <span aria-label="Not included" className="muted">—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div id="contact" className="contact">
          <div>
            <h3>Join early access</h3>
            <p className="muted">Tell us what you make and when you ship to the EU. A security expert replies personally.</p>
          </div>
          <ContactLine />
        </div>
      </section>

      <section className="sheet" id="notes" aria-labelledby="notes-title">
        <SheetHead id="notes-title" sheet="Notes" reference="Unless otherwise specified" title="General notes" />
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
      </section>

      <section className="revtable" aria-label="Revision history">
        <table className="drawing">
          <thead>
            <tr>
              <th scope="col">Rev</th>
              <th scope="col">Date</th>
              <th scope="col">Description</th>
            </tr>
          </thead>
          <tbody>
            {revisions.map((r) => (
              <tr key={r.rev}>
                <td className="code">{r.rev}</td>
                <td className="code">{r.date}</td>
                <td>{r.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Glyph({ name }: { name: "device" | "chip" | "window" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "round" as const };
  return (
    <svg className="glyph" viewBox="0 0 48 32" aria-hidden="true">
      {name === "device" && (
        <>
          <rect x="6" y="10" width="36" height="18" {...common} />
          <line x1="34" y1="10" x2="40" y2="2" {...common} />
          <circle cx="15" cy="19" r="3" {...common} />
          <line x1="24" y1="16" x2="36" y2="16" {...common} />
          <line x1="24" y1="22" x2="36" y2="22" {...common} />
        </>
      )}
      {name === "chip" && (
        <>
          <rect x="14" y="6" width="20" height="20" {...common} />
          {[10, 16, 22].map((y) => (
            <g key={y}>
              <line x1="8" y1={y} x2="14" y2={y} {...common} />
              <line x1="34" y1={y} x2="40" y2={y} {...common} />
            </g>
          ))}
          <rect x="19" y="11" width="10" height="10" {...common} strokeDasharray="2 2" />
        </>
      )}
      {name === "window" && (
        <>
          <rect x="4" y="4" width="40" height="24" {...common} />
          <line x1="4" y1="10" x2="44" y2="10" {...common} />
          <path d="M12 16 l4 3 -4 3 M20 22 h8" {...common} />
        </>
      )}
    </svg>
  );
}
