import type { Country, Source } from "@/content/types";

const CRA_TEXT: Source = {
  label: "EUR-Lex: Regulation (EU) 2024/2847 (Cyber Resilience Act)",
  url: "https://eur-lex.europa.eu/eli/reg/2024/2847/oj/eng",
};

const ENISA_COORDINATORS: Source = {
  label: "ENISA: List of CSIRTs designated as coordinators",
  url: "https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp/list-of-csirts-designated-as-coordinators",
};

const ENISA_SRP: Source = {
  label: "ENISA: CRA Single Reporting Platform",
  url: "https://www.enisa.europa.eu/topics/product-security/single-reporting-platform-srp",
};

const SRP_ROUTE =
  "Since 11 September 2026, CRA reports of actively exploited vulnerabilities and severe incidents go through ENISA's Single Reporting Platform to the CSIRT designated as coordinator. ENISA published the list of coordinating CSIRTs on 4 September 2026.";

export const countries: Country[] = [
  {
    slug: "austria",
    name: "Austria",
    isoCode: "AT",
    inEU: true,
    languages: ["German"],
    localContext: [
      "Austria's NIS2 law, the NISG 2026, took effect on 1 October 2026 and set up a Federal Office for Cybersecurity under the Ministry of the Interior.",
      "CERT.at is Austria's national computer emergency response team.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      ENISA_COORDINATORS,
      { label: "CERT.at", url: "https://www.cert.at" },
    ],
  },
  {
    slug: "belgium",
    name: "Belgium",
    isoCode: "BE",
    inEU: true,
    languages: ["Dutch", "French", "German"],
    authority: {
      name: "Centre for Cybersecurity Belgium (CCB)",
      url: "https://ccb.belgium.be",
    },
    localContext: [
      "The CCB is Belgium's national cybersecurity authority and runs the national CSIRT, CERT.be.",
      "The CCB publishes the CyberFundamentals framework, a staged set of security controls that Belgian firms use to show their maturity level.",
      "Belgian law gives good-faith researchers a legal framework to report vulnerabilities through the CCB.",
    ],
    sources: [
      CRA_TEXT,
      { label: "Centre for Cybersecurity Belgium", url: "https://ccb.belgium.be" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "bulgaria",
    name: "Bulgaria",
    isoCode: "BG",
    inEU: true,
    languages: ["Bulgarian"],
    localContext: [
      "Bulgaria's amended Cybersecurity Act, which transposes NIS2, entered into force on 13 February 2026.",
      "The Ministry of Electronic Governance is the national competent authority and single point of contact for cybersecurity.",
      SRP_ROUTE,
    ],
    sources: [CRA_TEXT, ENISA_COORDINATORS, ENISA_SRP],
  },
  {
    slug: "croatia",
    name: "Croatia",
    isoCode: "HR",
    inEU: true,
    languages: ["Croatian"],
    authority: {
      name: "Security and Intelligence Agency (SOA), National Cybersecurity Centre",
      url: "https://www.soa.hr/en/",
    },
    localContext: [
      "Croatia's Cybersecurity Act took effect on 15 February 2024 and made the Security and Intelligence Agency the central national cybersecurity authority.",
      "CERT.hr, run within CARNET, also acts as a national CSIRT.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      {
        label: "SOA: SOA became the national cybersecurity authority",
        url: "https://soa.hr/en/soa-became-the-national-cybersecurity-authority/158",
      },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "cyprus",
    name: "Cyprus",
    isoCode: "CY",
    inEU: true,
    languages: ["Greek", "Turkish"],
    authority: {
      name: "Digital Security Authority (DSA)",
      url: "https://dsa.cy",
    },
    localContext: [
      "The Digital Security Authority incorporates the national CSIRT, CSIRT-CY.",
      "The DSA also acts as the National Cybersecurity Certification Authority and has run CRA information events with the Cyprus Organisation for Standardisation.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "Digital Security Authority", url: "https://dsa.cy" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "czechia",
    name: "Czechia",
    isoCode: "CZ",
    inEU: true,
    languages: ["Czech"],
    authority: {
      name: "National Cyber and Information Security Agency (NÚKIB)",
      url: "https://nukib.gov.cz",
    },
    localContext: [
      "NÚKIB is the central state body for cybersecurity and runs the government CERT.",
      "The national CSIRT for the private sector is CSIRT.CZ.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "NÚKIB", url: "https://nukib.gov.cz" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "denmark",
    name: "Denmark",
    isoCode: "DK",
    inEU: true,
    languages: ["Danish"],
    authority: {
      name: "Styrelsen for Samfundssikkerhed (Agency for Societal Security)",
      url: "https://samsik.dk",
    },
    localContext: [
      "The Agency for Societal Security was set up on 29 January 2025 under the Ministry for Societal Security and Preparedness.",
      "It took over large parts of the former Centre for Cyber Security and now publishes Denmark's national cyber threat assessment.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "Styrelsen for Samfundssikkerhed", url: "https://samsik.dk" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "estonia",
    name: "Estonia",
    isoCode: "EE",
    inEU: true,
    languages: ["Estonian"],
    authority: {
      name: "Estonian Information System Authority (RIA)",
      url: "https://www.ria.ee",
    },
    localContext: [
      "RIA is Estonia's national cybersecurity authority and runs the national CSIRT, CERT-EE.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "Estonian Information System Authority", url: "https://www.ria.ee" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "finland",
    name: "Finland",
    isoCode: "FI",
    inEU: true,
    languages: ["Finnish", "Swedish"],
    authority: {
      name: "Traficom National Cyber Security Centre (NCSC-FI)",
      url: "https://www.kyberturvallisuuskeskus.fi",
    },
    localContext: [
      "The National Cyber Security Centre Finland sits within Traficom, the Finnish Transport and Communications Agency.",
      "Traficom runs a voluntary Cybersecurity label for consumer smart devices and services, launched in 2019.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "NCSC-FI", url: "https://www.kyberturvallisuuskeskus.fi" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "france",
    name: "France",
    isoCode: "FR",
    inEU: true,
    languages: ["French"],
    authority: {
      name: "Agence nationale de la sécurité des systèmes d'information (ANSSI)",
      url: "https://cyber.gouv.fr",
    },
    localContext: [
      "ANSSI is France's national cybersecurity authority, and CERT-FR is its incident response team.",
      "ANSSI runs the CSPN first-level security certification, a short evaluation that some French buyers ask for when procuring security products.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "ANSSI", url: "https://cyber.gouv.fr" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "germany",
    name: "Germany",
    isoCode: "DE",
    inEU: true,
    languages: ["German"],
    authority: {
      name: "Federal Office for Information Security (BSI)",
      url: "https://www.bsi.bund.de",
    },
    localContext: [
      "The BSI hosts both CERT-Bund, the coordinating CSIRT for CRA reports, and a CRA market surveillance unit.",
      "The BSI runs a voluntary IT security label (IT-Sicherheitskennzeichen) for consumer devices and services.",
      "The BSI also publishes Technical Guideline TR-03183 on cyber resilience requirements for manufacturers, including SBOM rules.",
    ],
    sources: [
      CRA_TEXT,
      {
        label: "BSI: CRA Single Reporting Platform",
        url: "https://www.bsi.bund.de/EN/Themen/Unternehmen-und-Organisationen/Informationen-und-Empfehlungen/Cyber_Resilience_Act/Single_Reporting_Platform-CRA/single_reporting_platform-cra_node.html",
      },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "greece",
    name: "Greece",
    isoCode: "GR",
    inEU: true,
    languages: ["Greek"],
    localContext: [
      "Greece transposed NIS2 through Law 5160/2024, published on 27 November 2024.",
      "A National Cybersecurity Authority supervises NIS2 obligations, and in-scope entities register with it through the gov.gr portal.",
      SRP_ROUTE,
    ],
    sources: [CRA_TEXT, ENISA_COORDINATORS, ENISA_SRP],
  },
  {
    slug: "hungary",
    name: "Hungary",
    isoCode: "HU",
    inEU: true,
    languages: ["Hungarian"],
    localContext: [
      "Hungary adopted Act CXXXV of 2025 to implement the CRA.",
      "It names the Supervisory Authority for Regulated Activities (SZTFH) as both the notifying authority and the market surveillance authority for the CRA.",
      SRP_ROUTE,
    ],
    sources: [CRA_TEXT, ENISA_COORDINATORS, ENISA_SRP],
  },
  {
    slug: "ireland",
    name: "Ireland",
    isoCode: "IE",
    inEU: true,
    languages: ["Irish", "English"],
    authority: {
      name: "National Cyber Security Centre (NCSC)",
      url: "https://www.ncsc.gov.ie",
    },
    localContext: [
      "The NCSC is Ireland's national cybersecurity authority and runs the national CSIRT.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "NCSC Ireland", url: "https://www.ncsc.gov.ie" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "italy",
    name: "Italy",
    isoCode: "IT",
    inEU: true,
    languages: ["Italian"],
    authority: {
      name: "Agenzia per la Cybersicurezza Nazionale (ACN)",
      url: "https://www.acn.gov.it",
    },
    localContext: [
      "ACN is Italy's national cybersecurity agency and hosts the national CSIRT, CSIRT Italia.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "Agenzia per la Cybersicurezza Nazionale", url: "https://www.acn.gov.it" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "latvia",
    name: "Latvia",
    isoCode: "LV",
    inEU: true,
    languages: ["Latvian"],
    authority: {
      name: "CERT.LV, part of the National Cyber Security Centre",
      url: "https://cert.lv",
    },
    localContext: [
      "Latvia's National Cyber Security Law entered into force on 1 September 2024.",
      "From that date CERT.LV became part of the National Cyber Security Centre, which works under the Ministry of Defence.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "Latvian Ministry of Defence: Cybersecurity", url: "https://www.mod.gov.lv/en/cybersecurity" },
      { label: "CERT.LV", url: "https://cert.lv" },
    ],
  },
  {
    slug: "lithuania",
    name: "Lithuania",
    isoCode: "LT",
    inEU: true,
    languages: ["Lithuanian"],
    authority: {
      name: "National Cyber Security Centre (NKSC)",
      url: "https://www.nksc.lt",
    },
    localContext: [
      "The NKSC works under the Ministry of National Defence and acts as Lithuania's national CSIRT.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "National Cyber Security Centre of Lithuania", url: "https://www.nksc.lt" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "luxembourg",
    name: "Luxembourg",
    isoCode: "LU",
    inEU: true,
    languages: ["Luxembourgish", "French", "German"],
    authority: {
      name: "Institut Luxembourgeois de Régulation (ILR), NIS 2 competent authority",
      url: "https://www.ilr.lu",
    },
    localContext: [
      "Luxembourg transposed NIS2 through the Act of 5 May 2026, which applies from 10 May 2026.",
      "The ILR is the default NIS 2 authority, and GOVCERT.LU and CIRCL are the designated CSIRTs.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "ILR: NIS 2", url: "https://www.ilr.lu/en/sectors/niss/nis-2/" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "malta",
    name: "Malta",
    isoCode: "MT",
    inEU: true,
    languages: ["Maltese", "English"],
    localContext: [
      "The Malta Information Technology Agency (MITA) is Malta's National Cybersecurity Coordination Centre under Regulation (EU) 2021/887.",
      "The coordination centre is the national contact point for EU cybersecurity funding and community building.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      {
        label: "MITA: National Cyber Security Coordination Centre",
        url: "https://mita.gov.mt/portfolio/national-cyber-security-coordination-centre/",
      },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "netherlands",
    name: "Netherlands",
    isoCode: "NL",
    inEU: true,
    languages: ["Dutch"],
    authority: {
      name: "National Cyber Security Centre (NCSC-NL)",
      url: "https://www.ncsc.nl",
    },
    localContext: [
      "The Dutch CRA implementing bill names the Digital Infrastructure Inspectorate (RDI) as market surveillance authority and notifying authority.",
      "The same bill names the NCSC as the CSIRT for CRA reports.",
      "The government estimates RDI will supervise between 26,000 and 52,000 manufacturers.",
    ],
    sources: [
      CRA_TEXT,
      {
        label: "Rijksoverheid: consultation on the CRA implementing act",
        url: "https://www.rijksoverheid.nl/actueel/nieuws/2025/03/10/internetconsultatie-uitvoeringswet-verordening-cyberweerbaarheid-van-start",
      },
      { label: "NCSC-NL", url: "https://www.ncsc.nl" },
    ],
  },
  {
    slug: "poland",
    name: "Poland",
    isoCode: "PL",
    inEU: true,
    languages: ["Polish"],
    authority: {
      name: "CERT Polska (CSIRT NASK)",
      url: "https://cert.pl",
    },
    localContext: [
      "CSIRT NASK is one of Poland's three national CSIRTs, alongside CSIRT GOV and CSIRT MON.",
      "Poland's NIS2 amendment to the National Cybersecurity System Act entered into force on 3 April 2026.",
      "NASK has published CRA guidance for manufacturers in Polish.",
    ],
    sources: [CRA_TEXT, { label: "CERT Polska", url: "https://cert.pl" }, ENISA_COORDINATORS],
  },
  {
    slug: "portugal",
    name: "Portugal",
    isoCode: "PT",
    inEU: true,
    languages: ["Portuguese"],
    authority: {
      name: "Centro Nacional de Cibersegurança (CNCS)",
      url: "https://www.cncs.gov.pt",
    },
    localContext: [
      "The CNCS is Portugal's national cybersecurity authority and runs the national CSIRT, CERT.PT.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "Centro Nacional de Cibersegurança", url: "https://www.cncs.gov.pt" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "romania",
    name: "Romania",
    isoCode: "RO",
    inEU: true,
    languages: ["Romanian"],
    authority: {
      name: "Directoratul Național de Securitate Cibernetică (DNSC)",
      url: "https://www.dnsc.ro",
    },
    localContext: [
      "The DNSC is Romania's national cybersecurity authority and replaced the former CERT-RO.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "DNSC", url: "https://www.dnsc.ro" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "slovakia",
    name: "Slovakia",
    isoCode: "SK",
    inEU: true,
    languages: ["Slovak"],
    authority: {
      name: "National Security Authority (NBÚ)",
      url: "https://www.nbu.gov.sk",
    },
    localContext: [
      "The NBÚ is Slovakia's national cybersecurity authority and runs the national CSIRT, SK-CERT.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "National Security Authority", url: "https://www.nbu.gov.sk" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "slovenia",
    name: "Slovenia",
    isoCode: "SI",
    inEU: true,
    languages: ["Slovenian"],
    authority: {
      name: "Government Information Security Office (URSIV)",
      url: "https://www.gov.si/en/state-authorities/government-offices/government-information-security-office/",
    },
    localContext: [
      "URSIV is Slovenia's competent national cybersecurity authority.",
      "The national CSIRT, SI-CERT, is run by ARNES and funded by URSIV.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      {
        label: "Government Information Security Office",
        url: "https://www.gov.si/en/state-authorities/government-offices/government-information-security-office/",
      },
      { label: "SI-CERT", url: "https://www.cert.si/en" },
    ],
  },
  {
    slug: "spain",
    name: "Spain",
    isoCode: "ES",
    inEU: true,
    languages: ["Spanish"],
    authority: {
      name: "Instituto Nacional de Ciberseguridad (INCIBE)",
      url: "https://www.incibe.es",
    },
    localContext: [
      "INCIBE serves citizens and businesses, and INCIBE-CERT is its incident response team.",
      "The Centro Criptológico Nacional and CCN-CERT cover the public sector.",
      SRP_ROUTE,
    ],
    sources: [
      CRA_TEXT,
      { label: "INCIBE", url: "https://www.incibe.es" },
      ENISA_COORDINATORS,
    ],
  },
  {
    slug: "sweden",
    name: "Sweden",
    isoCode: "SE",
    inEU: true,
    languages: ["Swedish"],
    localContext: [
      "A Swedish government inquiry has proposed the Post and Telecom Authority (PTS) as the main CRA market surveillance authority.",
      "The same inquiry proposes Swedac as the notifying authority for CRA conformity assessment bodies.",
      SRP_ROUTE,
    ],
    sources: [CRA_TEXT, ENISA_COORDINATORS, ENISA_SRP],
  },
  {
    slug: "united-kingdom",
    name: "United Kingdom",
    isoCode: "GB",
    inEU: false,
    languages: ["English"],
    authority: {
      name: "National Cyber Security Centre (NCSC)",
      url: "https://www.ncsc.gov.uk",
    },
    localContext: [
      "The UK product security regime under the PSTI Act 2022 has applied to consumer connectable products since 29 April 2024.",
      "It bans universal default passwords, requires a published way to report vulnerabilities, and requires makers to state the minimum security update period.",
      "The Office for Product Safety and Standards enforces the regime.",
    ],
    exporterNotes: exporterNotes(
      "The PSTI regime is a separate UK law, and meeting it does not show conformity with the CRA, which has wider scope and its own reporting duties.",
    ),
    sources: [
      CRA_TEXT,
      {
        label: "GOV.UK: Regulations for consumer connectable product security",
        url: "https://www.gov.uk/guidance/regulations-consumer-connectable-product-security",
      },
      {
        label: "Product Security and Telecommunications Infrastructure Act 2022",
        url: "https://www.legislation.gov.uk/ukpga/2022/46",
      },
    ],
  },
  {
    slug: "united-states",
    name: "United States",
    isoCode: "US",
    inEU: false,
    languages: ["English"],
    authority: {
      name: "Cybersecurity and Infrastructure Security Agency (CISA)",
      url: "https://www.cisa.gov",
    },
    localContext: [
      "CISA is the federal agency for civilian cybersecurity and publishes Secure by Design guidance for software makers.",
      "The FCC's U.S. Cyber Trust Mark is a voluntary label for wireless consumer IoT products and was still being set up in late 2026.",
    ],
    exporterNotes: exporterNotes(
      "A U.S. Cyber Trust Mark is voluntary and separate from the CRA, so it does not replace CRA conformity for EU sales.",
    ),
    sources: [CRA_TEXT, { label: "CISA", url: "https://www.cisa.gov" }, ENISA_SRP],
  },
  {
    slug: "canada",
    name: "Canada",
    isoCode: "CA",
    inEU: false,
    languages: ["English", "French"],
    authority: {
      name: "Canadian Centre for Cyber Security",
      url: "https://www.cyber.gc.ca",
    },
    localContext: [
      "The Canadian Centre for Cyber Security is part of the Communications Security Establishment and was set up in 2018.",
      "It is the federal government's single source of expert cybersecurity advice for Canadians.",
    ],
    exporterNotes: exporterNotes(),
    sources: [
      CRA_TEXT,
      { label: "Canadian Centre for Cyber Security", url: "https://www.cyber.gc.ca/en/about-cyber-centre" },
      ENISA_SRP,
    ],
  },
  {
    slug: "china",
    name: "China",
    isoCode: "CN",
    inEU: false,
    languages: ["Mandarin Chinese"],
    authority: {
      name: "Cyberspace Administration of China (CAC)",
      url: "https://www.cac.gov.cn",
    },
    localContext: [
      "China's Cybersecurity Law has applied since 1 June 2017.",
      "The Data Security Law has applied since 1 September 2021 and the Personal Information Protection Law since 1 November 2021.",
    ],
    exporterNotes: exporterNotes(
      "Compliance with Chinese cybersecurity law does not count toward CRA conformity for products sold in the EU.",
    ),
    sources: [CRA_TEXT, { label: "Cyberspace Administration of China", url: "https://www.cac.gov.cn" }, ENISA_SRP],
  },
  {
    slug: "taiwan",
    name: "Taiwan",
    isoCode: "TW",
    inEU: false,
    languages: ["Mandarin Chinese"],
    authority: {
      name: "Administration for Cyber Security, Ministry of Digital Affairs",
      url: "https://moda.gov.tw/en/digital-affairs/cyber-security/1677",
    },
    localContext: [
      "The Administration for Cyber Security sits under the Ministry of Digital Affairs.",
      "Taiwan's Cyber Security Management Act was announced on 6 June 2019.",
    ],
    exporterNotes: exporterNotes(),
    sources: [
      CRA_TEXT,
      {
        label: "Ministry of Digital Affairs: Administration for Cyber Security",
        url: "https://moda.gov.tw/en/digital-affairs/cyber-security/1677",
      },
      ENISA_SRP,
    ],
  },
  {
    slug: "japan",
    name: "Japan",
    isoCode: "JP",
    inEU: false,
    languages: ["Japanese"],
    localContext: [
      "Japan opened a National Cybersecurity Office in the Cabinet Secretariat on 1 July 2025, replacing NISC.",
      "METI and IPA launched the JC-STAR IoT security label on 25 March 2025. Its basic STAR-1 level works by self-declaration against a checklist.",
    ],
    exporterNotes: exporterNotes(
      "A JC-STAR label is a separate Japanese scheme and does not show CRA conformity.",
    ),
    sources: [
      CRA_TEXT,
      { label: "IPA: Japan Cyber STAR (JC-STAR)", url: "https://www.ipa.go.jp/en/security/jc-star/index.html" },
      {
        label: "Prime Minister's Office of Japan: Opening of the National Cybersecurity Office",
        url: "https://japan.kantei.go.jp/103/actions/202507/01hossokushiki.html",
      },
    ],
  },
  {
    slug: "south-korea",
    name: "South Korea",
    isoCode: "KR",
    inEU: false,
    languages: ["Korean"],
    authority: {
      name: "Korea Internet & Security Agency (KISA)",
      url: "https://www.kisa.or.kr",
    },
    localContext: [
      "KISA runs a voluntary IoT security certification for connected products.",
      "Korea and Singapore mutually recognise KISA's IoT certification and Singapore's Cybersecurity Labelling Scheme at matching levels.",
    ],
    exporterNotes: exporterNotes(
      "KISA's IoT certification is separate from the CRA and does not replace CRA conformity assessment.",
    ),
    sources: [
      CRA_TEXT,
      { label: "KISA", url: "https://www.kisa.or.kr" },
      { label: "CSA Singapore: Cybersecurity Labelling Scheme", url: "https://www.csa.gov.sg/cls" },
    ],
  },
  {
    slug: "india",
    name: "India",
    isoCode: "IN",
    inEU: false,
    languages: ["Hindi", "English"],
    authority: {
      name: "Indian Computer Emergency Response Team (CERT-In)",
      url: "https://www.cert-in.org.in",
    },
    localContext: [
      "CERT-In is India's national agency for cyber incident response.",
      "CERT-In directions from April 2022 require covered organisations to report specified cyber incidents within 6 hours.",
    ],
    exporterNotes: exporterNotes(
      "CERT-In reporting and CRA reporting run in parallel, so a vulnerability can trigger reports to both.",
    ),
    sources: [CRA_TEXT, { label: "CERT-In", url: "https://www.cert-in.org.in" }, ENISA_SRP],
  },
  {
    slug: "israel",
    name: "Israel",
    isoCode: "IL",
    inEU: false,
    languages: ["Hebrew"],
    authority: {
      name: "Israel National Cyber Directorate (INCD)",
      url: "https://www.gov.il/en/departments/israel_national_cyber_directorate",
    },
    localContext: [
      "The INCD is the national security and technology agency responsible for defending Israel's cyberspace.",
      "It runs Israel's national CERT.",
    ],
    exporterNotes: exporterNotes(),
    sources: [
      CRA_TEXT,
      {
        label: "Israel National Cyber Directorate",
        url: "https://www.gov.il/en/departments/israel_national_cyber_directorate",
      },
      ENISA_SRP,
    ],
  },
  {
    slug: "switzerland",
    name: "Switzerland",
    isoCode: "CH",
    inEU: false,
    languages: ["German", "French", "Italian", "Romansh"],
    authority: {
      name: "Federal Office for Cyber Security (NCSC)",
      url: "https://www.ncsc.admin.ch",
    },
    localContext: [
      "Switzerland is in neither the EU nor the EEA, so the CRA does not apply on the Swiss market.",
      "Since 1 April 2025, critical infrastructure operators must report cyberattacks to the Federal Office for Cyber Security within 24 hours. Fines of up to CHF 100,000 apply from 1 October 2025.",
      "The Federal Council plans a Swiss law on the cyber resilience of digital products that aims to avoid extra burdens for firms that already meet the CRA.",
    ],
    exporterNotes: exporterNotes(
      "Swiss makers selling into the EU must meet the CRA in full now, whatever the timing of the planned Swiss law.",
    ),
    sources: [
      CRA_TEXT,
      {
        label: "Federal Office for Cyber Security: reporting obligation from 1 April 2025",
        url: "https://www.bacs.admin.ch/en/25-mp-en",
      },
      {
        label: "Swiss Confederation: Federal Council to strengthen cyber resilience of digital products",
        url: "https://www.aboutswitzerland.eda.admin.ch/en/newnsb/QHVUxTqE5DMteBjfCqLlM",
      },
    ],
  },
  {
    slug: "norway",
    name: "Norway",
    isoCode: "NO",
    inEU: false,
    languages: ["Norwegian", "Sami"],
    authority: {
      name: "Norwegian National Security Authority (NSM)",
      url: "https://nsm.no",
    },
    localContext: [
      "Norway is in the EEA, not the EU. EU product laws apply in Norway once they are taken into the EEA Agreement.",
      "The EFTA database lists the CRA as EEA-relevant and under scrutiny for incorporation, with no Joint Committee decision in force yet.",
      "NSM is Norway's national security authority and hosts the national cyber security centre, NCSC.",
    ],
    exporterNotes: exporterNotes(
      "Until the CRA is incorporated into the EEA Agreement, treat Norwegian makers selling into the EU as non-EU manufacturers under the CRA.",
    ),
    sources: [
      CRA_TEXT,
      { label: "EFTA EEA-Lex: 32024R2847 factsheet", url: "https://www.efta.int/eea-lex/32024r2847" },
      { label: "Norwegian National Security Authority", url: "https://nsm.no" },
    ],
  },
  {
    slug: "turkey",
    name: "Turkey",
    isoCode: "TR",
    inEU: false,
    languages: ["Turkish"],
    authority: {
      name: "Cybersecurity Presidency (Siber Güvenlik Başkanlığı)",
      url: "https://siberguvenlik.gov.tr",
    },
    localContext: [
      "Presidential Decree No. 177, published on 8 January 2025, set up the Cybersecurity Presidency.",
      "Cybersecurity Law No. 7545 took effect on 19 March 2025 and gave the Presidency its main powers.",
    ],
    exporterNotes: exporterNotes(),
    sources: [
      CRA_TEXT,
      { label: "Cybersecurity Presidency", url: "https://siberguvenlik.gov.tr" },
      ENISA_SRP,
    ],
  },
];

function exporterNotes(marketNote?: string): string[] {
  const notes = [
    "The CRA applies when a product with digital elements is placed on the EU market, wherever the manufacturer is based.",
    "Without an EU establishment, reports go to the coordinating CSIRT in the member state of your authorised representative, else your importer, else your distributor, else the member state with the most users (Art. 14(7)).",
    "Importers have their own checks under Art. 19, and appointing an authorised representative by written mandate is optional (Art. 18).",
  ];
  return marketNote ? [...notes, marketNote] : notes;
}
