import type { Guide, Source } from "@/content/types";

const CRA_TEXT: Source = {
  label: "EUR-Lex: Regulation (EU) 2024/2847 (Cyber Resilience Act)",
  url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng",
};

const COMMISSION_GUIDANCE: Source = {
  label: "European Commission: CRA guidance, C(2026) 5252",
  url: "https://digital-strategy.ec.europa.eu/en/library/commission-publishes-new-guidance-support-timely-cyber-resilience-act-implementation",
};

const CRA_IMPLEMENTATION: Source = {
  label: "European Commission: Cyber Resilience Act implementation",
  url: "https://digital-strategy.ec.europa.eu/en/factpages/cyber-resilience-act-implementation",
};

const ENISA_SRP: Source = {
  label: "ENISA: CRA Single Reporting Platform",
  url: "https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp",
};

const ENISA_COORDINATORS: Source = {
  label: "ENISA: List of CSIRTs designated as coordinators",
  url: "https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/list-of-csirts-designated-as-coordinators",
};

const EN_40000: Source = {
  label: "CEN-CENELEC: EN 40000-1-1 and EN 40000-1-2 published",
  url: "https://www.cencenelec.eu/news-events/news/2026/en-in-the-spotlight/2026-11-19-cra-standards-en-40000-1-1-and-en-40000-1-2/",
};

const CATEGORIES_ACT: Source = {
  label: "EUR-Lex: Implementing Regulation (EU) 2025/2392",
  url: "https://eur-lex.europa.eu/eli/reg_impl/2025/2392/oj/eng",
};

