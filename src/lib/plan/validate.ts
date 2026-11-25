import type { AnswerStatus } from "@/lib/assessment-score";
import { productTypes, type ProductType } from "@/lib/cra-requirements";
import { dataOptions, emptyPlan, interfaceOptions, practiceOptions, type Plan } from "@/lib/plan/model";

// Coerces untrusted JSON (a saved file, an API body) into a well-formed Plan. Unknown keys are dropped,
// strings are capped, enums are checked and missing parts take empty defaults. Never throws on shape.

const STR = 4000;
const SHORT = 300;

type Obj = Record<string, unknown>;
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
const str = (v: unknown, max = SHORT) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").slice(0, max) : "");
const bool = (v: unknown) => v === true;
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);
const list = <T>(v: unknown, max: number, item: (x: unknown) => T | null): T[] => (Array.isArray(v) ? v.slice(0, max).map(item).filter((x): x is T => x !== null) : []);
const pick = <T extends string>(v: unknown, allowed: readonly T[]) => [...new Set(list(v, allowed.length, (x) => (allowed.includes(x as T) ? (x as T) : null)))];
const int = (v: unknown, min: number, max: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback);
const date = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
const scale = (v: unknown) => (v === 1 || v === 2 || v === 3 ? v : 2);
const id = (v: unknown, fallback: string) => (typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : fallback);

const STATUSES: readonly AnswerStatus[] = ["done", "partial", "missing", "na"];
const TYPES = productTypes.map((t) => t.id) as ProductType[];

export function coercePlan(input: unknown): Plan {
  const base = emptyPlan();
  const i = obj(input);
  const p = obj(i.product);
  const sdlc = obj(i.sdlc);
  const vulns = obj(i.vulns);
  const sla = obj(vulns.slaDays);
  const updates = obj(i.updates);
  const roles = obj(i.roles);

  const controls: Plan["controls"] = {};
  for (const [key, value] of Object.entries(obj(i.controls)).slice(0, 200)) {
    if (!/^[a-z0-9-]{1,64}$/.test(key)) continue;
    const c = obj(value);
    controls[key] = { status: STATUSES.includes(c.status as AnswerStatus) ? (c.status as AnswerStatus) : undefined, how: str(c.how, STR), evidence: str(c.evidence, 1000) };
  }

  return {
    schema: 1,
    product: {
      name: str(p.name, 200),
      version: str(p.version, 80),
      manufacturer: str(p.manufacturer, 400),
      purpose: str(p.purpose, STR),
      users: oneOf(p.users, ["consumers", "business", "both"] as const, base.product.users),
      types: pick(p.types, TYPES),
      industry: str(p.industry, 80),
      craClass: oneOf(p.craClass, ["default", "important-1", "important-2", "critical"] as const, base.product.craClass),
      marketDate: date(p.marketDate),
      supportEnd: date(p.supportEnd),
      supportJustification: str(p.supportJustification, STR),
      radio: bool(p.radio),
      redAssessed: bool(p.redAssessed),
      soldInUk: bool(p.soldInUk),
      pstiStatement: bool(p.pstiStatement),
    },
    components: list(i.components, 100, (x) => {
      const c = obj(x);
      return {
        id: id(c.id, `c-${Math.random().toString(36).slice(2, 10)}`),
        name: str(c.name, 200),
        kind: oneOf(c.kind, ["firmware", "software", "cloud", "hardware", "third-party"] as const, "software"),
        version: str(c.version, 80),
        supplier: str(c.supplier, 200),
        internetFacing: bool(c.internetFacing),
      };
    }),
    interfaces: pick(i.interfaces, interfaceOptions),
    data: pick(i.data, dataOptions),
    risks: list(i.risks, 200, (x) => {
      const r = obj(x);
      return {
        id: id(r.id, `r-${Math.random().toString(36).slice(2, 10)}`),
        threat: str(r.threat, 600),
        asset: str(r.asset, 200),
        likelihood: scale(r.likelihood),
        impact: scale(r.impact),
        treatment: oneOf(r.treatment, ["mitigate", "accept", "transfer", "avoid"] as const, "mitigate"),
        control: str(r.control, 1000),
        requirementId: typeof r.requirementId === "string" ? str(r.requirementId, 64) : undefined,
        owner: str(r.owner, 200),
        acceptedBy: str(r.acceptedBy, 200),
        reviewBy: date(r.reviewBy),
        include: r.include !== false,
        custom: r.custom === true ? true : undefined,
      };
    }),
    controls,
    sdlc: {
      practices: pick(sdlc.practices, practiceOptions),
      sbomFormat: oneOf(sdlc.sbomFormat, ["CycloneDX", "SPDX", "none"] as const, base.sdlc.sbomFormat),
      sbomLocation: str(sdlc.sbomLocation, 400),
      releaseGate: bool(sdlc.releaseGate),
      penTestCadence: oneOf(sdlc.penTestCadence, ["annual", "major-release", "none"] as const, base.sdlc.penTestCadence),
      lastPenTest: date(sdlc.lastPenTest),
    },
    vulns: {
      contact: str(vulns.contact, 254),
      policyUrl: str(vulns.policyUrl, 500),
      securityTxt: bool(vulns.securityTxt),
      slaDays: {
        critical: int(sla.critical, 0, 365, base.vulns.slaDays.critical),
        high: int(sla.high, 0, 365, base.vulns.slaDays.high),
        medium: int(sla.medium, 0, 365, base.vulns.slaDays.medium),
        low: int(sla.low, 0, 365, base.vulns.slaDays.low),
      },
      advisoryChannel: str(vulns.advisoryChannel, 500),
    },
    updates: {
      mechanism: str(updates.mechanism, STR),
      autoUpdateDefault: bool(updates.autoUpdateDefault),
      signed: bool(updates.signed),
      separateSecurityUpdates: bool(updates.separateSecurityUpdates),
      reportingOwner: str(updates.reportingOwner, 200),
      reportingBackup: str(updates.reportingBackup, 200),
      csirtCountry: str(updates.csirtCountry, 80),
      srpRegistered: bool(updates.srpRegistered),
      userNotification: str(updates.userNotification, 1000),
    },
    roles: {
      securityLead: str(roles.securityLead, 200),
      engineeringLead: str(roles.engineeringLead, 200),
      productOwner: str(roles.productOwner, 200),
      legalContact: str(roles.legalContact, 200),
    },
    revisions: list(i.revisions, 200, (x) => {
      const r = obj(x);
      const rev = str(r.rev, 3);
      return /^[A-Z]{1,3}$/.test(rev)
        ? { rev, date: date(r.date), summary: str(r.summary, 1000), hash: /^[0-9a-f]{64,128}$/.test(String(r.hash)) ? String(r.hash) : "", approver: str(r.approver, 200) }
        : null;
    }),
  };
}
