import type { DataKind, Interface, Plan, Risk } from "@/lib/plan/model";

type Template = Omit<Risk, "id" | "owner" | "acceptedBy" | "reviewBy" | "include" | "treatment"> & {
  key: string;
  when: { interfaces?: Interface[]; data?: DataKind[]; always?: boolean; hardware?: boolean };
};

const templates: Template[] = [
  {
    key: "default-credentials",
    threat: "Attacker logs in with default or shared credentials",
    asset: "Device administration",
    likelihood: 3,
    impact: 3,
    control: "Unique per-device credentials or forced setup on first use",
    requirementId: "secure-defaults",
    when: { always: true },
  },
  {
    key: "vuln-components",
    threat: "Known vulnerability in a third-party or open-source component is exploited",
    asset: "Whole product",
    likelihood: 3,
    impact: 3,
    control: "SBOM per release, SCA in CI, monitoring of new CVEs against the SBOM",
    requirementId: "sbom",
    when: { always: true },
  },
  {
    key: "malicious-update",
    threat: "Malicious or tampered update is installed",
    asset: "Firmware and software integrity",
    likelihood: 2,
    impact: 3,
    control: "Signed updates verified before install, with rollback protection",
    requirementId: "secure-updates",
    when: { interfaces: ["Over-the-air updates", "USB"], always: true },
  },
  {
    key: "radio-pairing",
    threat: "Nearby attacker pairs with or hijacks the device over radio",
    asset: "Device control",
    likelihood: 2,
    impact: 2,
    control: "Authenticated pairing with user confirmation; pairing window limited in time",
    requirementId: "authn-authz",
    when: { interfaces: ["Bluetooth", "Zigbee / Thread / Matter", "NFC"] },
  },
  {
    key: "network-service",
    threat: "Exposed network service or local API is abused without authentication",
    asset: "Device control and data",
    likelihood: 2,
    impact: 3,
    control: "Authenticate every API call; close unused ports; rate-limit",
    requirementId: "network-api",
    when: { interfaces: ["Local API", "Local web UI", "Ethernet", "Wi-Fi", "Cellular"] },
  },
  {
    key: "cloud-takeover",
    threat: "User account in the cloud service is taken over",
    asset: "User accounts and remote control",
    likelihood: 3,
    impact: 2,
    control: "Strong authentication, MFA option, credential-stuffing protection",
    requirementId: "authn-authz",
    when: { interfaces: ["Cloud API", "Mobile app"] },
  },
  {
    key: "fleet-compromise",
    threat: "Cloud backend compromise lets an attacker control every device at once",
    asset: "Device fleet",
    likelihood: 1,
    impact: 3,
    control: "Least-privilege backend, signed device commands, monitoring and alerting",
    requirementId: "integrity",
    when: { interfaces: ["Cloud API"] },
  },
  {
    key: "debug-port",
    threat: "Physical access through debug port extracts firmware or keys",
    asset: "Firmware and keys",
    likelihood: 2,
    impact: 2,
    control: "Debug interfaces disabled or locked in production units",
    requirementId: "attack-surface",
    when: { interfaces: ["Debug port (JTAG / UART)", "USB"] },
  },
  {
    key: "data-intercept",
    threat: "Personal or sensitive data is intercepted in transit or read from storage",
    asset: "Personal data",
    likelihood: 2,
    impact: 3,
    control: "TLS 1.2+ for all traffic; encryption at rest for sensitive data",
    requirementId: "confidentiality",
    when: { data: ["Personal data", "Location", "Audio or video", "Health data", "Payment data", "User credentials"] },
  },
  {
    key: "key-extraction",
    threat: "Cryptographic keys are extracted and reused across devices",
    asset: "Keys and certificates",
    likelihood: 2,
    impact: 3,
    control: "Per-device keys in protected storage; no shared secrets in firmware images",
    requirementId: "confidentiality",
    when: { data: ["Configuration and keys"] },
  },
  {
    key: "dos",
    threat: "Denial of service stops the product's essential function",
    asset: "Availability",
    likelihood: 2,
    impact: 2,
    control: "Rate limiting, watchdogs, safe fallback when offline",
    requirementId: "availability",
    when: { always: true },
  },
  {
    key: "late-response",
    threat: "Actively exploited vulnerability is not reported within 24 hours",
    asset: "Regulatory compliance",
    likelihood: 2,
    impact: 3,
    control: "Named reporting owner and backup, SRP account ready, rehearsed runbook",
    requirementId: "incident-reporting",
    when: { always: true },
  },
  {
    key: "leftover-data",
    threat: "Data remains on a device after resale or disposal",
    asset: "Personal data",
    likelihood: 2,
    impact: 2,
    control: "Factory reset that securely erases all user data and settings",
    requirementId: "data-removal",
    when: { data: ["Personal data", "User credentials", "Location", "Health data"] },
  },
];

export function suggestRisks(plan: Plan): Risk[] {
  if (plan.product.types.length === 0) return plan.risks.filter((r) => r.custom);
  const hardware = plan.product.types.includes("hardware");
  const existing = new Map(plan.risks.map((r) => [r.id, r]));
  const suggested = templates
    .filter(
      (t) =>
        t.when.always ||
        (t.when.hardware && hardware) ||
        t.when.interfaces?.some((i) => plan.interfaces.includes(i)) ||
        t.when.data?.some((d) => plan.data.includes(d)),
    )
    .map<Risk>((t) => {
      const id = `r-${t.key}`;
      const prior = existing.get(id);
      if (prior) return prior;
      return {
        id,
        threat: t.threat,
        asset: t.asset,
        likelihood: t.likelihood,
        impact: t.impact,
        control: t.control,
        requirementId: t.requirementId,
        treatment: "mitigate",
        owner: "",
        acceptedBy: "",
        reviewBy: "",
        include: true,
      };
    });
  const custom = plan.risks.filter((r) => r.custom);
  return [...suggested, ...custom];
}

export function riskScore(r: Pick<Risk, "likelihood" | "impact">) {
  return r.likelihood * r.impact;
}

export function riskLevel(score: number) {
  if (score >= 6) return "high" as const;
  if (score >= 3) return "medium" as const;
  return "low" as const;
}