export const guides: Guide[] = [
  {
    slug: "cra-checklist",
    title: "CRA Compliance Checklist for Small Manufacturers",
    metaDescription:
      "A step-by-step CRA compliance checklist for small manufacturers: scope, product class, reporting since 11 Sep 2026, SBOM, documentation and CE marking.",
    keywords: [
      "CRA compliance checklist",
      "Cyber Resilience Act checklist",
      "CRA requirements for manufacturers",
      "CRA compliance steps",
      "Cyber Resilience Act SME",
      "CRA readiness",
    ],
    summary:
      "To comply with the CRA, confirm your product is in scope, set up Article 14 reporting now, and meet the Annex I security and vulnerability handling requirements before 11 December 2027. Then write the Annex VII technical documentation, pass the right conformity assessment, sign the EU declaration of conformity and affix the CE mark.",
    sections: [
      {
        heading: "Step 1: Confirm scope and product class",
        body: [
          "The CRA covers products with digital elements that connect to a device or network, including software sold on its own. List every product and version you place on the EU market. Note which ones fall under other laws that the CRA excludes, such as medical devices, vehicle type approval or civil aviation. The Commission guidance adopted on 27 July 2026 explains edge cases like remote data processing and free and open-source software. Next, check each product against Annex III (important, class I and II) and Annex IV (critical). Implementing Regulation (EU) 2025/2392 gives the technical descriptions. Classification follows the product's core function. Most products are default class and can use self-assessment.",
        ],
      },
      {
        heading: "Step 2: Set up vulnerability reporting now",
        body: [
          "Reporting under Article 14 has applied since 11 September 2026, including for products placed on the market before 11 December 2027. Register your organisation on ENISA's Single Reporting Platform and find your coordinating CSIRT on ENISA's list. Decide who can file a report outside office hours. Write a one-page runbook: how you spot an actively exploited vulnerability or a severe incident, who confirms it, and who files the 24-hour early warning, the 72-hour notification and the final report. Test it with a dry run. Missing a deadline here is the most likely early enforcement risk.",
        ],
      },
      {
        heading: "Step 3: Build security into the product",
        body: [
          "Do a documented cybersecurity risk assessment for each product (Art. 13(2)). Use it to apply the Annex I Part I requirements: secure by default configuration, no known exploitable vulnerabilities at release, access control, encryption of data at rest and in transit, a minimal attack surface, logging and secure updates. Then set up the Annex I Part II vulnerability handling process. That means an SBOM, a coordinated vulnerability disclosure policy, a public contact address, regular security testing, and free security updates delivered without delay. Write down your support period and how you chose it.",
        ],
      },
      {
        heading: "Step 4: Document, assess and mark",
        body: [
          "Compile the Annex VII technical documentation as you go. It holds the product description, risk assessment, design and vulnerability handling processes, standards applied, test reports and support period. Keep it for 10 years or the support period, whichever is longer. Run the conformity assessment that fits your class under Article 32. Default products use internal control (module A). Then sign the EU declaration of conformity (Annex V), affix the CE mark and add the Annex II user information. All of this must be in place for products placed on the market from 11 December 2027.",
        ],
      },
    ],
    faqs: [
      {
        q: "When do I need to be fully CRA compliant?",
        a: "Reporting duties under Article 14 have applied since 11 September 2026. All other main obligations, including CE marking under the CRA, apply to products placed on the EU market from 11 December 2027.",
      },
      {
        q: "Do I need a notified body?",
        a: "Only for some products. Default products can self-assess. Important class I products can self-assess only if they apply a harmonised standard, common specification or EU certification scheme in full. Class II and critical products need third-party assessment or certification.",
      },
      {
        q: "Does the CRA apply to products already on the market?",
        a: "The Article 14 reporting duties apply to all products on the market, including older ones. The other requirements apply to products placed on the market from 11 December 2027, and to older products only after a substantial modification.",
      },
    ],
    craRefs: ["Art. 13", "Art. 14", "Art. 28", "Art. 30", "Art. 31", "Art. 32", "Art. 69", "Art. 71", "Annex I", "Annex II", "Annex III", "Annex VII"],
    related: ["cra-deadlines", "vulnerability-reporting", "technical-documentation", "product-classes"],
    sources: [CRA_TEXT, COMMISSION_GUIDANCE, ENISA_SRP],
  },
  {
    slug: "cra-deadlines",
    title: "CRA Deadlines and Timeline: Key Dates 2024 to 2027",
    metaDescription:
      "CRA deadlines in one place: in force 10 Dec 2024, notified bodies 11 Jun 2026, reporting 11 Sep 2026, full application 11 Dec 2027. What each date means.",
    keywords: [
      "CRA deadlines",
      "Cyber Resilience Act timeline",
      "CRA key dates",
      "CRA 11 December 2027",
      "CRA reporting 11 September 2026",
      "when does the CRA apply",
    ],
    summary:
      "The CRA entered into force on 10 December 2024, its notified body rules applied from 11 June 2026, and Article 14 reporting has applied since 11 September 2026. All remaining obligations apply from 11 December 2027.",
    sections: [
      {
        heading: "Dates already passed",
        body: [
          "The CRA was published in the Official Journal on 20 November 2024 and entered into force on 10 December 2024. On 1 December 2025 the Commission published Implementing Regulation (EU) 2025/2392, which describes the important and critical product categories in detail. Chapter IV on notification of conformity assessment bodies applied from 11 June 2026, so member states could start notifying CRA bodies. The Commission adopted its CRA guidance on 27 July 2026 (C(2026) 5252). The guidance is not legally binding. It covers scope, substantial modification, support periods, reporting and risk assessment.",
        ],
      },
      {
        heading: "11 September 2026: reporting started",
        body: [
          "Article 14 reporting applied from 11 September 2026. ENISA's Single Reporting Platform went live the same day. ENISA published the list of coordinating CSIRTs on 4 September 2026. Manufacturers must now report actively exploited vulnerabilities and severe incidents for every product on the EU market, including products placed on the market before December 2027. In November 2026, CEN and CENELEC published EN 40000-1-1 (vocabulary) and EN 40000-1-2 (principles for cyber resilience). No CRA harmonised standard is cited in the Official Journal yet, so neither gives a presumption of conformity.",
        ],
      },
      {
        heading: "11 December 2027: full application",
        body: [
          "From 11 December 2027, every product with digital elements placed on the EU market must meet Annex I, carry CE marking under the CRA, and come with an EU declaration of conformity and Annex VII technical documentation. Products already on the market before that date only fall under these rules if they are substantially modified. On the same date, Delegated Regulation (EU) 2022/30 under the Radio Equipment Directive is repealed by Delegated Regulation (EU) 2026/339. Radio products then follow the CRA for cybersecurity.",
        ],
      },
      {
        heading: "How to plan backwards",
        body: [
          "Work back from December 2027. Conformity assessment by a notified body can take months, and capacity is limited, so book early if your product is important class I without full harmonised standards, class II or critical. Allow time to fix findings from your risk assessment and testing. A realistic plan for a small team is: reporting runbook now, risk assessment and SBOM in the first half of 2027, documentation and testing by autumn 2027, and declaration of conformity before your first shipment after 11 December 2027.",
        ],
      },
    ],
    faqs: [
      {
        q: "Has the CRA deadline been postponed?",
        a: "No. The dates in Article 71 stand. Reporting applies from 11 September 2026 and the main obligations from 11 December 2027.",
      },
      {
        q: "Do I need to report vulnerabilities for products sold before 2027?",
        a: "Yes. Article 69(3) applies the Article 14 reporting duties to all products within scope placed on the market before 11 December 2027.",
      },
      {
        q: "Are there harmonised standards I can use now?",
        a: "EN 40000-1-1 and EN 40000-1-2 were published in November 2026, but no CRA harmonised standard is cited in the Official Journal yet. You can use them as guidance, without a presumption of conformity.",
      },
    ],
    craRefs: ["Art. 14", "Art. 69", "Art. 71", "Chapter IV"],
    related: ["cra-checklist", "vulnerability-reporting", "cra-vs-red", "product-classes"],
    sources: [CRA_TEXT, CRA_IMPLEMENTATION, EN_40000, ENISA_SRP],
  },
  {
    slug: "vulnerability-reporting",
    title: "CRA 24-Hour Vulnerability Reporting (Article 14)",
    metaDescription:
      "How CRA Article 14 reporting works: 24-hour early warning, 72-hour notification and final report via ENISA's Single Reporting Platform since 11 Sep 2026.",
    keywords: [
      "CRA vulnerability reporting",
      "CRA Article 14",
      "24-hour early warning CRA",
      "ENISA Single Reporting Platform",
      "actively exploited vulnerability reporting",
      "CRA severe incident reporting",
      "coordinating CSIRT",
    ],
    summary:
      "Since 11 September 2026, manufacturers must report each actively exploited vulnerability and each severe incident through ENISA's Single Reporting Platform: an early warning within 24 hours and a notification within 72 hours. A final report follows within 14 days of a fix for vulnerabilities and within one month for severe incidents.",
    sections: [
      {
        heading: "What triggers a report",
        body: [
          "Two events trigger Article 14. The first is an actively exploited vulnerability in your product, meaning reliable evidence that a malicious actor has exploited it. The second is a severe incident that affects your product's security. An incident is severe when it harms the product's ability to protect the availability, authenticity, integrity or confidentiality of sensitive or important data or functions, or when it led to malicious code running on the product. A vulnerability found by your own testing and fixed before anyone exploits it does not trigger a mandatory report. You can still report it voluntarily under Article 15.",
        ],
      },
      {
        heading: "The three deadlines",
        body: [
          "For an actively exploited vulnerability, send an early warning within 24 hours of becoming aware. Say which member states the product is sold in. Within 72 hours, send a notification with what you know about the product, the exploit, the fixes taken and what users can do. Send a final report no later than 14 days after a corrective or mitigating measure is available. For a severe incident, the early warning is also due within 24 hours and should say whether you suspect unlawful or malicious acts. The incident notification is due within 72 hours. The final report is due within one month of the incident notification.",
        ],
      },
      {
        heading: "Where reports go",
        body: [
          "All reports go through ENISA's Single Reporting Platform, which went live on 11 September 2026. The platform sends each report to the CSIRT designated as coordinator and to ENISA at the same time. Your coordinator is the CSIRT of the member state of your main EU establishment. Without an EU establishment, Article 14(7) sets the order: the member state of your authorised representative, then your importer, then your distributor, then the member state with the most users. ENISA published the list of coordinating CSIRTs on 4 September 2026.",
        ],
      },
      {
        heading: "Telling users and small-company relief",
        body: [
          "After you become aware of an actively exploited vulnerability or severe incident, inform affected users, and where needed all users, about the issue and any mitigations they can apply. Use a machine-readable format where possible. Micro and small enterprises cannot be fined for missing the 24-hour early warning deadline (Art. 64(10)). The duty to report still applies to them, and the 72-hour and final report deadlines are not covered by this relief.",
        ],
      },
    ],
    faqs: [
      {
        q: "When does the 24-hour clock start?",
        a: "It starts when you become aware of the actively exploited vulnerability or severe incident. Build a quick triage step so awareness is recorded and the clock is managed.",
      },
      {
        q: "Do I report every vulnerability?",
        a: "No. Only actively exploited vulnerabilities and severe incidents must be reported. Other vulnerabilities go through your normal handling and disclosure process.",
      },
      {
        q: "Does reporting apply to products sold before 2027?",
        a: "Yes. Article 14 applies to all in-scope products on the EU market since 11 September 2026, whenever they were first placed on the market.",
      },
      {
        q: "What if I am based outside the EU?",
        a: "You still report through ENISA's Single Reporting Platform. Your coordinating CSIRT is chosen using the Article 14(7) order: authorised representative, importer, distributor, then most users.",
      },
    ],
    craRefs: ["Art. 14", "Art. 15", "Art. 16", "Art. 64(10)", "Art. 69(3)"],
    related: ["vulnerability-disclosure", "cra-fines", "cra-deadlines", "cra-vs-nis2"],
    sources: [CRA_TEXT, ENISA_SRP, ENISA_COORDINATORS, COMMISSION_GUIDANCE],
  },
  {
    slug: "sbom-requirements",
    title: "CRA SBOM Requirements: What to Include and Share",
    metaDescription:
      "What the CRA requires for a software bill of materials: top-level dependencies at minimum, a machine-readable format, kept in technical documentation.",
    keywords: [
      "CRA SBOM requirements",
      "software bill of materials CRA",
      "SBOM Cyber Resilience Act",
      "CRA SBOM format",
      "SPDX CycloneDX CRA",
      "Annex I Part II SBOM",
    ],
    summary:
      "The CRA requires manufacturers to draw up a software bill of materials in a commonly used, machine-readable format that covers at least the product's top-level dependencies. The SBOM is part of the technical documentation, and you must give it to market surveillance authorities on request, but you do not have to publish it.",
    sections: [
      {
        heading: "What the law says",
        body: [
          "Annex I Part II point 1 requires you to identify and document the vulnerabilities and components in your product, including by drawing up an SBOM. It must be in a commonly used, machine-readable format and cover at least the top-level dependencies. The SBOM sits in the Annex VII technical documentation. Market surveillance authorities can ask for it on a reasoned request. Annex II lets you tell users where they can access the SBOM if you choose to make it available. The Commission can set the format and elements by implementing act. No such act exists yet.",
        ],
      },
      {
        heading: "Choosing a format and tool",
        body: [
          "Two formats are widely used: SPDX, published as ISO/IEC 5962, and CycloneDX, published as ECMA-424. Either meets the commonly used, machine-readable test. Pick the one your build tools already support. Generate the SBOM from your build pipeline, not by hand. For firmware, include the operating system, bootloader, libraries and any third-party binaries. For each component, record at least the name, version, supplier and a unique identifier such as a package URL. Germany's BSI publishes Technical Guideline TR-03183-2 with more detailed SBOM requirements that many firms use as a reference.",
        ],
      },
      {
        heading: "Using the SBOM for vulnerability handling",
        body: [
          "An SBOM only helps if you check it. Match components against vulnerability sources such as ENISA's EU Vulnerability Database and the CVE list. Do this on every release and on a schedule for products in support. When a component has a vulnerability, decide whether your product is affected and record the result. Keep one SBOM per released version. When a security update changes a component, update the SBOM. This gives you fast answers when a customer, an authority or your coordinating CSIRT asks whether you are affected by a new vulnerability.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I have to publish my SBOM?",
        a: "No. The CRA requires you to keep it in your technical documentation and share it with market surveillance authorities on request. Publishing it is your choice.",
      },
      {
        q: "Does the SBOM need transitive dependencies?",
        a: "The legal minimum is top-level dependencies. Including deeper levels makes vulnerability tracking more reliable and is good practice.",
      },
      {
        q: "Which SBOM format does the CRA require?",
        a: "The CRA asks for a commonly used, machine-readable format and names none. SPDX and CycloneDX both qualify. The Commission may specify a format later by implementing act.",
      },
    ],
    craRefs: ["Art. 13", "Annex I Part II(1)", "Annex II", "Annex VII"],
    related: ["technical-documentation", "vulnerability-disclosure", "support-period", "cra-checklist"],
    sources: [
      CRA_TEXT,
      { label: "ENISA: EU Vulnerability Database", url: "https://euvd.enisa.europa.eu" },
      { label: "CISA: Software Bill of Materials", url: "https://www.cisa.gov/sbom" },
    ],
  },
  {
    slug: "technical-documentation",
    title: "CRA Technical Documentation (Annex VII) and Security Plan",
    metaDescription:
      "How to write CRA Annex VII technical documentation and a security plan: product description, risk assessment, processes, test reports and support period.",
    keywords: [
      "CRA technical documentation",
      "Annex VII CRA",
      "CRA cybersecurity risk assessment",
      "CRA security plan",
      "technical file Cyber Resilience Act",
      "CRA documentation template",
    ],
    summary:
      "CRA technical documentation is the file in Annex VII that proves your product meets Annex I. Its core is a cybersecurity risk assessment, which works as your security plan: it lists threats, links each one to a control, and records how you tested it.",
    sections: [
      {
        heading: "What Annex VII requires",
        body: [
          "The file must contain a general description of the product, including its intended purpose, software versions that affect compliance, and user information under Annex II. It must describe the design, development and production process and your vulnerability handling process, including the SBOM, the disclosure policy, the contact address and how you distribute updates. It also holds the cybersecurity risk assessment, the information used to set the support period, the list of harmonised standards or other specifications applied, test reports and a copy of the EU declaration of conformity. Draw it up before placing the product on the market and keep it up to date.",
        ],
      },
      {
        heading: "Writing the risk assessment as a security plan",
        body: [
          "Start with the intended purpose and reasonably foreseeable use. Draw a simple diagram of the product, its interfaces, data flows and remote data processing. List the assets worth protecting, such as user data, credentials, firmware integrity and availability. For each interface, list realistic threats and rate them. Then walk through every Annex I Part I requirement and state how you meet it, or why it does not apply. Article 13(3) requires this explicit mapping. Link each control to a test or review. EN 40000-1-2, published in November 2026, describes risk-based principles you can follow, though it gives no presumption of conformity.",
        ],
      },
      {
        heading: "Keeping it practical for a small team",
        body: [
          "Keep the file in version control next to the product. Use one document per product family with a version table. Reuse supplier evidence for components, but check it. Article 13(5) requires due diligence on third-party components, including open-source ones. Article 33 asks the Commission to provide a simplified technical documentation form for micro and small enterprises. Until it exists, a short, structured file is better than a long one nobody updates. Keep the file and the declaration of conformity for at least 10 years after placing the product on the market, or for the support period if longer.",
        ],
      },
    ],
    faqs: [
      {
        q: "Must the technical documentation be in a specific language?",
        a: "It must be in a language easily understood by market surveillance authorities in the member state where it is requested. Many firms keep an English version and translate on request.",
      },
      {
        q: "Do I need to share the documentation with customers?",
        a: "No. It goes to market surveillance authorities and notified bodies on request. Users get the Annex II information and the declaration of conformity.",
      },
      {
        q: "How often should I update the risk assessment?",
        a: "Update it during the support period whenever you learn of new threats, change the design or ship significant updates. Article 13(3) requires it to be documented and updated as appropriate.",
      },
    ],
    craRefs: ["Art. 13(2)", "Art. 13(3)", "Art. 13(5)", "Art. 13(13)", "Art. 31", "Art. 33", "Annex I", "Annex VII"],
    related: ["sbom-requirements", "ce-marking", "support-period", "cra-checklist"],
    sources: [CRA_TEXT, EN_40000, COMMISSION_GUIDANCE],
  },
  {
    slug: "support-period",
    title: "CRA Support Period and Security Updates Rules",
    metaDescription:
      "How to set a CRA support period: at least five years unless expected use is shorter, free security updates, and each update kept available for 10 years.",
    keywords: [
      "CRA support period",
      "Cyber Resilience Act security updates",
      "CRA five year support",
      "end of support date CRA",
      "CRA free security updates",
      "Article 13(8) CRA",
    ],
    summary:
      "Under the CRA, the support period must reflect how long the product is expected to be used and be at least five years, unless the product's expected use is shorter. During that period you must fix vulnerabilities with free security updates, and keep each update available for at least 10 years or the rest of the support period, whichever is longer.",
    sections: [
      {
        heading: "How to set the support period",
        body: [
          "Article 13(8) says the support period must match the time the product is expected to be in use. Take into account what users reasonably expect, the nature of the product, other EU law on product lifetime, support periods of similar products, the availability of the operating environment and the support periods of key integrated components. The minimum is five years. A shorter period is allowed only where the product is expected to be in use for less than five years. Record your reasoning in the technical documentation. The Commission guidance of 27 July 2026 covers how support periods should be read.",
        ],
      },
      {
        heading: "What you must do during support",
        body: [
          "During the support period you must handle vulnerabilities in line with Annex I Part II. Fix them without delay through security updates. Provide security updates free of charge, with advisory messages that explain what users should do. Where technically feasible, ship security updates separately from feature updates. Where applicable, Annex I Part I also expects automatic security updates enabled by default, with a clear and easy way for users to opt out. Each security update must stay available for at least 10 years after release, or for the rest of the support period if that is longer.",
        ],
      },
      {
        heading: "Telling buyers the end date",
        body: [
          "Article 13(19) requires you to state the end date of the support period, at least the month and year, at the time of purchase in an easy, accessible way. Show it on the product page and packaging where possible, and in the Annex II user information. Plan your component choices around this date. If a chipset vendor or operating system ends support before your end date, you still carry the duty to fix vulnerabilities. Build supplier support terms into your purchasing.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is five years always the minimum?",
        a: "Yes, unless the product is expected to be in use for less than five years. Products used for longer, such as industrial or building equipment, should get a longer period.",
      },
      {
        q: "Can I charge for security updates?",
        a: "No. Annex I Part II requires security updates to be free of charge during the support period. You can still charge for new features.",
      },
      {
        q: "What happens after the support period ends?",
        a: "Your duty to provide new security updates ends. Updates already released must remain available for 10 years from release or the rest of the support period, whichever is longer.",
      },
    ],
    craRefs: ["Art. 13(8)", "Art. 13(9)", "Art. 13(19)", "Annex I Part I", "Annex I Part II", "Annex II"],
    related: ["technical-documentation", "sbom-requirements", "vulnerability-disclosure", "cra-checklist"],
    sources: [CRA_TEXT, COMMISSION_GUIDANCE],
  },
  {
    slug: "product-classes",
    title: "CRA Important and Critical Products: Classes and Routes",
    metaDescription:
      "How CRA product classes work: default, important class I and II (Annex III), critical (Annex IV), and which conformity assessment route each one needs.",
    keywords: [
      "CRA important products",
      "CRA critical products",
      "Annex III CRA",
      "CRA class I class II",
      "CRA conformity assessment",
      "CRA product classification",
      "Implementing Regulation 2025/2392",
    ],
    summary:
      "Most products are default class and can self-assess under the CRA, while products listed in Annex III are important class I or II and those in Annex IV are critical. The class decides whether you can use internal control or need a notified body or EU certification.",
    sections: [
      {
        heading: "How to classify a product",
        body: [
          "A product is important or critical when its core functionality matches a category in Annex III or Annex IV. Implementing Regulation (EU) 2025/2392, in force since 21 December 2025, gives the technical description of each category. A product does not change class just because it includes a component from a listed category, such as a microcontroller. Record your classification and the reasons for it in the technical documentation.",
          "Class I examples include identity management software, password managers, VPN products, operating systems, routers and switches, smart home security products such as door locks and cameras, and connected toys with social interaction or location tracking. Class II covers hypervisors and container runtimes, firewalls and intrusion detection systems, and tamper-resistant microprocessors and microcontrollers. Critical products are hardware devices with security boxes, smart meter gateways and smartcards or secure elements.",
        ],
      },
      {
        heading: "Conformity routes by class",
        body: [
          "Default products can use internal control (module A). Important class I products can use module A only if they apply harmonised standards, common specifications or a European cybersecurity certification at assurance level substantial or higher in full. Otherwise they need EU-type examination with conformity to type (modules B and C) or full quality assurance (module H). Class II products need modules B and C, module H, or an EU certification at substantial level or higher. Critical products need European cybersecurity certification where the Commission requires it by delegated act under Article 8. Otherwise they follow the class II routes.",
        ],
      },
      {
        heading: "What this means right now",
        body: [
          "No CRA harmonised standard is cited in the Official Journal yet. EN 40000-1-1 and EN 40000-1-2, published in November 2026, give no presumption of conformity. So unless citations arrive in time, important class I makers should plan for a notified body. Notified bodies could be designated from 11 June 2026 onward. Check the NANDO database for bodies notified under the CRA and contact them early. Free and open-source important products whose technical documentation is public can use module A under Article 32(5).",
        ],
      },
    ],
    faqs: [
      {
        q: "Is my smart home device an important product?",
        a: "Only if its core function matches an Annex III category. Smart home products with security functions, such as door locks, cameras, baby monitors and alarm systems, are class I. Many other smart devices are default class.",
      },
      {
        q: "Can I self-assess a class I product?",
        a: "Yes, but only if you apply a cited harmonised standard, common specification or EU certification in full. None are available yet for the CRA, so most class I products currently need a notified body.",
      },
      {
        q: "Where are the detailed category definitions?",
        a: "In Implementing Regulation (EU) 2025/2392, published on 1 December 2025. It adds technical descriptions to the high-level lists in Annexes III and IV.",
      },
    ],
    craRefs: ["Art. 7", "Art. 8", "Art. 32", "Annex III", "Annex IV", "Annex VIII"],
    related: ["ce-marking", "cra-checklist", "cra-deadlines", "technical-documentation"],
    sources: [CRA_TEXT, CATEGORIES_ACT, EN_40000],
  },
  {
    slug: "ce-marking",
    title: "CE Marking and EU Declaration of Conformity Under the CRA",
    metaDescription:
      "How CE marking works under the CRA: when to affix it, what the EU declaration of conformity must contain, and how to mark software that has no casing.",
    keywords: [
      "CRA CE marking",
      "EU declaration of conformity CRA",
      "CE mark software CRA",
      "Annex V declaration of conformity",
      "simplified declaration of conformity",
      "CRA conformity",
    ],
    summary:
      "From 11 December 2027, products with digital elements need CE marking under the CRA, backed by an EU declaration of conformity in line with Annex V. You affix the CE mark only after the right conformity assessment, and for software it goes in the declaration or on the accompanying website.",
    sections: [
      {
        heading: "The EU declaration of conformity",
        body: [
          "The declaration states that you have shown the product meets Annex I. Annex V sets the content: product name and type, your name and address, a statement of sole responsibility, the object of the declaration, references to standards or specifications used, and where relevant the notified body and certificate. Sign and date it. If several EU laws apply, draw up one declaration covering all of them. Annex VI allows a simplified declaration with the product and an internet address where the full text is available. Keep the declaration for 10 years after placing on the market, or the support period if longer.",
        ],
      },
      {
        heading: "Affixing the CE mark",
        body: [
          "Affix the CE mark visibly, legibly and indelibly before the product is placed on the market. Put it on the product or its data plate. Where that is not possible, put it on the packaging and in the declaration. For software, place it in the declaration or on the website that accompanies the product. If a notified body took part in production control under module H or modules B and C, its identification number follows the CE mark. The general CE rules in Regulation (EC) No 765/2008 also apply.",
        ],
      },
      {
        heading: "Before 11 December 2027",
        body: [
          "Until 11 December 2027, products carry CE marking under other laws that apply to them, such as the Radio Equipment Directive. For radio equipment, the cybersecurity requirements of Delegated Regulation (EU) 2022/30 apply until that date. From 11 December 2027, your declaration for a radio product must reference the CRA for cybersecurity. Plan one combined declaration and one technical file per product to avoid gaps.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does software need a CE mark?",
        a: "Yes, if it is a product with digital elements placed on the EU market on its own. Put the mark in the EU declaration of conformity or on the accompanying website.",
      },
      {
        q: "Who signs the declaration of conformity?",
        a: "The manufacturer, who takes sole responsibility. An authorised representative can only draw it up if the written mandate allows it.",
      },
      {
        q: "Can I use one declaration for several EU laws?",
        a: "Yes. Where a product is covered by several EU acts, the CRA requires a single declaration that lists all of them.",
      },
    ],
    craRefs: ["Art. 28", "Art. 29", "Art. 30", "Art. 13(12)", "Annex V", "Annex VI"],
    related: ["technical-documentation", "product-classes", "cra-vs-red", "cra-checklist"],
    sources: [CRA_TEXT, COMMISSION_GUIDANCE],
  },
  {
    slug: "vulnerability-disclosure",
    title: "CRA Vulnerability Disclosure Policy and security.txt",
    metaDescription:
      "How to meet the CRA rules on coordinated vulnerability disclosure: write a CVD policy, publish a contact address and use security.txt (RFC 9116) to help.",
    keywords: [
      "CRA vulnerability disclosure policy",
      "coordinated vulnerability disclosure CRA",
      "security.txt",
      "RFC 9116",
      "CVD policy template",
      "CRA single point of contact",
    ],
    summary:
      "The CRA requires a coordinated vulnerability disclosure policy and a public contact address where anyone can report vulnerabilities in your products. A security.txt file under RFC 9116 is a simple, widely used way to publish that contact, though the CRA does not mandate it by name.",
    sections: [
      {
        heading: "What the CRA requires",
        body: [
          "Annex I Part II point 5 requires you to put in place and enforce a coordinated vulnerability disclosure policy. Point 6 requires you to make it easy to share information about vulnerabilities, including by giving a contact address for reports. Article 13(17) asks you to designate a single point of contact so users can reach you quickly, including to report vulnerabilities. Annex II requires you to tell users that single point of contact and where they can find your disclosure policy. Point 4 of Annex I Part II also requires you to publicly disclose information about fixed vulnerabilities once an update is available, unless a delay is justified for security reasons.",
        ],
      },
      {
        heading: "What to put in your policy",
        body: [
          "Keep the policy short. State which products and versions are in scope. Give one reporting channel, ideally an email address and an encrypted option. Say how fast you will confirm receipt and how you will keep the reporter updated. Explain how you decide on disclosure timing and whether you credit reporters. Add a good-faith statement saying you will not take legal action against researchers who follow the policy. ISO/IEC 29147 on disclosure and ISO/IEC 30111 on vulnerability handling give useful structure. Link the policy from your product pages and support site.",
        ],
      },
      {
        heading: "Publishing security.txt",
        body: [
          "RFC 9116 defines a plain text file at /.well-known/security.txt on your website. It must include a Contact field and an Expires field. Add a Policy field linking to your disclosure policy, and optionally Encryption, Acknowledgments and Preferred-Languages. Set a calendar reminder to renew the Expires date. Test the contact address regularly. Once a report confirms an actively exploited vulnerability, the 24-hour Article 14 early warning clock is running, so route these reports to the person who can file it.",
        ],
      },
    ],
    faqs: [
      {
        q: "Is security.txt mandatory under the CRA?",
        a: "No. The CRA requires a public contact address and a disclosure policy. security.txt is a common, low-cost way to publish them.",
      },
      {
        q: "Do I have to run a bug bounty?",
        a: "No. The CRA requires a coordinated disclosure policy and a contact address. Paying rewards is your choice.",
      },
      {
        q: "Where can I report a vulnerability in someone else's component?",
        a: "Article 13(6) requires you to report vulnerabilities you find in integrated components, including open-source ones, to the person or entity that maintains them.",
      },
    ],
    craRefs: ["Art. 13(6)", "Art. 13(17)", "Annex I Part II(4)", "Annex I Part II(5)", "Annex I Part II(6)", "Annex II"],
    related: ["vulnerability-reporting", "sbom-requirements", "support-period", "cra-checklist"],
    sources: [
      CRA_TEXT,
      { label: "RFC 9116: A File Format to Aid in Security Vulnerability Disclosure", url: "https://www.rfc-editor.org/rfc/rfc9116" },
      { label: "ENISA: EU Vulnerability Database", url: "https://euvd.enisa.europa.eu" },
    ],
  },
  {
    slug: "cra-vs-nis2",
    title: "CRA vs NIS2: Differences for Product Manufacturers",
    metaDescription:
      "CRA vs NIS2 explained: the CRA regulates products placed on the EU market, NIS2 regulates organisations and their networks. When both apply to your firm.",
    keywords: [
      "CRA vs NIS2",
      "Cyber Resilience Act NIS2 difference",
      "NIS2 product manufacturers",
      "CRA NIS2 overlap",
      "NIS2 supply chain security",
      "NIS2 incident reporting",
    ],
    summary:
      "The CRA sets security rules for products with digital elements sold in the EU, while NIS2 sets security and reporting rules for organisations in critical sectors. A manufacturer can fall under both: the CRA for what it sells, NIS2 for how it runs its own systems.",
    sections: [
      {
        heading: "Different targets",
        body: [
          "The CRA is a regulation that applies directly in every member state. It sets essential requirements for products and obligations for manufacturers, importers and distributors. It uses the CE marking system and market surveillance. NIS2 (Directive (EU) 2022/2555) had to be transposed into national law by 17 October 2024. It applies to medium and large entities in listed sectors, plus some others regardless of size. It requires risk management measures and incident reporting for the entity's own network and information systems. Manufacturing of computers, electronics, electrical equipment and machinery is among the listed sectors.",
        ],
      },
      {
        heading: "Reporting side by side",
        body: [
          "Both laws use a 24-hour early warning and a 72-hour notification. Under the CRA, you report actively exploited vulnerabilities and severe incidents affecting your products through ENISA's Single Reporting Platform. Under NIS2, you report significant incidents affecting your services to your national CSIRT or competent authority. One event can trigger both. A breach of your update server could be a severe incident under the CRA and a significant incident under NIS2. Prepare one runbook that decides which reports to file and keeps the facts consistent.",
        ],
      },
      {
        heading: "How the two fit together",
        body: [
          "NIS2 entities must manage supply chain security, so your NIS2-covered customers will ask about your products' security. CRA conformity, an SBOM and a clear support period answer most of those questions. Fines differ too. NIS2 sets maximums of at least €10 million or 2% of turnover for essential entities and €7 million or 1.4% for important entities. The CRA goes up to €15 million or 2.5% for breaches of the essential requirements and Articles 13 and 14.",
        ],
      },
    ],
    faqs: [
      {
        q: "If I comply with NIS2, am I CRA compliant?",
        a: "No. NIS2 covers your organisation's systems. The CRA covers the products you place on the market and needs its own risk assessment, documentation and conformity assessment.",
      },
      {
        q: "Is a small manufacturer covered by NIS2?",
        a: "Usually not. NIS2 generally applies to medium and large entities in listed sectors, with some exceptions. The CRA applies to manufacturers of any size.",
      },
      {
        q: "Do I report the same incident twice?",
        a: "Possibly. If an event meets both the CRA and NIS2 thresholds, you file both reports, through different channels.",
      },
    ],
    craRefs: ["Art. 14", "Art. 64"],
    related: ["vulnerability-reporting", "cra-fines", "cra-vs-red", "cra-checklist"],
    sources: [
      CRA_TEXT,
      { label: "EUR-Lex: Directive (EU) 2022/2555 (NIS2)", url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj/eng" },
      ENISA_SRP,
    ],
  },
  {
    slug: "cra-vs-red",
    title: "CRA vs RED Delegated Act and EN 18031 Explained",
    metaDescription:
      "How the RED delegated act and EN 18031 relate to the CRA: RED cyber rules apply since 1 Aug 2025 and are repealed on 11 Dec 2027 when the CRA takes over.",
    keywords: [
      "CRA vs RED",
      "EN 18031",
      "RED delegated act cybersecurity",
      "Regulation 2022/30",
      "EN 18031-1",
      "radio equipment cybersecurity",
      "RED Article 3(3)(d)(e)(f)",
    ],
    summary:
      "Since 1 August 2025, internet-connected radio equipment must meet the cybersecurity requirements of Delegated Regulation (EU) 2022/30 under the Radio Equipment Directive, usually shown with EN 18031-1, -2 and -3. That act is repealed on 11 December 2027, when the CRA takes over cybersecurity for these products.",
    sections: [
      {
        heading: "What the RED delegated act requires",
        body: [
          "Delegated Regulation (EU) 2022/30 activates three essential requirements of the Radio Equipment Directive. Article 3(3)(d) covers harm to networks, 3(3)(e) covers personal data and privacy, and 3(3)(f) covers protection from fraud. It has applied since 1 August 2025. EN 18031-1 covers internet-connected radio equipment. EN 18031-2 covers equipment that processes personal data, plus toys, childcare equipment and wearables. EN 18031-3 covers equipment that handles virtual money or monetary value. Implementing Decision (EU) 2025/138 cites them with restrictions. Where a restriction applies, for example on password handling, you cannot rely on the standard alone and need a notified body.",
        ],
      },
      {
        heading: "The switch to the CRA",
        body: [
          "Delegated Regulation (EU) 2026/339, published on 29 April 2026, repeals Regulation 2022/30 with effect from 11 December 2027. The reason is that CRA Annex I already covers the elements of RED Article 3(3)(d), (e) and (f). Radio equipment placed on the market between 1 August 2025 and 10 December 2027 stays subject to the RED rules for market surveillance. Radio equipment placed on the market from 11 December 2027 must meet the CRA for cybersecurity and the RED for the rest, such as radio spectrum and safety.",
        ],
      },
      {
        heading: "Reusing your EN 18031 work",
        body: [
          "EN 18031 work is a good base for the CRA. Its asset analysis, access control, secure update and logging measures map to several Annex I Part I requirements. The CRA adds more: a full risk assessment, the Annex I Part II vulnerability handling process, an SBOM, a support period, and Article 14 reporting, which already applies. Do a gap analysis from your EN 18031 file to Annex I and Annex VII. Fill the gaps before 11 December 2027 so your declaration of conformity can reference the CRA from that date.",
        ],
      },
    ],
    faqs: [
      {
        q: "Does EN 18031 give presumption of conformity with the CRA?",
        a: "No. EN 18031 is cited under the RED only. No CRA harmonised standard is cited in the Official Journal yet.",
      },
      {
        q: "Do radio products need to report vulnerabilities under the CRA now?",
        a: "Yes. Article 14 reporting has applied since 11 September 2026 to all products with digital elements on the EU market, including radio equipment.",
      },
      {
        q: "What happens to radio products sold before December 2027?",
        a: "They stay covered by the RED cybersecurity rules. The repeal does not affect market surveillance of radio equipment placed on the market between 1 August 2025 and 10 December 2027.",
      },
    ],
    craRefs: ["Art. 14", "Art. 71", "Annex I", "Annex VII"],
    related: ["cra-deadlines", "ce-marking", "technical-documentation", "product-classes"],
    sources: [
      { label: "EUR-Lex: Delegated Regulation (EU) 2022/30", url: "https://eur-lex.europa.eu/eli/reg_del/2022/30/oj/eng" },
      { label: "EUR-Lex: Delegated Regulation (EU) 2026/339", url: "https://eur-lex.europa.eu/eli/reg_del/2026/339/oj/eng" },
      {
        label: "European Commission: Radio Equipment Directive",
        url: "https://single-market-economy.ec.europa.eu/sectors/electrical-and-electronic-engineering-industries-eei/radio-equipment-directive-red_en",
      },
      CRA_TEXT,
    ],
  },
  {
    slug: "cra-fines",
    title: "CRA Fines and Penalties: Up to €15M or 2.5% of Turnover",
    metaDescription:
      "CRA fines explained: up to €15M or 2.5% of worldwide turnover for core breaches, €10M or 2% for other duties, plus relief for micro and small enterprises.",
    keywords: [
      "CRA fines",
      "Cyber Resilience Act penalties",
      "CRA Article 64",
      "CRA 15 million fine",
      "CRA penalties SME",
      "CRA enforcement",
    ],
    summary:
      "Article 64 of the CRA sets maximum fines of €15 million or 2.5% of total worldwide annual turnover, whichever is higher, for breaching the essential requirements or the Article 13 and 14 obligations. Micro and small enterprises cannot be fined for missing the 24-hour early warning deadline.",
    sections: [
      {
        heading: "The three fine tiers",
        body: [
          "The highest tier, up to €15 million or 2.5% of worldwide annual turnover, applies to breaches of the Annex I essential requirements and the manufacturer obligations in Articles 13 and 14. The second tier, up to €10 million or 2%, covers most other obligations, including those of importers, distributors and authorised representatives, and the rules on declarations and CE marking. The third tier, up to €5 million or 1%, applies to supplying incorrect, incomplete or misleading information to notified bodies or market surveillance authorities. In each tier the higher of the fixed amount and the percentage is the maximum.",
        ],
      },
      {
        heading: "How fines are set and who sets them",
        body: [
          "Member states set the penalty rules and enforce them through their market surveillance authorities. Fines are maximums. Authorities must consider the nature, gravity and duration of the breach, whether other authorities already fined the same operator, and the operator's size and market share. Fines sit alongside other measures. An authority can order you to bring a product into conformity, restrict its sale, withdraw it or recall it. For many small firms, a recall or sales stop costs more than the fine.",
        ],
      },
      {
        heading: "Relief for small firms and open source",
        body: [
          "Article 64(10) says micro and small enterprises cannot be fined for missing the 24-hour early warning deadline for actively exploited vulnerabilities or severe incidents. The duty to send the early warning still applies, and the relief does not cover the 72-hour notification or the final report. Open-source software stewards cannot receive administrative fines for breaching the CRA. Article 33 also requires member states to support micro and small enterprises with awareness and training measures.",
        ],
      },
    ],
    faqs: [
      {
        q: "What is the maximum CRA fine?",
        a: "Up to €15 million or 2.5% of total worldwide annual turnover for the preceding year, whichever is higher, for breaches of the essential requirements or Articles 13 and 14.",
      },
      {
        q: "Can I be fined for reporting late?",
        a: "Yes, late reporting under Article 14 falls in the top tier. Micro and small enterprises are protected only for a missed 24-hour early warning.",
      },
      {
        q: "Who decides the fine?",
        a: "National authorities in the member state concerned, under national penalty rules. Amounts can differ between member states within the CRA maximums.",
      },
    ],
    craRefs: ["Art. 33", "Art. 64", "Art. 64(10)", "Art. 13", "Art. 14"],
    related: ["vulnerability-reporting", "cra-vs-nis2", "cra-checklist", "cra-funding"],
    sources: [CRA_TEXT, CRA_IMPLEMENTATION],
  },
  {
    slug: "cra-funding",
    title: "EU Funding for SME CRA Compliance: SECURE Open Call",
    metaDescription:
      "SECURE second open call: €11.5M for SME CRA compliance, up to €30,000 per project at 50% co-financing, deadline 29 January 2027. Who can apply and how.",
    keywords: [
      "CRA funding SME",
      "SECURE open call",
      "secure4sme",
      "Cyber Resilience Act grant",
      "EU cybersecurity funding SMEs",
      "Digital Europe Programme CRA",
    ],
    summary:
      "The SECURE project's second open call offers €11.5 million in total to help SMEs prepare for the CRA, with grants of up to €30,000 per project at 50% co-financing. The call opened on 1 October 2026 and its deadline has been extended to 29 January 2027.",
    sections: [
      {
        heading: "What the SECURE call offers",
        body: [
          "SECURE is an EU-funded project that passes money to SMEs for CRA preparation through open calls. The second call has a total budget of €11.5 million. Each project can receive up to €30,000, which covers 50% of eligible costs, so the company pays the other half. The call opened on 1 October 2026. The deadline was first 11 December 2026 and has been extended to 29 January 2027 on the official SECURE site. Applications go through the SECURE open call platform. The first call ran from 28 January to 29 March 2026.",
        ],
      },
      {
        heading: "Who can apply",
        body: [
          "The call targets micro, small and medium-sized enterprises that meet the EU SME definition and make, develop, import or distribute products with digital elements within the CRA's scope. Each company can submit one proposal and cannot combine the grant with other EU funding for the same work. Read the official call guide for the country eligibility rules and the list of eligible costs before you apply. Funded work must be concrete CRA preparation, such as a risk assessment, SBOM tooling, a vulnerability handling process or external expert support.",
        ],
      },
      {
        heading: "Writing a strong application",
        body: [
          "Tie each activity to a CRA article or annex. A plan to build an Article 14 reporting runbook, produce SBOMs under Annex I Part II and draft Annex VII documentation is easy for evaluators to follow. Give a realistic budget and show you can fund your 50% share. Other public support exists too. Your National Coordination Centre under Regulation (EU) 2021/887 and your nearest European Digital Innovation Hub can point you to national funding and services. Your national cybersecurity agency may also publish free CRA guidance.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much can one SME receive from SECURE?",
        a: "Up to €30,000 per project in the second open call, covering 50% of eligible costs.",
      },
      {
        q: "What is the SECURE deadline?",
        a: "The official SECURE site gives 29 January 2027 for the second open call, extended from 11 December 2026. Check the call page before you submit.",
      },
      {
        q: "Can I use the grant for a notified body assessment?",
        a: "Check the eligible cost list in the call guide. Funded work must support CRA compliance, and subcontracting specialist services is generally allowed.",
      },
    ],
    craRefs: ["Art. 33", "Art. 14", "Annex I", "Annex VII"],
    related: ["cra-checklist", "cra-deadlines", "cra-fines", "sbom-requirements"],
    sources: [
      { label: "SECURE: Second Open Call", url: "https://www.secure4sme.eu/cascade-funding/second-open-call" },
      { label: "SECURE: FAQ", url: "https://www.secure4sme.eu/faq" },
      {
        label: "CCB: SECURE 1st Open Call launch",
        url: "https://ccb.belgium.be/news/secure-1st-open-call-launching-28-january-offering-support-smes-preparing-cyber-resilience-act",
      },
    ],
  },
];
