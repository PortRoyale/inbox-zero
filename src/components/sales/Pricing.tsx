"use client";

import { useState } from "react";
import { faqNotes as notes } from "@/content/faq";
import { PageHero } from "@/components/PageHero";
import { ContactLine } from "@/components/primitives";
import { CostCalculator } from "@/components/sales/CostCalculator";
import { LeadForm } from "@/components/sales/LeadForm";
import { SheetTabs } from "@/components/SheetTabs";
import { paths } from "@/lib/paths";

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
  ["Products covered", ["In browser", "1", "Up to 5", "Up to 5"]],
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


const JOIN_TAB = 4;

export function Pricing() {
  const [tab, setTab] = useState(0);
  const [interest, setInterest] = useState("");
  const choose = (plan: string) => {
    setInterest(plan);
    setTab(JOIN_TAB);
    requestAnimationFrame(() => document.getElementById("pricing-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  return (
    <div className="wrap stack">
      <PageHero
        id="pricing-title"
        motif="gauge"
        seed={41}
        label="Pricing"
        cells={["Early access"]}
        title="Priced for small product teams"
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
        id="pricing-tabs"
        value={tab}
        onValueChange={setTab}
        items={[
          {
            id: "plans",
            label: "Plans",
            content: (
              <>
                <h2>Plans</h2>
                <div className="table-scroll">
                  <table className="drawing variants">
                    <colgroup>
                      <col className="col-feature" />
                      {variants.map((v) => (
                        <col key={v.code} className="col-plan" />
                      ))}
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">Feature</th>
                        {variants.map((v) => (
                          <th key={v.code} scope="col" className={v.name === "Starter" ? "is-recommended" : undefined}>
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
                    <tfoot>
                      <tr>
                        <th scope="row">Choose</th>
                        <td>
                          <a className="btn btn-small" href={paths.plan}>
                            Start free
                          </a>
                        </td>
                        <td className="is-recommended-cell">
                          <button type="button" className="btn btn-primary btn-small" onClick={() => choose("Starter")}>
                            Join
                          </button>
                        </td>
                        <td>
                          <button type="button" className="btn btn-small" onClick={() => choose("Team")}>
                            Join
                          </button>
                        </td>
                        <td>
                          <button type="button" className="btn btn-small" onClick={() => choose("Guided")}>
                            Book call
                          </button>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="muted">Starter is recommended for one product. Prices exclude VAT. Cancel any time.</p>
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
                <LeadForm interest={interest} />
                <ContactLine />
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
