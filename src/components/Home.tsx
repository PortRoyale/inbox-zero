import { ExplodedView } from "@/components/ExplodedView";
import { PageHero } from "@/components/PageHero";
import { Balloon, Fcf } from "@/components/primitives";
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

const appliesTo = [
  { title: "Connected devices", body: "Anything with a radio or a port: smart home, wearables, controllers, point-of-sale." },
  { title: "Firmware", body: "Code you ship on your own or a partner's hardware." },
  { title: "Software", body: "Installable and mobile software sold in the EU, plus the backend it needs." },
];

const stats = [
  { figure: "€15M", label: "maximum fine, or 2.5% of worldwide turnover", color: "var(--brand-red)" },
  { figure: "24 h", label: "to send an early warning for an exploited vulnerability", color: "var(--brand-yellow)" },
  { figure: "31", label: "essential requirements mapped, with evidence", color: "var(--brand-blue)" },
  { figure: "50%", label: "EU co-funding for eligible SMEs, up to €30,000", color: "var(--brand-green)" },
];

const standards = [
  { name: "Regulation (EU) 2024/2847", color: "var(--brand-blue)" },
  { name: "ENISA Single Reporting Platform", color: "var(--brand-red)" },
  { name: "EN 18031", color: "var(--brand-yellow)" },
  { name: "ETSI EN 303 645", color: "var(--brand-green)" },
  { name: "IEC 62443-4-1", color: "var(--brand-blue)" },
  { name: "EN 40000-1-2", color: "var(--brand-red)" },
  { name: "UK PSTI", color: "var(--brand-yellow)" },
];

const outOfScope = ["Medical devices", "Vehicles, aviation, marine", "Pure SaaS (NIS2 instead)", "Non-commercial open source"];

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
        <div className="scope-strip">
          {appliesTo.map((a) => (
            <div key={a.title}>
              <h3>{a.title}</h3>
              <p>{a.body}</p>
            </div>
          ))}
          <div className="applies-out">
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
        <div className="standards-strip" aria-label="Standards the tools map to">
          <span className="label">Maps to</span>
          {standards.map((st) => (
            <span key={st.name} className="std-chip" style={{ ["--chip" as string]: st.color }}>
              {st.name}
            </span>
          ))}
        </div>
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
