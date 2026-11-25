import type { Industry, Source } from "@/content/types";

const CRA_TEXT: Source = { label: "Regulation (EU) 2024/2847 (CRA), EUR-Lex", url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng" };
const CLASS_ACT: Source = {
  label: "Implementing Regulation (EU) 2025/2392: technical descriptions of important and critical products",
  url: "https://eur-lex.europa.eu/eli/reg_impl/2025/2392/oj/eng",
};
const RED_DA: Source = { label: "Delegated Regulation (EU) 2022/30 (RED cybersecurity)", url: "https://eur-lex.europa.eu/eli/reg_del/2022/30/oj/eng" };

const EN_18031 = { name: "EN 18031-1/-2/-3", note: "Harmonised under the RED delegated act for radio equipment since 1 August 2025." };
const EN_303_645 = { name: "ETSI EN 303 645", note: "Baseline for consumer IoT security; a practical starting point for most connected devices." };
const EN_40000 = { name: "EN 40000-1-1 / -1-2", note: "First CRA horizontal standards, published November 2026; not yet cited in the Official Journal." };
const IEC_62443 = { name: "IEC 62443-4-1 / -4-2", note: "Secure development process and component requirements for industrial automation." };

export const industries: Industry[] = [
  {
    slug: "smart-home",
    name: "Smart home devices",
    searchName: "smart home device makers",
    examples: ["Thermostats", "Smart plugs and lighting", "Hubs and bridges", "Appliances with apps"],
    productTypes: ["hardware", "firmware", "cloud", "software"],
    craClass: "default",
    classNote:
      "Most smart home devices are in the default category and can self-assess. Smart home products with security functions (locks, cameras, alarms, baby monitors) and general-purpose voice assistants are Important Class I.",
    standards: [EN_303_645, EN_18031, EN_40000],
    topRisks: ["Default or shared passwords", "Unauthenticated local APIs", "Unsigned firmware updates", "Cloud account takeover"],
    pitfalls: [
      "Treating the companion app and cloud backend as out of scope. If the device needs them to work, they are part of the product.",
      "Shipping without a published support period. Buyers and market surveillance authorities will ask for the end date.",
    ],
    alsoRegulatedBy: ["Radio Equipment Directive delegated act (if it has a radio)", "GDPR for personal data"],
    sources: [CRA_TEXT, CLASS_ACT, RED_DA],
  },
  {
    slug: "smart-home-security",
    name: "Smart locks, cameras and alarms",
    searchName: "smart lock, security camera and alarm makers",
    examples: ["Smart door locks", "Security cameras", "Baby monitors", "Alarm systems"],
    productTypes: ["hardware", "firmware", "cloud", "software"],
    craClass: "important-1",
    classNote:
      "Smart home products with security functions are listed in Annex III as Important Class I. You can self-assess only if you fully apply a harmonised standard or certification scheme; otherwise a notified body is needed.",
    standards: [EN_303_645, EN_18031, EN_40000],
    topRisks: ["Remote unlock or disarm by an attacker", "Video and audio exposure", "Replay of radio commands", "Account takeover"],
    pitfalls: [
      "Assuming self-assessment is available. Until CRA harmonised standards are cited in the Official Journal, plan for notified-body time and cost.",
      "Weak pairing flows for locks and cameras. Pairing is where most real attacks start.",
    ],
    alsoRegulatedBy: ["Radio Equipment Directive delegated act", "GDPR (video of people is personal data)"],
    sources: [CRA_TEXT, CLASS_ACT, RED_DA],
  },
  {
    slug: "wearables",
    name: "Wearables",
    searchName: "wearable device makers",
    examples: ["Fitness and health trackers", "Smartwatches", "Children's wearables", "Smart rings"],
    productTypes: ["hardware", "firmware", "cloud", "software"],
    craClass: "important-1",
    classNote:
      "Wearables with a health-monitoring purpose that are not medical devices, and wearables intended for children, are Important Class I. Other wearables are usually in the default category.",
    standards: [EN_303_645, EN_18031, EN_40000],
    topRisks: ["Health and location data leaks", "Insecure Bluetooth pairing", "Companion app weaknesses", "Tracking of children"],
    pitfalls: [
      "Missing the Class I trigger. A step counter with heart-rate tracking can be health monitoring.",
      "Forgetting data deletion. Users must be able to remove all their data and settings.",
    ],
    alsoRegulatedBy: ["MDR applies instead if it is a medical device", "GDPR (health data is special-category data)"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "connected-toys",
    name: "Connected toys",
    searchName: "connected toy makers",
    examples: ["Talking toys", "Toys with cameras", "Location-tracking toys", "App-controlled toys"],
    productTypes: ["hardware", "firmware", "cloud", "software"],
    craClass: "important-1",
    classNote:
      "Internet-connected toys with social interactive features (speaking, filming) or location tracking are Important Class I under Annex III.",
    standards: [EN_303_645, EN_18031, EN_40000],
    topRisks: ["Strangers talking to children through the toy", "Audio and video capture", "Location exposure", "Unpatched toys left in use for years"],
    pitfalls: [
      "Short support periods. Toys stay in use for years, and the support period must reflect expected use.",
      "Pairing without authentication, so anyone nearby can connect.",
    ],
    alsoRegulatedBy: ["Toy Safety rules", "GDPR (children's data)", "Radio Equipment Directive delegated act"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "consumer-electronics",
    name: "Consumer electronics",
    searchName: "consumer electronics makers",
    examples: ["Smart TVs and streaming boxes", "Speakers and headphones with apps", "Printers", "Drones and cameras"],
    productTypes: ["hardware", "firmware", "software", "cloud"],
    craClass: "default",
    classNote: "Most consumer electronics are in the default category, so self-assessment (Module A) is available.",
    standards: [EN_303_645, EN_18031, EN_40000],
    topRisks: ["Outdated third-party components", "Exposed debug interfaces", "Insecure update channels", "Default credentials"],
    pitfalls: [
      "No SBOM for third-party SDKs from chip vendors. You inherit their vulnerabilities.",
      "Ending updates when a model is discontinued, which is often before the support period ends.",
    ],
    alsoRegulatedBy: ["Radio Equipment Directive delegated act", "GDPR"],
    sources: [CRA_TEXT, RED_DA],
  },
  {
    slug: "industrial-automation",
    name: "Industrial automation and IIoT",
    searchName: "industrial automation and IIoT manufacturers",
    examples: ["PLCs and controllers", "HMIs", "Industrial gateways and sensors", "Building automation"],
    productTypes: ["hardware", "firmware", "software"],
    craClass: "default",
    classNote:
      "Controllers and sensors are generally default category. Industrial routers, switches and network interfaces are Important Class I, and firewalls are Class II.",
    standards: [IEC_62443, EN_40000],
    topRisks: ["Unauthenticated industrial protocols", "Remote maintenance access", "Long-lived unpatched installs", "Engineering workstation compromise"],
    pitfalls: [
      "Support periods shorter than the 10 to 20 years installations really run. Plan patch delivery to match.",
      "Assuming customers' network segmentation replaces product security. The CRA puts the duty on you.",
    ],
    alsoRegulatedBy: ["Machinery Regulation (from January 2027)", "NIS2 obligations of your customers"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "networking-equipment",
    name: "Routers, modems and switches",
    searchName: "router, modem and network equipment makers",
    examples: ["Home and SME routers", "Modems", "Switches", "Network interfaces"],
    productTypes: ["hardware", "firmware", "software"],
    craClass: "important-1",
    classNote: "Routers, modems for internet connection, switches and network interfaces are Important Class I under Annex III.",
    standards: [EN_303_645, EN_18031, EN_40000],
    topRisks: ["Exposed admin interfaces", "Default credentials", "Botnet recruitment", "Unsigned firmware"],
    pitfalls: [
      "Management UIs reachable from the WAN by default.",
      "Relying on self-assessment before harmonised standards are cited. Budget for a notified body.",
    ],
    alsoRegulatedBy: ["Radio Equipment Directive delegated act (Wi-Fi models)"],
    sources: [CRA_TEXT, CLASS_ACT, RED_DA],
  },
  {
    slug: "security-appliances",
    name: "Firewalls and intrusion detection",
    searchName: "firewall and security appliance vendors",
    examples: ["Firewalls", "Intrusion detection and prevention", "Security gateways"],
    productTypes: ["hardware", "firmware", "software"],
    craClass: "important-2",
    classNote:
      "Firewalls and intrusion detection or prevention systems are Important Class II. Third-party conformity assessment is mandatory.",
    standards: [EN_40000, { name: "EUCC (Common Criteria)", note: "EU cybersecurity certification scheme; relevant evidence for Class II." }],
    topRisks: ["Vulnerabilities in the management plane", "Exploited VPN or edge services", "Supply-chain compromise of updates"],
    pitfalls: ["Underestimating notified-body lead times. Book early.", "Weak separation between management and data planes."],
    alsoRegulatedBy: ["NIS2 obligations of your customers"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "embedded-semiconductors",
    name: "Microcontrollers and secure chips",
    searchName: "microcontroller and chip vendors",
    examples: ["Microcontrollers with security functions", "Microprocessors", "Secure elements", "FPGAs and ASICs with security functions"],
    productTypes: ["hardware", "firmware"],
    craClass: "important-1",
    classNote:
      "Microprocessors, microcontrollers, ASICs and FPGAs with security-related functions are Important Class I. Tamper-resistant microprocessors and microcontrollers are Class II, and smartcards and secure elements are critical products.",
    standards: [EN_40000, { name: "EUCC (Common Criteria)", note: "Expected route for critical products such as secure elements." }],
    topRisks: ["Side-channel and fault-injection attacks", "Weak secure boot or debug locking", "Vulnerable vendor SDKs"],
    pitfalls: ["Shipping SDKs and reference code without SBOMs or a support period.", "No disclosure route for researchers who find silicon bugs."],
    alsoRegulatedBy: [],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "software-applications",
    name: "Desktop and mobile software",
    searchName: "software companies",
    examples: ["Desktop applications", "Mobile apps", "Developer tools", "Games with online features"],
    productTypes: ["software", "cloud"],
    craClass: "default",
    classNote:
      "Most applications are in the default category. Browsers, password managers, VPNs, anti-malware and operating systems are Important Class I.",
    standards: [EN_40000],
    topRisks: ["Vulnerable open-source dependencies", "Insecure update delivery", "Secrets in the client", "Account takeover"],
    pitfalls: [
      "Thinking SaaS rules apply. Installable or downloadable software is in scope; its required backend counts as remote data processing.",
      "No SBOM in the build pipeline.",
    ],
    alsoRegulatedBy: ["GDPR", "NIS2 for your hosted services where it applies"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "infrastructure-software",
    name: "Operating systems, identity and security software",
    searchName: "infrastructure and security software vendors",
    examples: ["Operating systems", "Identity and access management", "PKI and certificate software", "SIEM and network management"],
    productTypes: ["software", "cloud"],
    craClass: "important-1",
    classNote:
      "Operating systems, identity management, PKI, SIEM, network management, boot managers and VPNs are Important Class I. Hypervisors and container runtimes are Class II.",
    standards: [EN_40000, { name: "EUCC (Common Criteria)", note: "Useful evidence where third-party assessment is required." }],
    topRisks: ["Privilege escalation", "Authentication bypass", "Compromised build pipeline", "Supply-chain dependencies"],
    pitfalls: ["Assuming open-source upstream covers your obligations. Commercial distribution makes you the manufacturer."],
    alsoRegulatedBy: ["NIS2 obligations of your customers"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "payment-terminals",
    name: "Payment and point-of-sale devices",
    searchName: "POS and payment terminal makers",
    examples: ["Card terminals", "Point-of-sale systems", "Kiosks", "Fuel and vending payment units"],
    productTypes: ["hardware", "firmware", "software", "cloud"],
    craClass: "default",
    classNote:
      "Terminals are generally default category, but a secure element or smartcard inside is itself a critical product. Embedding a component does not by itself reclassify your product.",
    standards: [EN_18031, EN_40000, { name: "PCI PTS POI", note: "Payment industry device security; useful evidence, not a CRA substitute." }],
    topRisks: ["Card data interception", "Tampering in the field", "Remote management abuse", "Unpatched OS images"],
    pitfalls: ["Treating PCI certification as CRA compliance. The CRA adds a support period, SBOM and reporting duties."],
    alsoRegulatedBy: ["PCI requirements from card schemes", "Radio Equipment Directive delegated act (EN 18031-3 for financial transactions)"],
    sources: [CRA_TEXT, CLASS_ACT, RED_DA],
  },
  {
    slug: "energy-devices",
    name: "EV chargers, inverters and smart meters",
    searchName: "EV charger, inverter and smart meter makers",
    examples: ["EV chargers", "Solar inverters", "Home batteries", "Smart meter gateways"],
    productTypes: ["hardware", "firmware", "cloud", "software"],
    craClass: "default",
    classNote:
      "Chargers, inverters and batteries are generally default category. Smart meter gateways in smart metering systems are critical products under Annex IV.",
    standards: [EN_303_645, EN_18031, IEC_62443, EN_40000],
    topRisks: ["Remote control of power flows at scale", "Cloud backend compromise", "Insecure local commissioning tools"],
    pitfalls: ["Fleet-wide cloud control without strong authentication. One breach can affect grid stability."],
    alsoRegulatedBy: ["Radio Equipment Directive delegated act", "National grid-connection rules"],
    sources: [CRA_TEXT, CLASS_ACT],
  },
  {
    slug: "automotive-aftermarket",
    name: "Automotive aftermarket devices",
    searchName: "automotive aftermarket device makers",
    examples: ["Dashcams", "OBD dongles and telematics", "Aftermarket infotainment", "E-bike and scooter connectivity"],
    productTypes: ["hardware", "firmware", "cloud", "software"],
    craClass: "default",
    classNote:
      "Vehicles under EU type-approval are excluded from the CRA, but aftermarket devices sold separately are generally in scope in the default category.",
    standards: [EN_303_645, EN_18031, { name: "ISO/SAE 21434", note: "Automotive cybersecurity engineering; useful method, not a CRA substitute." }],
    topRisks: ["CAN bus access through OBD devices", "Location tracking", "Insecure companion apps"],
    pitfalls: ["Assuming the vehicle exclusion covers aftermarket products. It does not."],
    alsoRegulatedBy: ["Radio Equipment Directive delegated act", "GDPR (location data)"],
    sources: [CRA_TEXT],
  },
];

export const craClassInfo: Record<Industry["craClass"], { label: string; route: string; selfAssess: string }> = {
  default: {
    label: "Default category",
    route: "Internal control (Module A): you assess conformity yourself.",
    selfAssess: "Yes",
  },
  "important-1": {
    label: "Important product, Class I",
    route:
      "Self-assessment only if you fully apply harmonised standards, common specifications or a certification scheme. Otherwise EU-type examination (Module B+C) or full quality assurance (Module H) with a notified body.",
    selfAssess: "Only with harmonised standards",
  },
  "important-2": {
    label: "Important product, Class II",
    route: "Third-party assessment required: Module B+C, Module H, or a European cybersecurity certification scheme where available.",
    selfAssess: "No",
  },
  critical: {
    label: "Critical product",
    route: "European cybersecurity certification where required by delegated act; otherwise the Class II routes.",
    selfAssess: "No",
  },
};

export function industryBySlug(slug: string | undefined) {
  return industries.find((i) => i.slug === slug);
}
