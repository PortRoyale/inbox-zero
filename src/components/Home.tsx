import { ExplodedView } from "@/components/ExplodedView";
import { PageHero } from "@/components/PageHero";
import { Balloon, Fcf } from "@/components/primitives";
import { RefTable, SpecTable, type Reference } from "@/components/structure";
import { Timeline } from "@/components/Timeline";
import { requirements } from "@/lib/cra-requirements";
import { paths } from "@/lib/paths";
import { regulation } from "@/lib/site";

const tools = [
  {
    name: "Security plan builder",
    body: "Eight steps to your technical documentation: risk assessment, requirement evidence, reporting and a dated action plan.",
    href: paths.plan,
    cta: "Build my plan",
    featured: true,
    tool: "plan",
  },
  { name: "Readiness check", body: `${requirements.length} requirements, filtered to your product, scored in about ten minutes.`, href: paths.assessment, cta: "Check readiness", tool: "readiness" },
  { name: "Release gate", body: "Decide each release's security testing from what changed, and keep the record.", href: paths.releaseGate, cta: "Gate a release", tool: "gate" },
  { name: "Sector & country briefs", body: "Your product class, deadlines and where to report, for 14 sectors and 39 countries.", href: paths.brief, cta: "Get my brief", tool: "briefs" },
];

const stats = [
  { figure: "€15M", label: "maximum fine, or 2.5% of worldwide turnover", color: "var(--brand-red)" },
  { figure: "24 h", label: "to send an early warning for an exploited vulnerability", color: "var(--brand-yellow)" },
  { figure: "31", label: "essential requirements mapped, with evidence", color: "var(--brand-blue)" },
  { figure: "50%", label: "EU co-funding for eligible SMEs, up to €30,000", color: "var(--brand-green)" },
];

const references: Reference[] = [
  { ref: "R1", doc: "Regulation (EU) 2024/2847", kind: "EU law", use: "The Cyber Resilience Act: essential requirements, reporting and CE marking." },
  { ref: "R2", doc: "ENISA Single Reporting Platform", kind: "Reporting", use: "Where 24-hour warnings, 72-hour notifications and final reports go." },
  { ref: "R3", doc: "EN 18031-1/-2/-3", kind: "Harmonised std", use: "Radio equipment cybersecurity under the RED delegated act." },
  { ref: "R4", doc: "ETSI EN 303 645", kind: "Standard", use: "Consumer IoT security baseline; a practical starting point." },
  { ref: "R5", doc: "IEC 62443-4-1", kind: "Standard", use: "Secure development lifecycle for industrial products." },
  { ref: "R6", doc: "EN 40000-1-2", kind: "CRA standard", use: "First horizontal CRA standards; not yet cited in the Official Journal." },
  { ref: "R7", doc: "UK PSTI Act 2022", kind: "UK law", use: "Default passwords, vulnerability reporting and update periods for UK sales." },
];

const scope = [
  { type: "Connected devices", examples: "Smart home, wearables, controllers, point-of-sale", status: "in", applies: "Cyber Resilience Act" },
  { type: "Firmware", examples: "Code you ship on your own or a partner's hardware", status: "in", applies: "Cyber Resilience Act" },
  { type: "Software", examples: "Installable and mobile software, plus the backend it needs", status: "in", applies: "Cyber Resilience Act" },
  { type: "Medical devices", examples: "Devices under the MDR and IVDR", status: "out", applies: "MDR / IVDR" },
  { type: "Vehicles, aviation, marine", examples: "Type-approved vehicles, aircraft and ships", status: "out", applies: "Sector type-approval rules" },
  { type: "Pure SaaS", examples: "Hosted services with no product shipped", status: "out", applies: "NIS2, where in scope" },
  { type: "Non-commercial open source", examples: "Projects not supplied in the course of business", status: "out", applies: "Light duties for stewards only" },
] as const;

export function Home() {
  return (
    <div className="wrap stack">
      <PageHero
        id="hero-title"
        motif="device"
        seed={3}
        label="Sheet 1/3"
        cells={[regulation, "Reporting in force"]}
        title={
          <>
            Make your product <span className="mark mark-done">CRA-ready</span> without hiring a security team
          </>
        }
        lead="Find out where your product stands against the EU Cyber Resilience Act, close the gaps, and ship every release with evidence an auditor will accept."
        actions={
          <>
            <a className="btn btn-primary" href={paths.plan}>
              Build my security plan
            </a>
            <a className="btn" href={paths.assessment}>
              10-minute readiness check
            </a>
          </>
        }
        backdrop={false}
        variant="blueprint"
        crosshair
        wideAside
        aside={<ExplodedView />}
        extra={
          <dl className="fact-strip">
            <div>
              <dt>Max. penalty</dt>
              <dd>€15M or 2.5% of turnover</dd>
            </div>
            <div>
              <dt>Report exploited vulns</dt>
              <dd>24 h warning · 72 h notice</dd>
            </div>
            <div>
              <dt>EU SME co-funding</dt>
              <dd>50%, up to €30,000</dd>
            </div>
          </dl>
        }
      >
        <Timeline />
      </PageHero>

      <section aria-label="Key figures" className="stats-band">
        {stats.map((st) => (
          <div key={st.label} className="stat" style={{ ["--stat" as string]: st.color }}>
            <span className="stat-figure">{st.figure}</span>
            <span className="stat-label">{st.label}</span>
          </div>
        ))}
      </section>

      <section className="sheet" aria-labelledby="tools-title">
        <div className="section-head">
          <Fcf keyCell="Sheet 2/3" cells={["Free tools"]} />
          <h2 id="tools-title">Start free. Everything feeds one security plan.</h2>
        </div>
        <ul className="tool-cards">
          {tools.map((t, i) => (
            <li key={t.name} className={t.featured ? "is-featured" : undefined} data-tool={t.tool}>
              <div className="card-head">
                <Balloon>{i + 1}</Balloon>
                <h3>{t.name}</h3>
              </div>
              <p>{t.body}</p>
              <a className={`btn${t.featured ? " btn-primary" : ""}`} href={t.href}>
                {t.cta}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="sheet" aria-labelledby="scope-title">
        <div className="section-head">
          <Fcf keyCell="Sheet 3/3" cells={["Scope · Art. 2"]} />
          <h2 id="scope-title">Built for small teams that make real products</h2>
        </div>
        <SpecTable
          className="scope-table"
          rows={[...scope]}
          rowKey={(r) => r.type}
          rowClass={(r) => (r.status === "out" ? "is-out" : undefined)}
          cols={[
            { key: "type", label: "Product type", head: true, width: "28%", render: (r) => r.type },
            { key: "examples", label: "Examples", render: (r) => r.examples },
            {
              key: "status",
              label: "CRA scope",
              width: "9rem",
              render: (r) => <span className={`scope-tag is-${r.status}`}>{r.status === "in" ? "In scope" : "Excluded"}</span>,
            },
            { key: "applies", label: "Rules that apply", width: "24%", render: (r) => r.applies },
          ]}
        />
        <RefTable caption="Maps to · reference documents" refs={references} />
        <div className="cta-band">
          <p>
            <strong>Designed by a practising Chief Security Officer.</strong> Plans from €0, with EU co-funding for eligible SMEs.
          </p>
          <div className="row">
            <a className="btn" href={paths.pricing}>
              See pricing
            </a>
            <a className="btn btn-primary" href={paths.plan}>
              Build my plan
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
