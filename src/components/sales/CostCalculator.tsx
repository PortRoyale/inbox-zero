"use client";

import { useState } from "react";
import { SelectField, TextField } from "@/components/plan/fields";
import { CheckList, SpecTable } from "@/components/structure";
import { DAYS_BY_CLASS, GUIDED, TEAM_YEAR, estimateCosts } from "@/lib/costs";

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;

export function CostCalculator() {
  const [products, setProducts] = useState("1");
  const [cls, setCls] = useState<"default" | "important-1" | "important-2">("default");
  const [dayRate, setDayRate] = useState("1200");
  const [penTest, setPenTest] = useState("12000");
  const [euSme, setEuSme] = useState(true);
  const n = Math.max(1, Math.min(20, Number(products) || 1));
  const rate = Math.max(0, Number(dayRate) || 0);
  const pen = Math.max(0, Number(penTest) || 0);
  const r = estimateCosts({ products: n, cls, dayRate: rate, penTest: pen, euSme });
  const max = Math.max(r.outsourced, r.withUs, 1);
  const plan = r.subscription === TEAM_YEAR ? "Team" : "Starter";
  const lines: { item: string; basis: string; outsourced: string; withUs: string; strong?: boolean }[] = [
    { item: "Documentation and risk assessment", basis: `${DAYS_BY_CLASS[cls]} days per product × ${eur(rate)}`, outsourced: eur(r.consultingDays * rate), withUs: "Included" },
    { item: "Guided package", basis: "Expert review, threat-model workshop, CE plan", outsourced: "Not needed", withUs: eur(GUIDED) },
    { item: `${plan} plan, one year`, basis: n > 1 ? "Up to 5 products" : "One product", outsourced: "Not needed", withUs: eur(r.subscription) },
    { item: "Penetration testing", basis: `${n} × ${eur(pen)}, needed either way`, outsourced: eur(pen * n), withUs: eur(pen * n) },
    { item: "Total, first year", basis: "Before co-funding", outsourced: eur(r.outsourced), withUs: eur(r.withUs), strong: true },
    ...(euSme
      ? [
          { item: "EU co-funding", basis: "50% of costs, capped at €30,000", outsourced: `− ${eur(r.outsourced - r.outsourcedNet)}`, withUs: `− ${eur(r.grantOnUs)}` },
          { item: "Net cost", basis: "After co-funding", outsourced: eur(r.outsourcedNet), withUs: eur(r.withUsNet), strong: true },
        ]
      : []),
  ];

  return (
    <div className="calc calc-v2">
      <div className="calc-inputs">
        <TextField id="calc-products" label="Products" type="number" value={products} onChange={setProducts} hint="Each with its own plan." />
        <SelectField<"default" | "important-1" | "important-2">
          id="calc-class"
          label="CRA category"
          value={cls}
          options={[
            { value: "default", label: "Default" },
            { value: "important-1", label: "Important, Class I" },
            { value: "important-2", label: "Important, Class II" },
          ]}
          onChange={setCls}
          hint="Sets consultant days."
        />
        <TextField id="calc-rate" label="Day rate (€)" type="number" value={dayRate} onChange={setDayRate} hint="EU seniors: €900 to €2,600." />
        <TextField id="calc-pentest" label="Pen test (€)" type="number" value={penTest} onChange={setPenTest} hint="Per product; IoT €6k to €40k." />
      </div>

      <CheckList
        legend="Funding"
        rows={[
          {
            id: "calc-grant",
            label: "We are an EU SME (SECURE co-funding: 50%, up to €30,000)",
            hint: "Eligibility is decided by the SECURE call, not by us.",
            basis: "SECURE call 2",
            checked: euSme,
            onChange: setEuSme,
          },
        ]}
      />

      <div className="calc-result" aria-live="polite">
        <div className="cr-cell">
          <p className="label">Consultant-led</p>
          <p className="cr-figure code">{eur(r.outsourced)}</p>
          <div className="gauge is-cost" aria-hidden="true">
            <span style={{ width: `${(r.outsourced / max) * 100}%` }} />
          </div>
          <p className="cr-note">{euSme ? `${eur(r.outsourcedNet)} after co-funding` : "First year"}</p>
        </div>
        <div className="cr-cell is-ours">
          <p className="label">Guided + platform</p>
          <p className="cr-figure code">{eur(r.withUs)}</p>
          <div className="gauge is-cost is-ours" aria-hidden="true">
            <span style={{ width: `${(r.withUs / max) * 100}%` }} />
          </div>
          <p className="cr-note">{euSme ? `${eur(r.withUsNet)} after co-funding` : "First year"}</p>
        </div>
        <div className="cr-cell is-save">
          <p className="label">You save</p>
          <p className="cr-figure code">{eur(r.outsourced - r.withUs)}</p>
          <p className="cr-note">{r.consultingDays} consultant days avoided</p>
        </div>
      </div>

      <SpecTable
        className="calc-table"
        caption="First-year breakdown · change any figure above"
        rows={lines}
        rowKey={(l) => l.item}
        rowClass={(l) => (l.strong ? "is-strong" : undefined)}
        cols={[
          { key: "item", label: "Line item", head: true, render: (l) => l.item },
          { key: "basis", label: "Worked out as", width: "34%", render: (l) => <span className="muted">{l.basis}</span> },
          { key: "out", label: "Consultant", width: "9rem", code: true, render: (l) => l.outsourced },
          { key: "us", label: "With us", width: "9rem", code: true, render: (l) => l.withUs },
        ]}
      />
      <p className="hint">Our estimate from published 2025–26 pricing guides. Not a quote.</p>
    </div>
  );
}
