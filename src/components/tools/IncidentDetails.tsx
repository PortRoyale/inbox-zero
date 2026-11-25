"use client";

import { AreaField, SelectField, TextField } from "@/components/plan/fields";
import type { DraftData, IncidentKind } from "@/lib/incidents";

// Every value the Article 14 report drafts use, in one form shared by the free incident clock and
// the workspace. Grouped by the report that first needs it, so people fill the 24-hour fields first.
export type CaseFields = Partial<Omit<DraftData, "awareAt">> & { srpReference?: string };

type Props = {
  idPrefix: string;
  kind: IncidentKind;
  value: CaseFields;
  onChange: (patch: Partial<CaseFields>) => void;
  // The free tool asks for the product name here; the workspace takes it from the product.
  askProduct?: boolean;
  // Only the workspace stores the ENISA platform reference.
  askReference?: boolean;
};

export function IncidentDetailsFields({ idPrefix, kind, value: d, onChange, askProduct = false, askReference = false }: Props) {
  const vuln = kind === "vulnerability";
  const id = (s: string) => `${idPrefix}-${s}`;
  const text = (k: keyof CaseFields) => (v: string) => onChange({ [k]: v });
  return (
    <div className="form-grid case-fields">
      <h3 className="span-2 case-group">Who and what</h3>
      {askProduct && <TextField id={id("product")} label="Product" value={d.productName ?? ""} onChange={text("productName")} placeholder="Smart thermostat" />}
      <TextField id={id("version")} label="Affected versions" value={d.productVersion ?? ""} onChange={text("productVersion")} placeholder="2.0 to 2.4.1" />
      <TextField id={id("man")} label="Manufacturer" value={d.manufacturer ?? ""} onChange={text("manufacturer")} placeholder="Acme Devices GmbH" />
      <TextField id={id("ms")} label="Member State of main establishment" value={d.memberState ?? ""} onChange={text("memberState")} placeholder="Germany" hint="Sets which CSIRT coordinates your report." />
      <TextField
        id={id("states")}
        label="Member States where it is sold"
        value={(d.marketStates ?? []).join(", ")}
        onChange={(v) => onChange({ marketStates: v.split(",").map((s) => s.trim()).filter(Boolean) })}
        placeholder="Germany, France, Spain"
        hint="Separate with commas."
      />
      <TextField id={id("contact")} label="Contact for this case" value={d.contact ?? ""} onChange={text("contact")} placeholder="security@acme.example" />

      <h3 className="span-2 case-group">For the 24-hour warning</h3>
      <div className="span-2">
        <AreaField id={id("sum")} label={vuln ? "What the vulnerability is" : "What happened"} rows={2} value={d.summary ?? ""} onChange={text("summary")} placeholder="Two sentences in plain language." />
      </div>
      {!vuln && (
        <SelectField<"" | "yes" | "no">
          id={id("malicious")}
          label="Suspected unlawful or malicious act?"
          value={d.suspectedMalicious === true ? "yes" : d.suspectedMalicious === false ? "no" : ""}
          options={[
            { value: "", label: "Not decided yet" },
            { value: "yes", label: "Yes, suspected" },
            { value: "no", label: "No, not suspected" },
          ]}
          onChange={(v) => onChange({ suspectedMalicious: v === "" ? undefined : v === "yes" })}
        />
      )}

      <h3 className="span-2 case-group">For the 72-hour notification</h3>
      {vuln && (
        <div className="span-2">
          <AreaField id={id("nature")} label="Nature of the exploit and vulnerability" rows={2} value={d.exploitNature ?? ""} onChange={text("exploitNature")} />
        </div>
      )}
      <TextField id={id("sev")} label="Severity" value={d.severity ?? ""} onChange={text("severity")} placeholder="High, CVSS 8.1" />
      <SelectField<"" | "low" | "medium" | "high">
        id={id("sens")}
        label="How sensitive is this information?"
        value={d.sensitivity ?? ""}
        options={[
          { value: "", label: "Choose" },
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
        ]}
        onChange={(v) => onChange({ sensitivity: v || undefined })}
      />
      <div className="span-2">
        <AreaField id={id("impact")} label="Impact" rows={2} value={d.impact ?? ""} onChange={text("impact")} />
      </div>
      <div className="span-2">
        <AreaField id={id("taken")} label="Measures you have taken" rows={2} value={d.measuresTaken ?? ""} onChange={text("measuresTaken")} />
      </div>
      <div className="span-2">
        <AreaField id={id("users")} label="What users can do" rows={2} value={d.userMeasures ?? ""} onChange={text("userMeasures")} placeholder="Update to 2.4.2, or turn off remote access until then." />
      </div>

      <h3 className="span-2 case-group">For the final report</h3>
      <div className="span-2">
        <AreaField id={id("fix")} label="Security update or corrective measure" rows={2} value={d.correctiveMeasure ?? ""} onChange={text("correctiveMeasure")} />
      </div>
      {vuln ? (
        <TextField id={id("actor")} label="Malicious actor, if known" value={d.maliciousActor ?? ""} onChange={text("maliciousActor")} />
      ) : (
        <TextField id={id("root")} label="Type of threat or root cause" value={d.rootCause ?? ""} onChange={text("rootCause")} />
      )}
      {askReference ? (
        <TextField id={id("srp")} label="ENISA platform reference" value={d.srpReference ?? ""} onChange={text("srpReference")} />
      ) : (
        <span aria-hidden="true" />
      )}
    </div>
  );
}
