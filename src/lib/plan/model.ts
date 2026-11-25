import { industryBySlug } from "@/content/industries";
import type { CraClass } from "@/content/types";
import type { AnswerStatus } from "@/lib/assessment-score";
import type { ProductType } from "@/lib/cra-requirements";

export const interfaceOptions = [
  "Wi-Fi",
  "Bluetooth",
  "Cellular",
  "Ethernet",
  "Zigbee / Thread / Matter",
  "NFC",
  "USB",
  "Debug port (JTAG / UART)",
  "Local web UI",
  "Local API",
  "Mobile app",
  "Cloud API",
  "Over-the-air updates",
] as const;

export const dataOptions = [
  "User credentials",
  "Personal data",
  "Location",
  "Audio or video",
  "Health data",
  "Payment data",
  "Device telemetry",
  "Configuration and keys",
] as const;

export const practiceOptions = [
  "Threat modelling for new features",
  "Static analysis (SAST) in CI",
  "Dependency scanning (SCA) in CI",
  "Secret scanning",
  "Peer code review for every change",
  "Signed builds and releases",
  "Reproducible or controlled build environment",
  "Security training for developers",
] as const;

export const euMemberStates = [
  "Austria", "Belgium", "Bulgaria", "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany",
  "Greece", "Hungary", "Ireland", "Italy", "Latvia", "Lithuania", "Luxembourg", "Malta", "Netherlands", "Poland",
  "Portugal", "Romania", "Slovakia", "Slovenia", "Spain", "Sweden",
] as const;

export type Interface = (typeof interfaceOptions)[number];
export type DataKind = (typeof dataOptions)[number];
export type Practice = (typeof practiceOptions)[number];

export type Component = {
  id: string;
  name: string;
  kind: "firmware" | "software" | "cloud" | "hardware" | "third-party";
  version: string;
  supplier: string;
  internetFacing: boolean;
};

export type Risk = {
  id: string;
  threat: string;
  asset: string;
  likelihood: 1 | 2 | 3;
  impact: 1 | 2 | 3;
  treatment: "mitigate" | "accept" | "transfer" | "avoid";
  control: string;
  requirementId?: string;
  owner: string;
  acceptedBy: string;
  reviewBy: string;
  include: boolean;
  custom?: boolean;
};

export type ControlEntry = { status?: AnswerStatus; how: string; evidence: string };

export type Revision = { rev: string; date: string; summary: string; hash: string; approver: string };

export type Plan = {
  schema: 1;
  product: {
    name: string;
    version: string;
    manufacturer: string;
    purpose: string;
    users: "consumers" | "business" | "both";
    types: ProductType[];
    industry: string;
    craClass: CraClass;
    marketDate: string;
    supportEnd: string;
    supportJustification: string;
    radio: boolean;
  };
  components: Component[];
  interfaces: Interface[];
  data: DataKind[];
  risks: Risk[];
  controls: Record<string, ControlEntry>;
  sdlc: {
    practices: Practice[];
    sbomFormat: "CycloneDX" | "SPDX" | "none";
    sbomLocation: string;
    releaseGate: boolean;
    penTestCadence: "annual" | "major-release" | "none";
    lastPenTest: string;
  };
  vulns: {
    contact: string;
    policyUrl: string;
    securityTxt: boolean;
    slaDays: { critical: number; high: number; medium: number; low: number };
    advisoryChannel: string;
  };
  updates: {
    mechanism: string;
    autoUpdateDefault: boolean;
    signed: boolean;
    separateSecurityUpdates: boolean;
    reportingOwner: string;
    reportingBackup: string;
    csirtCountry: string;
    srpRegistered: boolean;
    userNotification: string;
  };
  roles: { securityLead: string; engineeringLead: string; productOwner: string; legalContact: string };
  revisions: Revision[];
};

export function emptyPlan(): Plan {
  return {
    schema: 1,
    product: {
      name: "",
      version: "",
      manufacturer: "",
      purpose: "",
      users: "consumers",
      types: [],
      industry: "",
      craClass: "default",
      marketDate: "",
      supportEnd: "",
      supportJustification: "",
      radio: false,
    },
    components: [],
    interfaces: [],
    data: [],
    risks: [],
    controls: {},
    sdlc: { practices: [], sbomFormat: "none", sbomLocation: "", releaseGate: false, penTestCadence: "none", lastPenTest: "" },
    vulns: { contact: "", policyUrl: "", securityTxt: false, slaDays: { critical: 7, high: 30, medium: 90, low: 180 }, advisoryChannel: "" },
    updates: {
      mechanism: "",
      autoUpdateDefault: false,
      signed: false,
      separateSecurityUpdates: false,
      reportingOwner: "",
      reportingBackup: "",
      csirtCountry: "",
      srpRegistered: false,
      userNotification: "",
    },
    roles: { securityLead: "", engineeringLead: "", productOwner: "", legalContact: "" },
    revisions: [],
  };
}

export function applyIndustry(plan: Plan, slug: string): Plan {
  const industry = industryBySlug(slug);
  if (!industry) return { ...plan, product: { ...plan.product, industry: "" } };
  return {
    ...plan,
    product: {
      ...plan.product,
      industry: slug,
      craClass: industry.craClass,
      types: plan.product.types.length ? plan.product.types : [...industry.productTypes],
      radio: plan.product.radio || industry.productTypes.includes("hardware"),
    },
  };
}

export function addYears(isoDate: string, years: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d.toISOString().slice(0, 10);
}

