const hashRouting = process.env.NEXT_PUBLIC_ROUTING === "hash";

export const paths = hashRouting
  ? {
      home: "#top",
      assessment: "#assessment",
      releaseGate: "#release-gate",
      plan: "#plan",
      brief: "#brief",
      pricing: "#pricing",
      guides: "#brief",
      tools: "#tools",
      sbomCheck: "#sbom-check",
      incidentClock: "#incident-clock",
      verify: "#tools",
      security: "#security",
      terms: "#terms",
      privacy: "#privacy",
      login: "#pricing",
    }
  : {
      home: "/",
      assessment: "/assessment/",
      releaseGate: "/release-gate/",
      plan: "/plan/",
      brief: "/cra/",
      pricing: "/pricing/",
      guides: "/guides/",
      tools: "/tools/",
      sbomCheck: "/tools/sbom-check/",
      incidentClock: "/tools/incident-clock/",
      verify: "/verify-signature/",
      security: "/security/",
      terms: "/terms/",
      privacy: "/privacy/",
      login: "/login/",
    };

export type View = "home" | "assessment" | "release-gate" | "plan" | "brief" | "pricing" | "tools" | "sbom-check" | "incident-clock" | "security" | "terms" | "privacy";
