export const productTypes = [
  { id: "software", label: "Software / app", hint: "Installed or downloadable software, mobile or desktop apps" },
  { id: "firmware", label: "Firmware", hint: "Code running on a device you make or ship" },
  { id: "hardware", label: "Hardware device", hint: "Physical, connected product" },
  { id: "cloud", label: "Companion cloud backend", hint: "Remote data processing your product needs to work" },
] as const;

export type ProductType = (typeof productTypes)[number]["id"];

export const categories = [
  { id: "design", label: "Secure design & risk" },
  { id: "access", label: "Access & data protection" },
  { id: "hardening", label: "Hardening & resilience" },
  { id: "vulns", label: "Vulnerability handling" },
  { id: "updates", label: "Updates & lifecycle" },
  { id: "docs", label: "Documentation & reporting" },
] as const;

export type CategoryId = (typeof categories)[number]["id"];

export type Priority = "critical" | "high" | "standard";

export type Requirement = {
  id: string;
  title: string;
  question: string;
  guidance: string;
  craRef: string;
  category: CategoryId;
  priority: Priority;
  appliesTo: readonly ProductType[];
};

const ALL: readonly ProductType[] = ["software", "firmware", "hardware", "cloud"];

export const requirements: Requirement[] = [
  {
    id: "risk-assessment",
    title: "Cybersecurity risk assessment",
    question: "Have you documented a cybersecurity risk assessment (threat model) for this product?",
    guidance:
      "The CRA expects every security decision to trace back to a documented risk assessment. Start with a threat model of entry points, assets and trust boundaries, then record which controls address which risks.",
    craRef: "Art. 13(2)–(3); Annex I Part I(1)",
    category: "design",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "secure-by-design",
    title: "Security built into design",
    question: "Are security requirements defined and reviewed at design time, not added after development?",
    guidance:
      "Capture security requirements in the same backlog as features and review new designs for security before build starts.",
    craRef: "Annex I Part I(1)",
    category: "design",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "no-known-vulns",
    title: "No known exploitable vulnerabilities at release",
    question: "Do you check that each release ships with no known exploitable vulnerabilities?",
    guidance:
      "Gate releases on static analysis (SAST) and open-source composition analysis (SCA). Critical and high findings need a fix or a documented, approved exception.",
    craRef: "Annex I Part I(2)(a)",
    category: "design",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "supply-chain",
    title: "Third-party component diligence",
    question: "Do you vet third-party and open-source components and their suppliers before using them?",
    guidance:
      "Exercise due diligence on components you integrate: maintenance status, known vulnerabilities, licence, and where you got them from.",
    craRef: "Art. 13(5)",
    category: "design",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "secure-defaults",
    title: "Secure default configuration",
    question: "Does the product ship secure by default, with no shared or default passwords and a way to reset to a secure state?",
    guidance:
      "Unique credentials per device or forced first-use setup, unnecessary features off by default, and a documented factory-reset path.",
    craRef: "Annex I Part I(2)(b)",
    category: "hardening",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "authn-authz",
    title: "Authentication & access control",
    question: "Is access protected by strong authentication and least-privilege authorisation?",
    guidance:
      "Strong authentication for users and management interfaces, role-based access, and reporting of possible unauthorised access.",
    craRef: "Annex I Part I(2)(d)",
    category: "access",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "confidentiality",
    title: "Encryption at rest and in transit",
    question: "Is sensitive data encrypted at rest and in transit using current, strong cryptography?",
    guidance:
      "Use modern TLS, well-reviewed libraries, and a key-management approach you can explain. Avoid home-grown crypto.",
    craRef: "Annex I Part I(2)(e)",
    category: "access",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "integrity",
    title: "Integrity of data, code and configuration",
    question: "Are stored data, commands, programs and configuration protected against tampering, with corruption reported?",
    guidance: "Signed code and configuration, integrity checks, and alerts when something has been altered.",
    craRef: "Annex I Part I(2)(f)",
    category: "access",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "data-minimisation",
    title: "Data minimisation",
    question: "Do you limit collection and retention to the data the product actually needs?",
    guidance: "List every data type collected, why, and for how long. Remove anything without a clear purpose.",
    craRef: "Annex I Part I(2)(g)",
    category: "access",
    priority: "standard",
    appliesTo: ALL,
  },
  {
    id: "data-removal",
    title: "Secure data removal",
    question: "Can users permanently and easily remove all their data and settings?",
    guidance:
      "Provide a documented way to wipe data and settings, including before resale or disposal, and to transfer data where relevant.",
    craRef: "Annex I Part I(2)(m)",
    category: "access",
    priority: "standard",
    appliesTo: ALL,
  },
  {
    id: "attack-surface",
    title: "Minimal attack surface",
    question: "Are unused ports, services, debug interfaces and features disabled or removed?",
    guidance:
      "Keep an inventory of exposed interfaces (network, API, USB, JTAG, UART) and justify each one that stays open in production.",
    craRef: "Annex I Part I(2)(j)",
    category: "hardening",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "network-api",
    title: "Network & API security",
    question: "Are network communications and APIs protected against misuse (authentication, input validation, rate limiting)?",
    guidance: "Authenticate every API call, validate input, apply rate limits, and segment networks where you can.",
    craRef: "Annex I Part I(2)(d), (j)",
    category: "hardening",
    priority: "high",
    appliesTo: ["software", "firmware", "cloud"],
  },
  {
    id: "exploit-mitigation",
    title: "Exploit mitigation",
    question: "Do you use exploit mitigations such as memory-safe languages, stack protection, ASLR or sandboxing?",
    guidance:
      "Enable compiler and OS hardening flags, prefer memory-safe languages for new code, and isolate components so one compromise does not spread.",
    craRef: "Annex I Part I(2)(k)",
    category: "hardening",
    priority: "standard",
    appliesTo: ["software", "firmware", "hardware"],
  },
  {
    id: "secure-boot",
    title: "Secure boot",
    question: "Does the device only boot firmware or software that is signed and trusted?",
    guidance: "Use a hardware root of trust and verify signatures at every boot stage.",
    craRef: "Annex I Part I(2)(f), (k)",
    category: "hardening",
    priority: "high",
    appliesTo: ["firmware", "hardware"],
  },
  {
    id: "tamper",
    title: "Physical tamper protection",
    question: "Can the device detect or resist physical tampering where your risk assessment calls for it?",
    guidance: "Protect debug ports, secure key storage, and use tamper-evident or tamper-responsive designs where justified.",
    craRef: "Annex I Part I(2)(d), (f)",
    category: "hardening",
    priority: "standard",
    appliesTo: ["hardware"],
  },
  {
    id: "availability",
    title: "Availability & resilience",
    question: "Are essential functions protected against denial of service, and does the product avoid harming other networks or devices?",
    guidance: "Rate-limit, fail safely, and test behaviour under load and attack so the product keeps doing its core job.",
    craRef: "Annex I Part I(2)(h)–(i)",
    category: "hardening",
    priority: "standard",
    appliesTo: ALL,
  },
  {
    id: "logging",
    title: "Security logging & monitoring",
    question: "Does the product record security-relevant events (logins, configuration changes, failures), with a user opt-out where appropriate?",
    guidance: "Log access and changes, protect logs from tampering, and make them available for incident investigation.",
    craRef: "Annex I Part I(2)(l)",
    category: "hardening",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "sbom",
    title: "Software bill of materials (SBOM)",
    question: "Do you generate a machine-readable SBOM (e.g. SPDX or CycloneDX) for every release?",
    guidance:
      "Generate the SBOM in your build pipeline, at minimum covering top-level dependencies, and keep one per released version.",
    craRef: "Annex I Part II(1)",
    category: "vulns",
    priority: "critical",
    appliesTo: ["software", "firmware", "cloud"],
  },
  {
    id: "vuln-remediation",
    title: "Vulnerability remediation process",
    question: "Do you have a defined process and timelines for triaging and fixing reported vulnerabilities?",
    guidance:
      "Define severity-based fix timelines, an owner for triage, and a way to track every vulnerability to closure.",
    craRef: "Annex I Part II(2)",
    category: "vulns",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "security-testing",
    title: "Regular security testing",
    question: "Do you test security regularly (scanning, targeted testing, penetration tests) based on what changed?",
    guidance:
      "Tie test depth to the change: automated scans every release, targeted tests when the attack surface changes, a full penetration test for new products and on a recurring cadence.",
    craRef: "Annex I Part II(3)",
    category: "vulns",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "cvd-policy",
    title: "Coordinated vulnerability disclosure",
    question: "Do you publish a vulnerability disclosure policy and a contact address for reporting issues?",
    guidance:
      "Publish a disclosure policy and a security contact (a security.txt file is a good start), and commit to response times.",
    craRef: "Annex I Part II(5)–(6); Art. 13(17)",
    category: "vulns",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "advisories",
    title: "Public security advisories",
    question: "When you fix a vulnerability, do you publish an advisory describing it, its impact and the fix?",
    guidance: "Publish advisories once a fix is available, including affected versions, severity and remediation steps.",
    craRef: "Annex I Part II(4)",
    category: "vulns",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "secure-updates",
    title: "Secure update mechanism",
    question: "Are updates authenticated and integrity-checked before install, with automatic security updates on by default?",
    guidance:
      "Sign every update, verify before install, support rollback protection, and make automatic security updates the default with a clear opt-out.",
    craRef: "Annex I Part I(2)(c); Part II(7)",
    category: "updates",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "patch-delivery",
    title: "Timely, free security patches",
    question: "Can you deliver security fixes quickly, free of charge, and separately from feature updates where feasible?",
    guidance: "Keep a hotfix path that does not wait for the next feature release, and notify users with advisory messages.",
    craRef: "Annex I Part II(2), (8)",
    category: "updates",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "support-period",
    title: "Defined support period",
    question: "Have you defined and published how long the product will receive security updates (normally at least five years)?",
    guidance:
      "The CRA requires a support period reflecting expected use, generally at least five years. State the end date at the point of sale.",
    craRef: "Art. 13(8)",
    category: "updates",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "change-management",
    title: "Configuration & change management",
    question: "Are production configurations version-controlled, with changes reviewed and approved?",
    guidance: "Treat configuration as code, review changes, and keep a record of what changed in each release.",
    craRef: "Annex I Part I(1); Annex VII",
    category: "updates",
    priority: "standard",
    appliesTo: ALL,
  },
  {
    id: "incident-reporting",
    title: "24 / 72-hour incident reporting",
    question:
      "Can you report an actively exploited vulnerability or severe incident to the authorities within 24 hours (early warning) and 72 hours (full notification)?",
    guidance:
      "This obligation has applied since 11 September 2026. Name an owner, prepare templates, and rehearse the process with a tabletop exercise.",
    craRef: "Art. 14",
    category: "docs",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "incident-response",
    title: "Incident response plan",
    question: "Do you have a documented, tested plan to detect, respond to and recover from security incidents?",
    guidance: "Define roles, escalation paths, customer communication, and run at least one exercise a year.",
    craRef: "Art. 14; Annex I Part II(2)",
    category: "docs",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "technical-docs",
    title: "Technical documentation",
    question: "Do you maintain technical documentation (a system security plan) covering design, risks, controls and test evidence?",
    guidance:
      "Keep a living security plan per product covering architecture, risk assessment, SBOM, test results and the vulnerability process. Retain it for ten years after release or for the support period, whichever is longer.",
    craRef: "Art. 31; Annex VII",
    category: "docs",
    priority: "critical",
    appliesTo: ALL,
  },
  {
    id: "user-info",
    title: "User security information",
    question: "Do you give users security instructions, including secure setup, the support end date, and a security contact?",
    guidance: "Ship clear instructions covering secure installation, updates, the support period, and how to report issues.",
    craRef: "Art. 13(18); Annex II",
    category: "docs",
    priority: "high",
    appliesTo: ALL,
  },
  {
    id: "conformity",
    title: "Conformity assessment & CE marking",
    question: "Do you know which conformity route applies to your product, and have you planned the EU declaration of conformity and CE marking?",
    guidance:
      "Most products can self-assess. Important and critical products (e.g. firewalls, password managers, smart cards) may need harmonised standards or a notified body. Plan this early.",
    craRef: "Art. 28, 30, 32",
    category: "docs",
    priority: "high",
    appliesTo: ALL,
  },
];

export function requirementsFor(selected: readonly ProductType[]): Requirement[] {
  if (selected.length === 0) return [];
  return requirements.filter((r) => r.appliesTo.some((t) => selected.includes(t)));
}
