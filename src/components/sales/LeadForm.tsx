"use client";

import { useEffect, useState } from "react";
import { industries } from "@/content/industries";
import { AreaField, SelectField, TextField } from "@/components/plan/fields";
import { CopyButton } from "@/components/primitives";
import { api, ApiError } from "@/lib/client/api";
import { site } from "@/lib/site";

// The hosted site stores requests through its own API (encrypted, rate limited). The single-file
// demo has no server, so it shows the contact address and a copy button instead.
const hasServer = process.env.NEXT_PUBLIC_ROUTING !== "hash";

type State = "idle" | "sending" | "sent" | "fallback" | "error" | "limited";

export function LeadForm({ source = "pricing", interest = "" }: { source?: string; interest?: string }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", sector: "", ship: "", plan: interest, message: "", website: "" });
  useEffect(() => {
    if (interest) setForm((f) => ({ ...f, plan: interest }));
  }, [interest]);
  const [state, setState] = useState<State>("idle");
  const [tried, setTried] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim() && /\S+@\S+\.\S+/.test(form.email) && form.company.trim();

  const summary = () =>
    [
      `Name: ${form.name}`,
      `Email: ${form.email}`,
      `Company: ${form.company}`,
      `Sector: ${industries.find((i) => i.slug === form.sector)?.name ?? "Not given"}`,
      `Ships to EU: ${form.ship || "Not given"}`,
      `Plan: ${form.plan || "Not chosen"}`,
      form.message && `Message: ${form.message}`,
    ]
      .filter(Boolean)
      .join("\n");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) {
      setTried(true);
      return;
    }
    if (!hasServer) {
      setState("fallback");
      return;
    }
    setState("sending");
    try {
      await api("POST", "/leads", {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim(),
        makes: industries.find((i) => i.slug === form.sector)?.name ?? "",
        sellWhen: form.ship,
        plan: form.plan,
        notes: form.message.trim(),
        source,
        website: form.website,
      });
      setState("sent");
    } catch (err) {
      setState(err instanceof ApiError && err.status === 429 ? "limited" : "error");
    }
  };

  if (state === "sent") {
    return (
      <div className="lead-done">
        <h3>Thanks, {form.name.split(" ")[0]}.</h3>
        <p>A security expert will reply to {form.email} within one working day.</p>
      </div>
    );
  }

  return (
    <form className="lead-form" onSubmit={submit} noValidate>
      <TextField id={`lead-name-${source}`} label="Your name" required value={form.name} onChange={set("name")} />
      <TextField id={`lead-email-${source}`} label="Work email" required type="email" value={form.email} onChange={set("email")} />
      <TextField id={`lead-company-${source}`} label="Company" required value={form.company} onChange={set("company")} />
      <SelectField
        id={`lead-sector-${source}`}
        label="What you make"
        value={form.sector}
        options={[{ value: "", label: "Choose…" }, ...industries.map((i) => ({ value: i.slug, label: i.name }))]}
        onChange={set("sector")}
      />
      <SelectField
        id={`lead-ship-${source}`}
        label="When do you (or will you) sell in the EU?"
        value={form.ship}
        options={[
          { value: "", label: "Choose…" },
          { value: "Already selling", label: "Already selling" },
          { value: "Within 12 months", label: "Within 12 months" },
          { value: "Later", label: "Later" },
        ]}
        onChange={set("ship")}
      />
      <SelectField
        id={`lead-plan-${source}`}
        label="Plan you're interested in"
        value={form.plan}
        options={[
          { value: "", label: "Not sure yet" },
          { value: "Starter", label: "Starter, €149/mo" },
          { value: "Team", label: "Team, €499/mo" },
          { value: "Guided", label: "Guided, from €6k" },
        ]}
        onChange={set("plan")}
      />
      {/* Honeypot for bots: hidden from people and assistive technology, never filled by a person. */}
      <div className="visually-hidden" aria-hidden="true">
        <label htmlFor={`lead-website-${source}`}>Website</label>
        <input id={`lead-website-${source}`} name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set("website")(e.target.value)} />
      </div>
      <div className="span-2">
        <AreaField id={`lead-msg-${source}`} label="Anything we should know? (optional)" rows={2} value={form.message} onChange={set("message")} />
      </div>
      <div className="span-2 row">
        <button type="submit" className="btn btn-primary" disabled={state === "sending"}>
          {state === "sending" ? "Sending…" : "Request early access"}
        </button>
        {tried && !valid && (
          <span className="form-error" role="alert">
            Add your name, a work email and your company to send this.
          </span>
        )}
      </div>
      {state === "error" && <p className="span-2 note-line">That didn't go through. Email {site.contactEmail} instead, or try again.</p>}
      {state === "limited" && <p className="span-2 note-line">We've had several requests from your network in the last hour. Email {site.contactEmail} and we'll reply within one working day.</p>}
      {state === "fallback" && (
        <div className="span-2 note-line lead-fallback">
          <p>
            Online sign-up isn't connected yet. Send these details to <strong className="code">{site.contactEmail}</strong> and we'll reply within one
            working day.
          </p>
          <CopyButton label="Copy my details" getText={summary} />
        </div>
      )}
    </form>
  );
}
