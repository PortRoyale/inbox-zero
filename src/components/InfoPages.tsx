import { PageHero } from "@/components/PageHero";
import { SpecTable } from "@/components/structure";
import { paths } from "@/lib/paths";
import { site } from "@/lib/site";

// Tools hub, trust centre and legal pages. Server-renderable (no client state).

type ToolRow = { tool: string; href: string; does: string; time: string; data: string; color: string };

export function ToolsHub() {
  const rows: ToolRow[] = [
    { tool: "Security plan builder", href: paths.plan, does: "Eight steps to your technical documentation, risk assessment and dated action plan.", time: "1 to 2 hours", data: "Your browser", color: "plan" },
    { tool: "Readiness check", href: paths.assessment, does: "31 essential requirements, one question at a time, with a scored report.", time: "10 minutes", data: "Your browser", color: "readiness" },
    { tool: "Release gate", href: paths.releaseGate, does: "Decides each release's security testing from what changed; writes the record.", time: "2 minutes", data: "Your browser", color: "gate" },
    { tool: "SBOM check", href: paths.sbomCheck, does: "Scores your SBOM's quality and lists known vulnerabilities in its components.", time: "1 minute", data: "Scored in your browser; package IDs looked up", color: "gate" },
    { tool: "Incident clock", href: paths.incidentClock, does: "Every Article 14 deadline from the moment you became aware, with report drafts.", time: "As it happens", data: "Your browser", color: "gate" },
    { tool: "Sector and country briefs", href: paths.brief, does: "Your product class, deadlines and where to report, for 14 sectors and 39 countries.", time: "2 minutes", data: "None needed", color: "briefs" },
    { tool: "Verify a signed record", href: paths.verify, does: "Checks a signed plan revision or evidence export against our public keys.", time: "Seconds", data: "Statement only", color: "plan" },
  ];
  return (
    <div className="wrap stack" data-tool="plan">
      <PageHero
        id="tools-title"
        tool="plan"
        motif="network"
        seed={43}
        label="Free tools"
        cells={[`${rows.length} tools`, "No account needed"]}
        title="Free CRA tools"
        lead="Everything you need to start, free and without an account. Sign up when you want plans saved, SBOMs watched and records signed for your team."
      />
      <section className="sheet stack-sm">
        <SpecTable
          numbered
          rows={rows}
          rowKey={(r) => r.tool}
          cols={[
            { key: "t", label: "Tool", head: true, width: "24%", render: (r) => <a href={r.href}>{r.tool}</a> },
            { key: "d", label: "What it does", render: (r) => r.does },
            { key: "time", label: "Time", width: "9rem", code: true, render: (r) => r.time },
            { key: "data", label: "Where your data goes", width: "15rem", render: (r) => <span className="muted">{r.data}</span> },
          ]}
        />
      </section>
    </div>
  );
}

const crypto = [
  { what: "Data at rest", how: "AES-256-GCM per record; each data key is wrapped with a key derived (HKDF-SHA-512) from a master key and an ML-KEM-1024 shared secret. Records are bound to their place, so ciphertext cannot be moved between records.", std: "FIPS 197, FIPS 203" },
  { what: "Signatures", how: "Plan revisions and evidence exports carry two signatures, Ed25519 and ML-DSA-65. A record is valid only if both verify, so it stays trustworthy if either algorithm is broken.", std: "RFC 8032, FIPS 204" },
  { what: "Fingerprints", how: "SHA-512 over canonical JSON of the plan's content; the browser and server compute the same digest.", std: "FIPS 180-4" },
  { what: "Passwords", how: "scrypt (N 32768, r 8, p 1) over HMAC-SHA-512 with a server pepper. Locked after repeated failures; unknown accounts take the same time to answer.", std: "RFC 7914" },
  { what: "Sessions and links", how: "Random 256-bit tokens, stored only as SHA-512 digests. HttpOnly, SameSite cookies; single-use email links that expire.", std: "" },
  { what: "Email addresses", how: "Stored encrypted; looked up by keyed HMAC, so the database alone does not reveal who our customers are.", std: "" },
  { what: "In transit", how: "TLS 1.3 only at the edge, with hybrid post-quantum key exchange (X25519 + ML-KEM-768) preferred.", std: "RFC 8446" },
];

const controls = [
  { what: "Team isolation", how: "Every product request checks team membership; other teams' records return not found, so ids cannot be probed." },
  { what: "Roles", how: "Owner, admin, approver, editor and viewer, enforced on the server for every action." },
  { what: "Web protections", how: "Strict per-request Content Security Policy on signed-in pages, origin checks on every change, JSON-only APIs with size limits, rate limits on sign-in, sign-up and public tools." },
  { what: "Audit log", how: "Every change to teams, plans, revisions, releases, SBOMs, incidents and billing is recorded, visible to admins." },
  { what: "Payments", how: "Card details go straight to our payment processor (Finix or Stripe) on their hosted page; we never see them. Webhooks are signature-checked and applied exactly once." },
  { what: "Dependencies", how: "Three runtime packages (Next.js and React). No analytics, no trackers, no third-party scripts." },
  { what: "Your data", how: "Export everything as JSON at any time; delete your account and sole-owner teams from account settings." },
];

