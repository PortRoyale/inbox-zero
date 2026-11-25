"use client";

import { useEffect, useState } from "react";
import { AreaField, SelectField, TextField } from "@/components/plan/fields";
import { PageHero } from "@/components/PageHero";
import { SpecTable } from "@/components/structure";
import { fromLocalInput, IncidentClock, toLocalInput, type TimeField } from "@/components/tools/IncidentClock";
import { IncidentDetailsFields, type CaseFields } from "@/components/tools/IncidentDetails";
import { FindingsTable, QualityTable, SeverityCounts, type FindingView } from "@/components/tools/SbomResults";
import type { DraftData, IncidentKind, IncidentTimes } from "@/lib/incidents";
import { paths } from "@/lib/paths";
import { parseSbom, SbomError, sbomQuality, type ParsedSbom } from "@/lib/sbom";

const hashMode = process.env.NEXT_PUBLIC_ROUTING === "hash";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}

// ---------- SBOM check ----------

export function SbomCheck() {
  const [parsed, setParsed] = useState<ParsedSbom | null>(null);
  const [error, setError] = useState("");
  const [lookup, setLookup] = useState<{ findings: FindingView[]; queried: number; skipped: number; error: string | null } | null>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File | undefined) => {
    setError("");
    setLookup(null);
    setParsed(null);
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw new SbomError("That file is larger than 5 MB.");
      const s = parseSbom(await file.text());
      setParsed(s);
      if (hashMode) return;
      setBusy(true);
      const components = s.components.filter((c) => c.purl).slice(0, 5000).map((c) => ({ name: c.name.slice(0, 300), version: c.version.slice(0, 120), purl: c.purl }));
      setLookup(await postJson("/api/tools/osv-lookup/", { components }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const quality = parsed ? sbomQuality(parsed) : null;
  const counts = (lookup?.findings ?? []).reduce<Record<string, number>>((acc, f) => ({ ...acc, [f.severity]: (acc[f.severity] ?? 0) + 1 }), {});

  return (
    <div className="wrap stack" data-tool="gate">
      <PageHero
        id="sbom-title"
        tool="gate"
        motif="chip"
        seed={29}
        label="Free tool"
        cells={["SBOM check", "Annex I Pt II(1)"]}
        title="SBOM check"
        lead="Drop in the CycloneDX or SPDX JSON your build produces. Quality is scored in your browser; only package names, versions and package URLs are sent for the vulnerability lookup. Nothing is stored."
      />
      <section className="sheet stack-sm">
        <h2>Your SBOM</h2>
        <form className="inline-form" onSubmit={(e) => e.preventDefault()}>
          <label className="field" htmlFor="tool-sbom">
            <span className="label">SBOM file</span>
            <input id="tool-sbom" type="file" accept="application/json,.json" onChange={(e) => onFile(e.target.files?.[0])} />
            <span className="hint">CycloneDX 1.4 to 1.6 or SPDX 2.2/2.3 JSON, up to 5 MB.</span>
          </label>
        </form>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {parsed && (
          <SpecTable
            rows={[parsed]}
            rowKey={() => "s"}
            cols={[
              { key: "s", label: "Describes", head: true, render: (s) => s.subject ?? "Not stated" },
              { key: "f", label: "Format", width: "10rem", code: true, render: (s) => `${s.format} ${s.specVersion}` },
              { key: "c", label: "Components", width: "8rem", code: true, render: (s) => s.components.length },
              { key: "t", label: "Made by", width: "12rem", render: (s) => s.tool ?? s.author ?? "Not stated" },
            ]}
          />
        )}
      </section>

      {parsed && (
        <section className="sheet stack-sm">
          <h2>Known vulnerabilities</h2>
          {hashMode ? (
            <p className="note-line">The vulnerability lookup runs on the hosted app. This preview scores quality only.</p>
          ) : busy ? (
            <p className="muted">Checking {parsed.components.filter((c) => c.purl).length} components against the OSV database…</p>
          ) : lookup?.error ? (
            <p className="form-error" role="alert">
              The vulnerability lookup did not complete: {lookup.error}. Your quality score below is still valid.
            </p>
          ) : (
            lookup && (
              <>
                <SeverityCounts counts={counts} />
                <p className="muted">
                  {lookup.queried} components checked; {lookup.skipped} skipped because they have no package URL or version.
                </p>
                <FindingsTable findings={lookup.findings} />
              </>
            )
          )}
          <p className="muted">
            Want this every hour, with alerts and triage? <a href={hashMode ? paths.pricing : "/signup/"}>SBOM watch</a> does it per product.
          </p>
        </section>
      )}

      {quality && (
        <section className="sheet stack-sm">
          <h2>Quality against the CRA and NTIA minimum elements</h2>
          <QualityTable score={quality.score} checks={quality.checks} />
        </section>
      )}
    </div>
  );
}

// ---------- Incident clock ----------

const CLOCK_KEY = "incident-clock-v1";
type ClockState = { kind: IncidentKind; times: IncidentTimes; draft: Omit<DraftData, "awareAt"> };

export function IncidentClockTool() {
  const [state, setState] = useState<ClockState | null>(null);
  const [kind, setKind] = useState<IncidentKind>("vulnerability");
  const [aware, setAware] = useState("");
  const [product, setProduct] = useState("");

  useEffect(() => {
    setAware(toLocalInput(Date.now()));
    try {
      const raw = localStorage.getItem(CLOCK_KEY);
      if (raw) setState(JSON.parse(raw) as ClockState);
    } catch {
      // Storage is optional.
    }
  }, []);
  useEffect(() => {
    try {
      if (state) localStorage.setItem(CLOCK_KEY, JSON.stringify(state));
      else localStorage.removeItem(CLOCK_KEY);
    } catch {
      // Storage is optional.
    }
  }, [state]);

  const setTime = (f: TimeField, ms: number | null) => setState((s) => (s ? { ...s, times: { ...s.times, [f]: ms } } : s));
  const setDraft = (patch: Partial<CaseFields>) => setState((s) => (s ? { ...s, draft: { ...s.draft, ...patch } } : s));

  return (
    <div className="wrap stack" data-tool="gate">
      <PageHero
        id="clock-title"
        tool="gate"
        motif="gauge"
        seed={31}
        label="Free tool"
        cells={["Incident clock", "Art. 14"]}
        title="CRA reporting clock"
        lead="An exploited vulnerability or severe incident starts a 24-hour clock. Enter when you became aware; the clock shows every deadline and drafts each report. Everything stays in this browser."
      />
      {!state ? (
        <section className="sheet stack-sm">
          <h2>Start the clock</h2>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              const at = fromLocalInput(aware);
              if (at) setState({ kind, times: { awareAt: at }, draft: { productName: product } });
            }}
          >
            <SelectField<IncidentKind>
              id="ct-kind"
              label="What happened"
              value={kind}
              options={[
                { value: "vulnerability", label: "Actively exploited vulnerability" },
                { value: "incident", label: "Severe incident" },
              ]}
              onChange={setKind}
            />
            <TextField id="ct-product" label="Product" value={product} onChange={setProduct} placeholder="Smart thermostat" />
            <TextField id="ct-aware" label="Became aware" type="datetime-local" value={aware} onChange={setAware} hint="Your local time." />
            <div className="field form-action">
              <span className="label" aria-hidden="true">
                &nbsp;
              </span>
              <button type="submit" className="btn btn-primary" disabled={!aware}>
                Start the clock
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section className="sheet stack">
            <div className="row-between">
              <h2>{state.draft.productName || "Your case"}</h2>
              <button type="button" className="btn" onClick={() => setState(null)}>
                Clear and start again
              </button>
            </div>
            <IncidentClock kind={state.kind} times={state.times} draft={{ ...state.draft, awareAt: state.times.awareAt }} onTime={setTime} />
          </section>
          <section className="sheet stack-sm" id="case-details">
            <h2>Details for the reports</h2>
            <p className="muted">Fill these once; every draft above updates as you type.</p>
            <IncidentDetailsFields idPrefix="cd" kind={state.kind} value={state.draft} onChange={setDraft} askProduct />
            <p className="muted">
              Running this for real? The <a href={hashMode ? paths.pricing : "/signup/"}>incident clock in your workspace</a> keeps the timeline as evidence and shares it with your team.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

// ---------- Signature verification ----------

export function VerifySignature() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ valid: boolean; recorded: boolean; kid: string | null; currentKid: string; type: string | null; bundleMatches: boolean | null } | null>(null);
  const [error, setError] = useState("");
  const check = async () => {
    setError("");
    setResult(null);
    try {
      const parsed = JSON.parse(text) as { statement?: unknown; manifest?: unknown; signature?: unknown; bundle?: unknown };
      const statement = parsed.statement ?? parsed.manifest;
      if (!statement || !parsed.signature) throw new Error("Paste a signed statement or an evidence export: it needs a statement or manifest, and a signature.");
      setResult(await postJson("/api/verify/", { statement, signature: parsed.signature, bundle: parsed.bundle }));
    } catch (e) {
      setError(e instanceof SyntaxError ? "That is not valid JSON." : (e as Error).message);
    }
  };
  return (
    <div className="wrap stack" data-tool="plan">
      <PageHero
        id="verify-title"
        tool="plan"
        motif="shield"
        seed={37}
        label="Verify"
        cells={["Ed25519", "ML-DSA-65", "SHA-512"]}
        title="Verify a signed record"
        lead="Paste a signed plan revision or an evidence export. The signature is valid only when both the classical (Ed25519) and post-quantum (ML-DSA-65) signatures verify."
      />
      <section className="sheet stack-sm">
        <AreaField id="verify-json" label="Signed statement or evidence file (JSON)" rows={10} value={text} onChange={setText} placeholder='{"statement": {...}, "signature": {...}}' />
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={check} disabled={!text.trim() || hashMode}>
            Verify
          </button>
          <a className="btn btn-quiet" href="/api/keys/">
            Public keys
          </a>
        </div>
        {hashMode && <p className="note-line">Verification runs on the hosted app.</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <SpecTable
            rows={[
              { check: "Signatures (Ed25519 and ML-DSA-65)", ok: result.valid, detail: result.valid ? "Both verify against this service's keys." : "Do not trust this record: a signature does not verify." },
              { check: "Recorded by this service", ok: result.recorded, detail: result.recorded ? "The same record exists in our ledger." : "Not found in our ledger." },
              ...(result.bundleMatches === null ? [] : [{ check: "Bundle matches manifest", ok: result.bundleMatches, detail: result.bundleMatches ? "SHA-512 of the bundle equals the signed digest." : "The bundle was changed after signing." }]),
              { check: "Signing key", ok: result.kid === result.currentKid, detail: `Key ${result.kid ?? "unknown"}${result.kid === result.currentKid ? " (current)" : ""}.` },
            ]}
            rowKey={(r) => r.check}
            cols={[
              { key: "c", label: "Check", head: true, render: (r) => r.check },
              { key: "r", label: "Result", width: "9rem", render: (r) => <span className={`count-tag ${r.ok ? "is-good" : "is-bad"}`}>{r.ok ? "Pass" : "Fail"}</span> },
              { key: "d", label: "Detail", render: (r) => r.detail },
            ]}
          />
        )}
      </section>
    </div>
  );
}
