"use client";

import { useState } from "react";
import { countries } from "@/content/countries";
import { industries, industryBySlug } from "@/content/industries";
import { SelectField } from "@/components/plan/fields";
import { Fcf } from "@/components/primitives";
import { BriefView } from "@/components/seo/BriefView";
import { buildBrief } from "@/lib/seo/brief";

export function BriefExplorer({ initialIndustry = "smart-home-security", initialCountry = "germany" }: { initialIndustry?: string; initialCountry?: string }) {
  const [industry, setIndustry] = useState(initialIndustry);
  const [country, setCountry] = useState(initialCountry);
  const brief = buildBrief(industryBySlug(industry), countries.find((c) => c.slug === country));
  const euCountries = countries.filter((c) => c.inEU);
  const exporters = countries.filter((c) => !c.inEU);

  return (
    <div className="wrap stack">
      <section className="sheet" aria-labelledby="explorer-title">
        <div className="sheet-head">
          <div>
            <Fcf keyCell="Brief generator" cells={[`${industries.length} sectors`, `${countries.length} countries`]} />
            <h1 id="explorer-title" className="page-title">
              Your CRA brief, for your sector and country
            </h1>
            <p className="lead">Pick what you make and where you are. The brief updates instantly with your product class, deadlines, where to report and what to do first.</p>
          </div>
        </div>
        <div className="explorer-pickers">
          <SelectField id="ex-industry" label="What you make" value={industry} options={industries.map((i) => ({ value: i.slug, label: i.name }))} onChange={setIndustry} />
          <label className="field" htmlFor="ex-country">
            <span className="label">Where you are based</span>
            <select id="ex-country" value={country} onChange={(e) => setCountry(e.target.value)}>
              <optgroup label="EU member states">
                {euCountries.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Exporting to the EU from">
                {exporters.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
        </div>
      </section>
      <section className="sheet" aria-live="polite">
        <BriefView brief={brief} headingLevel={2} />
      </section>
    </div>
  );
}