export function TrustCentre() {
  return (
    <div className="wrap stack" data-tool="plan">
      <PageHero
        id="security-title"
        tool="plan"
        motif="shield"
        seed={47}
        label="Trust centre"
        cells={["Post-quantum", "Zero trackers"]}
        title="How we protect your compliance data"
        lead="Your security plan describes your weak points, so we protect it like one. Here is exactly how, with the standards behind each choice."
      />
      <section className="sheet stack-sm">
        <h2>Cryptography</h2>
        <SpecTable
          rows={crypto}
          rowKey={(r) => r.what}
          cols={[
            { key: "w", label: "Area", head: true, width: "13rem", render: (r) => r.what },
            { key: "h", label: "How", render: (r) => r.how },
            { key: "s", label: "Standard", width: "10rem", code: true, render: (r) => r.std || "None" },
          ]}
        />
      </section>
      <section className="sheet stack-sm">
        <h2>Application controls</h2>
        <SpecTable
          rows={controls}
          rowKey={(r) => r.what}
          cols={[
            { key: "w", label: "Control", head: true, width: "13rem", render: (r) => r.what },
            { key: "h", label: "How", render: (r) => r.how },
          ]}
        />
      </section>
      <section className="sheet stack-sm">
        <h2>Verify and report</h2>
        <SpecTable
          rows={[
            { what: "Public signing keys", link: "/api/keys/", text: "Ed25519 and ML-DSA-65 keys in PEM, with key id" },
            { what: "Verify a record", link: paths.verify, text: "Check any signed revision or evidence export" },
            { what: "Report a vulnerability", link: `mailto:${site.contactEmail}`, text: `${site.contactEmail}; we follow coordinated disclosure and reply within two working days` },
            { what: "security.txt", link: "/.well-known/security.txt", text: "Machine-readable contact and policy (RFC 9116)" },
          ]}
          rowKey={(r) => r.what}
          cols={[
            { key: "w", label: "What", head: true, width: "13rem", render: (r) => <a href={r.link}>{r.what}</a> },
            { key: "t", label: "Details", render: (r) => r.text },
          ]}
        />
      </section>
    </div>
  );
}

export function LegalPage({ kind }: { kind: "terms" | "privacy" }) {
  const terms = [
    { h: "The service", b: `${site.name} provides software and guidance to help you prepare for the EU Cyber Resilience Act. It is not legal advice, a conformity assessment or a certificate.` },
    { h: "Accounts", b: "Keep your password safe and tell us about any misuse. Team owners decide who can access their team's data." },
    { h: "Plans and payment", b: "Paid plans are billed in advance through our payment processor. Prepaid plans run for the period paid; subscriptions renew until cancelled. If a plan ends, your workspace becomes read-only; you can always read, export and delete your data." },
    { h: "Your data", b: "You own the content you put in. We process it only to provide the service, as described in the privacy notice." },
    { h: "Acceptable use", b: "Do not attack the service, probe other customers' data or use it to break the law. Security research is welcome under our disclosure policy." },
    { h: "Liability", b: "We provide the service with reasonable care and skill. To the extent the law allows, our liability is limited to the fees you paid in the previous twelve months." },
    { h: "Changes", b: "We will give at least 30 days' notice of material changes to these terms." },
  ];
  const privacy = [
    { h: "Who we are", b: `${site.name}, contact ${site.contactEmail}.` },
    { h: "What we collect", b: "Account details (name, work email, company), the content you enter, technical logs needed for security, and billing records from our payment processor. We do not use analytics or advertising trackers." },
    { h: "Why", b: "To provide the service you signed up for (contract), to keep it secure (legitimate interest) and to meet legal duties such as tax records." },
    { h: "Where", b: "On our servers in the EU, encrypted at rest. Email delivery and payments use processors under data processing agreements." },
    { h: "How long", b: "While your account exists; deleted when you delete it, except billing records kept for the period tax law requires." },
    { h: "Your rights", b: "Access, export, correct and delete your data from account settings, or email us. You can complain to your data protection authority." },
  ];
  const rows = kind === "terms" ? terms : privacy;
  return (
    <div className="wrap stack" data-tool="plan">
      <PageHero id="legal-title" tool="plan" motif="document" seed={53} label={kind === "terms" ? "Terms" : "Privacy"} cells={["Draft for review"]} title={kind === "terms" ? "Terms of service" : "Privacy notice"} lead="Plain-language summary. Have counsel review before launch." />
      <section className="sheet stack-sm">
        <SpecTable
          numbered
          rows={rows}
          rowKey={(r) => r.h}
          cols={[
            { key: "h", label: "Topic", head: true, width: "13rem", render: (r) => r.h },
            { key: "b", label: "What it means", render: (r) => r.b },
          ]}
        />
      </section>
    </div>
  );
}
