"use client";

import { useState } from "react";
import { SelectField, TextField, Toggle } from "@/components/plan/fields";
import { Fcf } from "@/components/primitives";

const DAYS_BY_CLASS = { default: 15, "important-1": 25, "important-2": 35 } as const;
type Cls = keyof typeof DAYS_BY_CLASS;

const STARTER_YEAR = 149 * 12;
const TEAM_YEAR = 499 * 12;
const GUIDED = 6000;
const GRANT_CAP = 30000;

export function estimateCosts({ products, cls, dayRate, penTest, euSme }: { products: number; cls: Cls; dayRate: number; penTest: number; euSme: boolean }) {
  const consultingDays = DAYS_BY_CLASS[cls] * products;
  const outsourced = consultingDays * dayRate + penTest * products;
  const subscription = products > 1 ? TEAM_YEAR : STARTER_YEAR;
  const withUs = GUIDED + subscription + penTest * products;
  const grant = (cost: number) => (euSme ? Math.min(cost * 0.5, GRANT_CAP) : 0);
  return {
    consultingDays,
    outsourced,
    outsourcedNet: outsourced - grant(outsourced),
    withUs,
    withUsNet: withUs - grant(withUs),
    subscription,
  };
}

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-GB")}`;

export function CostCalculator() {
  const [products, setProducts] = useState("1");
  const [cls, setCls] = useState<Cls>("default");
  const [dayRate, setDayRate] = useState("1200");
  const [penTest, setPenTest] = useState("12000");
  const [euSme, setEuSme] = useState(true);
  const r = estimateCosts({
    products: Math.max(1, Math.min(20, Number(products) || 1)),
    cls,
    dayRate: Math.max(0, Number(dayRate) || 0),
    penTest: Math.max(0, Number(penTest) || 0),
    euSme,
  });
  const max = Math.max(r.outsourced, r.withUs, 1);

  return (
    <div className="calc">
      <div className="form-grid">
        <TextField id="calc-products" label="Products" type="number" value={products} onChange={setProducts} />
        <SelectField<Cls>
          id="calc-class"
          label="Product category"
          value={cls}
          options={[
            { value: "default", label: "Default" },
            { value: "important-1", label: "Important, Class I" },
            { value: "important-2", label: "Important, Class II" },
          ]}
          onChange={setCls}
        />
        <TextField id="calc-rate" label="Consultant day rate (€)" type="number" value={dayRate} onChange={setDayRate} hint="Senior EU security consultants bill roughly €900–2,600 a day." />
        <TextField id="calc-pentest" label="Penetration test per product (€)" type="number" value={penTest} onChange={setPenTest} hint="Needed either way. IoT tests typically run €6,000–40,000." />
        <div className="span-2">
          <Toggle id="calc-grant" label="We are an EU SME (SECURE co-funding: 50%, up to €30,000)" checked={euSme} onChange={setEuSme} hint="Eligibility is decided by the SECURE call, not by us." />
        </div>
      </div>
      <div className="calc-out" aria-live="polite">
        <Fcf keyCell="First-year estimate" cells={[`${r.consultingDays} consultant days avoided`]} />
        <div className="calc-bars">
          <div className="calc-bar">
            <span>Consultant-led</span>
            <div className="gauge">
              <span style={{ width: `${(r.outsourced / max) * 100}%` }} />
            </div>
            <span className="code">{eur(r.outsourced)}</span>
          </div>
          <div className="calc-bar is-ours">
            <span>Guided + platform</span>
            <div className="gauge">
              <span style={{ width: `${(r.withUs / max) * 100}%` }} />
            </div>
            <span className="code">{eur(r.withUs)}</span>
          </div>
        </div>
        <p className="calc-figure">{eur(r.outsourced - r.withUs)} saved</p>
        {euSme && (
          <p>
            After co-funding: <strong className="code">{eur(r.withUsNet)}</strong> with us, versus <span className="code">{eur(r.outsourcedNet)}</span> consultant-led.
          </p>
        )}
        <p className="hint">
          Assumptions you can change: consultant days for documentation and risk assessment ({DAYS_BY_CLASS[cls]} per product for this category, our
          estimate), Guided package €6,000, {r.subscription === TEAM_YEAR ? "Team" : "Starter"} plan for a year. Rates from published 2025–26 pricing
          guides. Not a quote.
        </p>
      </div>
    </div>
  );
}
