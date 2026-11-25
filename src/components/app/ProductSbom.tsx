"use client";

import { useState } from "react";
import { TextField } from "@/components/plan/fields";
import { ConfirmButton } from "@/components/primitives";
import { SpecTable } from "@/components/structure";
import { FindingsTable, QualityTable, SeverityCounts, type FindingView, type QualityCheck } from "@/components/tools/SbomResults";
import { api } from "@/lib/client/api";
import { Act, ErrorLine, useLoad, when } from "@/components/app/AppShell";

type SbomSummary = {
  id: string;
  label: string;
  format: string;
  specVersion: string;
  components: number;
  subject: string;
  tool: string;
  quality: { score: number; checks: QualityCheck[] };
  counts: Record<string, number>;
  checkedAt: number | null;
  checkError: string | null;
  createdAt: number;
};

export function ProductSbom({ productId, canEdit, canDelete }: { productId: string; canEdit: boolean; canDelete: boolean }) {
  const list = useLoad(() => api<{ sboms: SbomSummary[] }>("GET", `/products/${productId}/sboms`), [productId]);
  const [selected, setSelected] = useState<string | null>(null);
  const sboms = list.data?.sboms ?? [];
  const current = sboms.find((s) => s.id === selected) ?? sboms[0];
  const findings = useLoad(
    () => (current ? api<{ findings: FindingView[] }>("GET", `/products/${productId}/sboms/${current.id}/findings`) : Promise.resolve({ findings: [] })),
    [productId, current?.id],
  );
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const upload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setNote("");
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error("That file is larger than 5 MB.");
      const text = await file.text();
      const res = await api<{ id: string; newFindings: unknown[]; error: string | null }>("POST", `/products/${productId}/sboms`, { label: label || file.name, text });
      setNote(res.error ? `Uploaded. The vulnerability check failed (${res.error}); it will retry with the hourly watch.` : `Uploaded and checked: ${res.newFindings.length} known vulnerabilities.`);
      setSelected(res.id);
      setLabel("");
      setFile(null);
      list.reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    if (!current) return;
    setError("");
    try {
      const res = await api<{ newFindings: number; error: string | null }>("POST", `/products/${productId}/sboms/${current.id}/check`);
      setNote(res.error ? `Check failed: ${res.error}` : `Checked: ${res.newFindings} new.`);
      list.reload();
      findings.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const setStatus = async (f: FindingView, status: string) => {
    if (!f.id) return;
    try {
      await api("PATCH", `/products/${productId}/findings/${f.id}`, { status });
      findings.setData((d) => (d ? { findings: d.findings.map((x) => (x.id === f.id ? { ...x, status } : x)) } : d));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="stack-flow">
      <section className="stack-sm">
        <h2>SBOM watch</h2>
        <p className="muted">
          Upload the CycloneDX or SPDX JSON your build produces. Each component is checked against the OSV vulnerability database now and again every hour; owners and admins are
          emailed when a new critical or high vulnerability appears.
        </p>
        {canEdit && (
          <form className="inline-form" onSubmit={upload}>
            <TextField id="sbom-label" label="Release or label" value={label} onChange={setLabel} placeholder="v2.5.0" />
            <label className="field" htmlFor="sbom-file">
              <span className="label">SBOM file</span>
              <input id="sbom-file" type="file" accept="application/json,.json,.cdx.json,.spdx.json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <span className="hint">CycloneDX or SPDX JSON, up to 5 MB.</span>
            </label>
            <Act>
              <button type="submit" className="btn btn-primary" disabled={!file || busy}>
                {busy ? "Checking…" : "Upload and check"}
              </button>
            </Act>
          </form>
        )}
        {note && <p className="note-line">{note}</p>}
        <ErrorLine error={error || list.error} />
      </section>

      {sboms.length > 0 && (
        <section className="stack-sm">
          <h3>Uploaded SBOMs</h3>
          <SpecTable
            rows={sboms}
            rowKey={(s) => s.id}
            rowClass={(s) => (s.id === current?.id ? "is-strong" : undefined)}
            cols={[
              {
                key: "label",
                label: "SBOM",
                head: true,
                render: (s) => (
                  <button type="button" className="link-btn" onClick={() => setSelected(s.id)}>
                    {s.label}
                  </button>
                ),
              },
              { key: "fmt", label: "Format", width: "10rem", code: true, render: (s) => `${s.format} ${s.specVersion}` },
              { key: "n", label: "Components", width: "8rem", code: true, render: (s) => s.components },
              { key: "q", label: "Quality", width: "7rem", code: true, render: (s) => `${s.quality.score}%` },
              {
                key: "v",
                label: "Serious",
                width: "8rem",
                render: (s) => {
                  if (s.checkError || !s.checkedAt) return <span className="count-tag is-neutral">{s.checkError ? "Not checked" : "Pending"}</span>;
                  const n = (s.counts.critical ?? 0) + (s.counts.high ?? 0);
                  return <span className={`count-tag ${n ? "is-bad" : "is-good"}`}>{n ? `${n} serious` : "None"}</span>;
                },
              },
              { key: "c", label: "Checked", width: "10rem", code: true, render: (s) => (s.checkError ? "Failed" : when(s.checkedAt).slice(0, 11) || "Pending") },
            ]}
          />
        </section>
      )}

      {current && (
        <section className="stack-sm">
          <div className="row-between">
            <h3>
              {current.label}
              {current.subject ? ` · ${current.subject}` : ""}
            </h3>
            <div className="row">
              {canEdit && (
                <button type="button" className="btn" onClick={recheck}>
                  Check now
                </button>
              )}
              {canDelete && (
                <ConfirmButton
                  label="Delete SBOM"
                  confirmLabel="Delete it"
                  onConfirm={async () => {
                    await api("DELETE", `/products/${productId}/sboms/${current.id}`).catch((e: Error) => setError(e.message));
                    setSelected(null);
                    list.reload();
                  }}
                />
              )}
            </div>
          </div>
          {current.checkError || !current.checkedAt ? (
            <p className="form-error" role="alert">
              The vulnerability check has not completed{current.checkError ? `: ${current.checkError}` : ""}. Results appear after the next successful check; use Check now to retry.
            </p>
          ) : (
            <>
              <SeverityCounts counts={current.counts} />
              <ErrorLine error={findings.error} />
              {findings.data && <FindingsTable findings={findings.data.findings} onStatus={canEdit ? setStatus : undefined} />}
            </>
          )}
          <QualityTable score={current.quality.score} checks={current.quality.checks} />
        </section>
      )}
    </div>
  );
}