export function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function examplePlan(): Plan {
  const plan = applyIndustry(emptyPlan(), "smart-home");
  return {
    ...plan,
    product: {
      ...plan.product,
      name: "Example thermostat",
      version: "2.4",
      manufacturer: "Example Devices Ltd",
      purpose:
        "Wall-mounted thermostat that controls home heating. Users set schedules from a mobile app; the device works offline and syncs with our cloud service when connected.",
      users: "consumers",
      types: ["hardware", "firmware", "cloud", "software"],
      marketDate: "2027-09-01",
      supportEnd: "2032-09-01",
      radio: true,
    },
    components: [
      { id: "c-fw", name: "Thermostat firmware", kind: "firmware", version: "2.4.0", supplier: "In-house", internetFacing: true },
      { id: "c-rtos", name: "RTOS and Wi-Fi stack", kind: "third-party", version: "10.5", supplier: "Chip vendor SDK", internetFacing: true },
      { id: "c-app", name: "Mobile app (iOS, Android)", kind: "software", version: "3.1", supplier: "In-house", internetFacing: true },
      { id: "c-cloud", name: "Device cloud API", kind: "cloud", version: "2026.11", supplier: "In-house", internetFacing: true },
    ],
    interfaces: ["Wi-Fi", "Bluetooth", "Mobile app", "Cloud API", "Over-the-air updates", "Debug port (JTAG / UART)"],
    data: ["User credentials", "Personal data", "Location", "Device telemetry", "Configuration and keys"],
    sdlc: {
      practices: ["Static analysis (SAST) in CI", "Dependency scanning (SCA) in CI", "Peer code review for every change", "Signed builds and releases"],
      sbomFormat: "CycloneDX",
      sbomLocation: "Generated in CI, stored with each release artifact",
      releaseGate: true,
      penTestCadence: "major-release",
      lastPenTest: "",
    },
    vulns: {
      contact: "security@example.com",
      policyUrl: "",
      securityTxt: false,
      slaDays: { critical: 7, high: 30, medium: 90, low: 180 },
      advisoryChannel: "",
    },
    updates: {
      mechanism: "Signed OTA images delivered from the device cloud with A/B partitions",
      autoUpdateDefault: true,
      signed: true,
      separateSecurityUpdates: true,
      reportingOwner: "Head of Engineering",
      reportingBackup: "",
      csirtCountry: "Germany",
      srpRegistered: false,
      userNotification: "In-app notification and email",
    },
    roles: { securityLead: "Head of Engineering", engineeringLead: "Firmware lead", productOwner: "Product manager", legalContact: "" },
    controls: exampleControls(),
  };
}

function exampleControls(): Plan["controls"] {
  const done = (how: string, evidence = ""): ControlEntry => ({ status: "done", how, evidence });
  const partial = (how: string): ControlEntry => ({ status: "partial", how, evidence: "" });
  const missing: ControlEntry = { status: "missing", how: "", evidence: "" };
  return {
    "risk-assessment": partial("Threat model drafted for the device; cloud backend not yet covered."),
    "secure-by-design": done("Security requirements are tickets in the same backlog and reviewed at design review.", "Design review checklist DR-03"),
    "no-known-vulns": done("SAST and SCA gate every release; critical and high findings block the build.", "CI pipeline config, release gate records"),
    "supply-chain": partial("Chip vendor SDK reviewed; no written supplier criteria yet."),
    "secure-defaults": done("Unique per-device password printed on label; setup forces change.", "TEST-011 factory provisioning test"),
    "authn-authz": done("App login with optional MFA; device API requires per-device token.", "Pen test report PT-2026-04"),
    confidentiality: done("TLS 1.3 to cloud; credentials stored in secure element.", "Architecture doc ARCH-2"),
    integrity: done("Signed firmware and signed configuration from cloud.", "ARCH-2 section 4"),
    "data-minimisation": partial("Telemetry reduced; retention period not yet defined."),
    "data-removal": done("Factory reset wipes user data and keys.", "TEST-019"),
    "attack-surface": partial("Unused services removed; UART still reachable on production board."),
    "network-api": done("Local API disabled by default; cloud API authenticated and rate-limited.", "PT-2026-04"),
    "exploit-mitigation": done("Stack protection and MPU enabled in RTOS build.", "Build flags in firmware repo"),
    "secure-boot": done("Secure boot with hardware root of trust.", "Chip vendor secure boot guide, TEST-002"),
    tamper: { status: "na", how: "Low-value consumer device; risk assessment rates physical tampering low.", evidence: "" },
    availability: done("Watchdog and offline mode keep heating schedules running.", "TEST-030"),
    logging: partial("Cloud logs access; device keeps only a small local event log."),
    sbom: done("CycloneDX SBOM generated in CI for every release.", "SBOM artifacts per release"),
    "vuln-remediation": partial("Triage owner named; fix timelines not yet published."),
    "security-testing": done("Pen test at each major release; release gate per release.", "PT-2026-04"),
    "cvd-policy": missing,
    advisories: missing,
    "secure-updates": done("Signed OTA with A/B partitions and rollback protection.", "TEST-005"),
    "patch-delivery": done("Hotfix branch can ship security-only updates within days.", "Release process doc REL-1"),
    "support-period": done("Support until September 2032, stated on packaging and website.", "Product page"),
    "change-management": done("Configuration in git, changes via reviewed pull requests.", "Repo settings"),
    "incident-reporting": partial("Owner named; not yet registered on ENISA SRP."),
    "incident-response": partial("Incident plan drafted; no exercise yet."),
    "technical-docs": partial("This plan in progress."),
    "user-info": done("Quick-start and online manual include security setup and support end date.", "Manual v2.4"),
    conformity: done("Default category: internal control (Module A) planned.", ""),
  };
}
